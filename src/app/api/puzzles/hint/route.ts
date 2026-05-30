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
            targetPieces: z.array(z.string()),
        })
    ),
    materialBalance: z.number(),
    notes: z.array(z.string()),
});

const RequestSchema = z.object({
    boardAscii: z.string(),
    themes: z.array(z.string()),
    hintsUsed: z.number().int().nonnegative(),
    moveNumber: z.number().int().nonnegative(),
    totalMoves: z.number().int().nonnegative(),
    playerColor: z.string(),
    tacticalContext: TacticalContextSchema,
    solutionMove: z.string(),
    solutionMoveReadable: z.string(),
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
                    .map((f) => `- Potential targets: ${f.targetPieces.join(", ")}`)
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

function buildUserPrompt(req: HintRequest): string {
    return [
        `PLAYER COLOR: ${req.playerColor}`,
        `MOVE: ${req.moveNumber} of ${req.totalMoves}`,
        `HINTS USED: ${req.hintsUsed}`,
        `THEMES: ${req.themes.join(", ") || "(none specified)"}`,
        ``,
        `BOARD:`,
        req.boardAscii,
        ``,
        `SOLUTION (TOP SECRET — never speak this, never draw this arrow):`,
        `  UCI: ${req.solutionMove}`,
        `  Readable: ${req.solutionMoveReadable}`,
        `  FORBIDDEN ARROW: from ${req.solutionMove.slice(0, 2)} to ${req.solutionMove.slice(2, 4)}`,
        ``,
        `TACTICAL ANALYSIS:`,
        formatTacticalContext(req.tacticalContext),
        ``,
        `Produce the structured hint now. Match your depth to HINTS USED = ${req.hintsUsed}. Verify your arrows do NOT include ${req.solutionMove.slice(0, 2)}→${req.solutionMove.slice(2, 4)}.`,
    ].join("\n");
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
