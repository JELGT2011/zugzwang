import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { PUZZLE_HINT_SYSTEM_PROMPT } from "@/agents/puzzleHintPrompt";

export const maxDuration = 60;

const ArrowSchema = z.object({
    from: z.string().describe('Starting square in algebraic notation, e.g. "e2"'),
    to: z.string().describe('Ending square in algebraic notation, e.g. "e4"'),
    color: z.enum(["red", "green", "blue"]).describe(
        'red = threats/attacks; green = suggested moves/ideas (but never the solution); blue = defensive or positional ideas'
    ),
});

const HintResponseSchema = z.object({
    spokenText: z
        .string()
        .describe(
            "1-2 short sentences spoken aloud as a hint. Never reveal the exact solution move. 10-30 words."
        ),
    arrows: z
        .array(ArrowSchema)
        .describe(
            "Visual annotations to draw on the board. Must NOT include the solution's from→to as an arrow."
        ),
});

const TacticalContextSchema = z.object({
    undefendedPieces: z.array(
        z.object({
            piece: z.string(),
            square: z.string(),
            color: z.string(),
            attackedBy: z.array(z.string()),
        })
    ),
    pins: z.array(
        z.object({
            pinnedPiece: z.string(),
            pinnedSquare: z.string(),
            pinnedBy: z.string(),
            protects: z.string(),
        })
    ),
    captures: z.array(
        z.object({
            attacker: z.string(),
            attackerSquare: z.string(),
            target: z.string(),
            targetSquare: z.string(),
        })
    ),
    checks: z.array(
        z.object({
            piece: z.string(),
            fromSquare: z.string(),
            toSquare: z.string(),
        })
    ),
    forkTargets: z.array(
        z.object({
            attacker: z.string(),
            attackerFromSquare: z.string(),
            attackerToSquare: z.string(),
            targetPieces: z.array(z.string()),
        })
    ),
    materialBalance: z.number(),
    notes: z.array(z.string()),
});

const SolutionAnalysisSchema = z.object({
    movingPiece: z.string(),
    movingFromSquare: z.string(),
    movingToSquare: z.string(),
    kind: z.enum([
        "checkmate",
        "check",
        "capture",
        "promotion",
        "quiet",
        "sacrifice",
    ]),
    isCheck: z.boolean(),
    isCheckmate: z.boolean(),
    capturedPiece: z.string().nullable(),
    capturedSquare: z.string().nullable(),
    promotedTo: z.string().nullable(),
    materialDelta: z.number(),
    newThreats: z.array(
        z.object({
            attacker: z.string(),
            attackerSquare: z.string(),
            target: z.string(),
            targetSquare: z.string(),
        })
    ),
    rationale: z.string(),
});

const PieceSchema = z.object({
    piece: z.string(),
    square: z.string(),
    color: z.enum(["white", "black"]),
});

const EngineLineSchema = z.object({
    move: z.string(),
    san: z.string(),
    evaluation: z.number().nullable(),
    mate: z.number().nullable(),
    pv: z.array(z.string()),
});

const StepEngineAnalysisSchema = z.object({
    stepIndex: z.number().int(),
    fen: z.string(),
    sideToMove: z.enum(["white", "black"]),
    isCurrent: z.boolean(),
    solutionMove: z.string(),
    lines: z.array(EngineLineSchema),
});

const RequestSchema = z.object({
    fen: z.string(),
    pieces: z.array(PieceSchema),
    themes: z.array(z.string()),
    hintsUsed: z.number().int().nonnegative(),
    moveNumber: z.number().int().nonnegative(),
    totalMoves: z.number().int().nonnegative(),
    playerColor: z.string(),
    tacticalContext: TacticalContextSchema,
    solutionMove: z.string(),
    solutionMoveReadable: z.string(),
    solutionAnalysis: SolutionAnalysisSchema.nullable().optional(),
    engineSteps: z.array(StepEngineAnalysisSchema).optional(),
});

type HintRequest = z.infer<typeof RequestSchema>;

