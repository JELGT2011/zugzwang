import { THEME_DISPLAY_NAMES, type PuzzleTheme } from "@/types/puzzle";
import { tool } from "@openai/agents/realtime";
import type { Arrow } from "react-chessboard";
import { z } from "zod";
import { ARROW_ANNOTATION, BREVITY } from "./sharedInstructions";

// Zod schemas for puzzle agent tools
const DrawArrowParameters = z.object({
    from: z.string().describe('The starting square (e.g., "e2").'),
    to: z.string().describe('The ending square (e.g., "e4").'),
    color: z.string().optional().describe('The color of the arrow (e.g., "red", "blue", "green"). Defaults to green.')
});

/**
 * Tactical analysis of the position computed from chess.js
 */
export interface PuzzleTacticalContext {
    // Pieces that are attacked but not defended
    undefendedPieces: Array<{
        piece: string;      // e.g., "queen", "rook"
        square: string;     // e.g., "d5"
        color: string;      // "white" or "black"
        attackedBy: string[]; // e.g., ["knight on c3", "bishop on b7"]
    }>;
    // Pieces that are pinned (can't move without exposing king)
    pins: Array<{
        pinnedPiece: string;  // e.g., "knight"
        pinnedSquare: string; // e.g., "e4"
        pinnedBy: string;     // e.g., "bishop on b7"
        protects: string;     // e.g., "king on g1"
    }>;
    // Possible captures available
    captures: Array<{
        attacker: string;     // e.g., "queen"
        attackerSquare: string;
        target: string;       // e.g., "rook"
        targetSquare: string;
    }>;
    // Checks available
    checks: Array<{
        piece: string;
        fromSquare: string;
        toSquare: string;
    }>;
    // Pieces that can be forked (two+ valuable pieces attackable by one move)
    forkTargets: Array<{
        targetPieces: string[]; // e.g., ["king on e8", "rook on h8"]
    }>;
    // Material balance (positive = white ahead)
    materialBalance: number;
    // Additional notes
    notes: string[];
}

/**
 * Creates the system instructions for the Puzzle Agent (hint provider during puzzles)
 */
export function createPuzzleAgentInstructions(params: {
    boardAscii: string;
    themes: PuzzleTheme[];
    hintsUsed: number;
    moveNumber: number;
    totalMoves: number;
    playerColor: string;
    tacticalContext: PuzzleTacticalContext;
}): string {
    const { boardAscii, themes, hintsUsed, moveNumber, totalMoves, playerColor, tacticalContext } = params;

    // Format themes for the prompt
    const themeDescriptions = themes
        .map((theme) => THEME_DISPLAY_NAMES[theme] || theme)
        .join(", ");

    // Format tactical context
    const tacticalSummary = formatTacticalContext(tacticalContext);

    // Determine hint depth based on hints used
    let hintDepthInstruction = "";
    if (hintsUsed === 0) {
        hintDepthInstruction = `
HINT DEPTH - FIRST HINT (very subtle):
- Ask ONE short question to get them thinking (e.g., "What's the most forcing move type?")
- Do NOT mention themes, specific pieces, or draw arrows yet`;
    } else if (hintsUsed === 1) {
        hintDepthInstruction = `
HINT DEPTH - SECOND HINT (directional):
- Reference the puzzle theme or pattern to look for
- Use arrows to highlight the general area of interest`;
    } else if (hintsUsed === 2) {
        hintDepthInstruction = `
HINT DEPTH - THIRD HINT (helpful):
- Mention which piece type should move
- Use arrows to show threats`;
    } else {
        hintDepthInstruction = `
HINT DEPTH - FOURTH+ HINT (very helpful):
- Indicate the general direction or what the piece targets
- Use arrows to show the tactical pattern`;
    }

    return `
You are Zuggy, a friendly Grandmaster Chess Coach helping a player solve a puzzle.
The player is playing as ${playerColor}.

${BREVITY}
${ARROW_ANNOTATION}

PUZZLE CONTEXT:
- Theme(s): ${themeDescriptions || "Not specified"}
- Move ${moveNumber} of ${totalMoves} to solve
- Hints already used: ${hintsUsed}

Current Board:
${boardAscii}

POSITION ANALYSIS (use this to understand WHY the solution works - keep this secret!):
${tacticalSummary}

PUZZLE-SOLVING CONCEPTS (reference these when relevant):
- Checks first, then captures, then threats
- Look for undefended pieces
- Forks attack two pieces at once
- Forcing moves limit opponent options

YOUR ROLE: Guide through short questions. Use arrows to show, don't tell. Let them discover the answer.

${hintDepthInstruction}

PUZZLE HINT RULES:
1. NEVER reveal the exact move (e.g., "Nf7" or "knight to f7")
2. NEVER give away both the piece AND the target square together
3. Use arrows to show, don't tell
4. Be warm and encouraging
`;
}

