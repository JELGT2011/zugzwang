import { z } from "zod/v4";

export const ArrowSchema = z.object({
    from: z.string().describe('Starting square in algebraic notation, e.g. "e2"'),
    to: z.string().describe('Ending square in algebraic notation, e.g. "e4"'),
    color: z.enum(["red", "green", "blue"]).describe(
        'red = threats/attacks; green = suggested moves/ideas (but never the solution); blue = defensive or positional ideas'
    ),
});

export const TacticalContextSchema = z.object({
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

export const SolutionAnalysisSchema = z.object({
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

export const PieceSchema = z.object({
    piece: z.string(),
    square: z.string(),
    color: z.enum(["white", "black"]),
});

export const EngineLineSchema = z.object({
    move: z.string(),
    san: z.string(),
    evaluation: z.number().nullable(),
    mate: z.number().nullable(),
    pv: z.array(z.string()),
});

export const StepEngineAnalysisSchema = z.object({
    stepIndex: z.number().int(),
    fen: z.string(),
    sideToMove: z.enum(["white", "black"]),
    isCurrent: z.boolean(),
    solutionMove: z.string(),
    lines: z.array(EngineLineSchema),
});

export type TacticalContextInput = z.infer<typeof TacticalContextSchema>;
export type SolutionAnalysisInput = z.infer<typeof SolutionAnalysisSchema>;
export type PieceInput = z.infer<typeof PieceSchema>;
export type StepEngineAnalysisInput = z.infer<typeof StepEngineAnalysisSchema>;

function formatTacticalContext(ctx: TacticalContextInput): string {
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

function formatSolutionAnalysis(analysis: SolutionAnalysisInput): string {
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

function formatPieces(pieces: PieceInput[], color: "white" | "black"): string {
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

function formatEngineLines(steps: StepEngineAnalysisInput[]): string {
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

export {
    formatTacticalContext,
    formatSolutionAnalysis,
    formatPieces,
    formatEngineLines,
};