function formatTacticalContext(ctx: HintRequest["tacticalContext"]): string {
    const sections: string[] = [];

    if (ctx.undefendedPieces.length > 0) {
        sections.push(
            "UNDEFENDED PIECES:\n" +
                ctx.undefendedPieces
                    .map(
                        (p) =>
                            `- ${p.color} ${p.piece} on ${p.square} (attacked by: ${p.attackedBy.join(", ") || "none"})`
                    )
                    .join("\n")
        );
    }

    if (ctx.pins.length > 0) {
        sections.push(
            "PINS:\n" +
                ctx.pins
                    .map(
                        (p) =>
                            `- ${p.pinnedPiece} on ${p.pinnedSquare} is pinned by ${p.pinnedBy} (protects ${p.protects})`
                    )
                    .join("\n")
        );
    }

    if (ctx.captures.length > 0) {
        sections.push(
            "POSSIBLE CAPTURES:\n" +
                ctx.captures
                    .map(
                        (c) =>
                            `- ${c.attacker} on ${c.attackerSquare} can capture ${c.target} on ${c.targetSquare}`
                    )
                    .join("\n")
        );
    }

    if (ctx.checks.length > 0) {
        sections.push(
            "AVAILABLE CHECKS:\n" +
                ctx.checks
                    .map((c) => `- ${c.piece} from ${c.fromSquare} to ${c.toSquare}`)
                    .join("\n")
        );
    }

    if (ctx.forkTargets.length > 0) {
        sections.push(
            "FORK OPPORTUNITIES:\n" +
                ctx.forkTargets
                    .map(
                        (f) =>
                            `- ${f.attacker} from ${f.attackerFromSquare} to ${f.attackerToSquare} attacks: ${f.targetPieces.join(", ")}`
                    )
                    .join("\n")
        );
    }

    sections.push(
        `MATERIAL: ${ctx.materialBalance > 0 ? "White" : ctx.materialBalance < 0 ? "Black" : "Equal"}${
            ctx.materialBalance !== 0
                ? ` (${ctx.materialBalance > 0 ? "+" : ""}${ctx.materialBalance})`
                : ""
        }`
    );

    if (ctx.notes.length > 0) {
        sections.push("NOTES:\n" + ctx.notes.map((n) => `- ${n}`).join("\n"));
    }

    return sections.join("\n\n") || "No significant tactical features detected.";
}

function formatSolutionAnalysis(
    analysis: NonNullable<HintRequest["solutionAnalysis"]>
): string {
    const lines: string[] = [];
    lines.push(
        `MOVE: ${analysis.movingPiece} from ${analysis.movingFromSquare} to ${analysis.movingToSquare}`
    );
    lines.push(`KIND: ${analysis.kind}`);

    const flags: string[] = [];
    if (analysis.isCheckmate) flags.push("checkmate");
    else if (analysis.isCheck) flags.push("check");
    if (analysis.capturedPiece && analysis.capturedSquare) {
        flags.push(`captures ${analysis.capturedPiece} on ${analysis.capturedSquare}`);
    }
    if (analysis.promotedTo) {
        flags.push(`promotes to ${analysis.promotedTo}`);
    }
    if (flags.length > 0) {
        lines.push(`EFFECTS: ${flags.join("; ")}`);
    } else {
        lines.push(`EFFECTS: none (quiet move)`);
    }

    if (analysis.materialDelta !== 0) {
        lines.push(
            `MATERIAL DELTA FOR MOVER: ${analysis.materialDelta > 0 ? "+" : ""}${analysis.materialDelta}`
        );
    } else {
        lines.push(`MATERIAL DELTA FOR MOVER: 0`);
    }

    if (analysis.newThreats.length > 0) {
        lines.push(
            "NEW THREATS CREATED BY THIS MOVE:\n" +
                analysis.newThreats
                    .map(
                        (t) =>
                            `- ${t.attacker} on ${t.attackerSquare} now threatens ${t.target} on ${t.targetSquare}`
                    )
                    .join("\n")
        );
    } else {
        lines.push(`NEW THREATS CREATED BY THIS MOVE: none`);
    }

    lines.push(``);
    lines.push(`RATIONALE: ${analysis.rationale}`);
    return lines.join("\n");
}

const PIECE_ORDER = ["king", "queen", "rook", "bishop", "knight", "pawn"];

function formatEval(line: { evaluation: number | null; mate: number | null }): string {
    if (line.mate !== null) {
        const n = Math.abs(line.mate);
        return line.mate > 0 ? `mate in ${n}` : `mated in ${n}`;
    }
    if (line.evaluation !== null) {
        const pawns = line.evaluation / 100;
        const sign = pawns > 0 ? "+" : pawns < 0 ? "" : "";
        return `${sign}${pawns.toFixed(2)}`;
    }
    return "?";
}

function formatEngineLines(steps: NonNullable<HintRequest["engineSteps"]>): string {
    if (steps.length === 0) return "No engine analysis available.";

    const blocks: string[] = [];
    for (const step of steps) {
        const header = step.isCurrent
            ? `CURRENT POSITION (${step.sideToMove} to move):`
            : `FUTURE STEP — your move ${Math.ceil(step.stepIndex / 2)} (${step.sideToMove} to move, FEN: ${step.fen}):`;

        if (step.lines.length === 0) {
            blocks.push(`${header}\n  (no engine lines computed)`);
            continue;
        }

        const solUci = step.solutionMove.toLowerCase();
        const lineStrs = step.lines.map((l, i) => {
            const isSolution = l.move.toLowerCase() === solUci;
            const tag = isSolution ? " [SOLUTION]" : "";
            const pvStr = l.pv.length > 0 ? `  PV: ${l.pv.join(" ")}` : "";
            return `  ${i + 1}. ${l.san} (${formatEval(l)})${tag}${pvStr}`;
        });

        const hasSolution = step.lines.some(
            (l) => l.move.toLowerCase() === solUci
        );
        if (!hasSolution) {
            lineStrs.push(
                `  NOTE: the puzzle solution (${step.solutionMove}) is NOT in the engine's top ${step.lines.length} at depth 15 — treat with extra care.`
            );
        }

        blocks.push(`${header}\n${lineStrs.join("\n")}`);
    }

    return blocks.join("\n\n");
}