/**
 * Format tactical context into a readable string for the prompt
 */
function formatTacticalContext(ctx: PuzzleTacticalContext): string {
    const sections: string[] = [];

    if (ctx.undefendedPieces.length > 0) {
        sections.push("UNDEFENDED PIECES:\n" + ctx.undefendedPieces
            .map(p => `- ${p.color} ${p.piece} on ${p.square} (attacked by: ${p.attackedBy.join(", ") || "none"})`)
            .join("\n"));
    }

    if (ctx.pins.length > 0) {
        sections.push("PINS:\n" + ctx.pins
            .map(p => `- ${p.pinnedPiece} on ${p.pinnedSquare} is pinned by ${p.pinnedBy} (protects ${p.protects})`)
            .join("\n"));
    }

    if (ctx.captures.length > 0) {
        sections.push("POSSIBLE CAPTURES:\n" + ctx.captures
            .map(c => `- ${c.attacker} on ${c.attackerSquare} can capture ${c.target} on ${c.targetSquare}`)
            .join("\n"));
    }

    if (ctx.checks.length > 0) {
        sections.push("AVAILABLE CHECKS:\n" + ctx.checks
            .map(c => `- ${c.piece} from ${c.fromSquare} to ${c.toSquare}`)
            .join("\n"));
    }

    if (ctx.forkTargets.length > 0) {
        sections.push("FORK OPPORTUNITIES:\n" + ctx.forkTargets
            .map(f => `- Potential targets: ${f.targetPieces.join(", ")}`)
            .join("\n"));
    }

    sections.push(`MATERIAL: ${ctx.materialBalance > 0 ? "White" : ctx.materialBalance < 0 ? "Black" : "Equal"} ${ctx.materialBalance !== 0 ? `(${ctx.materialBalance > 0 ? "+" : ""}${ctx.materialBalance})` : ""}`);

    if (ctx.notes.length > 0) {
        sections.push("NOTES:\n" + ctx.notes.map(n => `- ${n}`).join("\n"));
    }

    return sections.join("\n\n") || "No significant tactical features detected.";
}

/**
 * Creates the tools available to the Puzzle Agent
 * Note: No Stockfish needed - we provide pre-computed tactical analysis
 */
export function createPuzzleAgentTools(addArrow: (arrow: Arrow) => void) {
    return [
        tool({
            name: 'draw_arrow',
            description: 'Draw an arrow on the chessboard to guide the player. Use "red" for threats and danger, "green" for areas to focus on, and "blue" for defensive ideas. Be careful not to give away the exact move!',
            parameters: DrawArrowParameters,
            strict: true,
            execute: async ({ from, to, color }: z.infer<typeof DrawArrowParameters>) => {
                const arrow: Arrow = { startSquare: from, endSquare: to, color: color || "green" };
                addArrow(arrow);
                return { status: "success" };
            }
        }),
    ];
}

export const PUZZLE_AGENT_NAME = 'Zuggy';