function formatPieces(pieces: HintRequest["pieces"], color: "white" | "black"): string {
    const sameColor = pieces.filter((p) => p.color === color);
    const byType = new Map<string, string[]>();
    for (const p of sameColor) {
        const list = byType.get(p.piece);
        if (list) list.push(p.square);
        else byType.set(p.piece, [p.square]);
    }
    const lines: string[] = [];
    for (const type of PIECE_ORDER) {
        const squares = byType.get(type);
        if (!squares || squares.length === 0) continue;
        squares.sort();
        lines.push(`  ${type}: ${squares.join(", ")}`);
    }
    return lines.join("\n") || "  (none)";
}

function buildUserPrompt(req: HintRequest): string {
    const sections: string[] = [
        `PLAYER COLOR: ${req.playerColor}`,
        `MOVE: ${req.moveNumber} of ${req.totalMoves}`,
        `HINTS USED: ${req.hintsUsed}`,
        `THEMES: ${req.themes.join(", ") || "(none specified)"}`,
        ``,
        `FEN: ${req.fen}`,
        ``,
        `WHITE PIECES:`,
        formatPieces(req.pieces, "white"),
        ``,
        `BLACK PIECES:`,
        formatPieces(req.pieces, "black"),
        ``,
        `SOLUTION (TOP SECRET — never speak this, never draw this arrow):`,
        `  UCI: ${req.solutionMove}`,
        `  Readable: ${req.solutionMoveReadable}`,
        `  FORBIDDEN ARROW: from ${req.solutionMove.slice(0, 2)} to ${req.solutionMove.slice(2, 4)}`,
        ``,
    ];

    if (req.solutionAnalysis) {
        sections.push(
            `SOLUTION ANALYSIS (ground truth — use these facts, do not contradict or invent additional effects):`
        );
        sections.push(formatSolutionAnalysis(req.solutionAnalysis));
        sections.push(``);
    }

    if (req.engineSteps && req.engineSteps.length > 0) {
        sections.push(
            `ENGINE LINES (Stockfish depth 15, MultiPV 3; evals are centipawns from the side-to-move's perspective — positive means good for the side to move):`
        );
        sections.push(formatEngineLines(req.engineSteps));
        sections.push(``);
    }

    sections.push(`TACTICAL ANALYSIS:`);
    sections.push(formatTacticalContext(req.tacticalContext));
    sections.push(``);
    sections.push(
        `Produce the structured hint now. Match your depth to HINTS USED = ${req.hintsUsed}. Verify your arrows do NOT include ${req.solutionMove.slice(0, 2)}→${req.solutionMove.slice(2, 4)}.`
    );

    return sections.join("\n");
}

export async function POST(request: Request) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return Response.json(
            { error: "ANTHROPIC_API_KEY is not configured" },
            { status: 500 }
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json(
            { error: "Invalid request", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const client = new Anthropic();

    try {
        const response = await client.messages.parse({
            model: "claude-opus-4-7",
            max_tokens: 8000,
            thinking: { type: "adaptive" },
            output_config: {
                effort: "high",
                format: zodOutputFormat(HintResponseSchema),
            },
            system: [
                {
                    type: "text",
                    text: PUZZLE_HINT_SYSTEM_PROMPT,
                    cache_control: { type: "ephemeral" },
                },
            ],
            messages: [
                {
                    role: "user",
                    content: buildUserPrompt(parsed.data),
                },
            ],
        });

        const output = response.parsed_output;
        if (!output) {
            return Response.json(
                {
                    error: "Failed to parse model response",
                    raw: response.content,
                    stop_reason: response.stop_reason,
                },
                { status: 502 }
            );
        }

        const solutionFrom = parsed.data.solutionMove.slice(0, 2).toLowerCase();
        const solutionTo = parsed.data.solutionMove.slice(2, 4).toLowerCase();
        const safeArrows = output.arrows.filter(
            (a) =>
                !(
                    a.from.toLowerCase() === solutionFrom &&
                    a.to.toLowerCase() === solutionTo
                )
        );

        return Response.json({
            spokenText: output.spokenText,
            arrows: safeArrows,
            usage: {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
                cache_creation_input_tokens:
                    response.usage.cache_creation_input_tokens ?? 0,
                cache_read_input_tokens:
                    response.usage.cache_read_input_tokens ?? 0,
            },
        });
    } catch (error) {
        if (error instanceof Anthropic.APIError) {
            console.error(
                "[puzzles/hint] Anthropic error:",
                error.status,
                error.message
            );
            return Response.json(
                { error: error.message, type: error.type },
                { status: error.status }
            );
        }
        console.error("[puzzles/hint] unexpected error:", error);
        return Response.json({ error: "Internal error" }, { status: 500 });
    }
}
