import type { MoveAnnotation } from "@/contexts/StockfishContext";
import { tool } from "@openai/agents/realtime";
import type { Arrow } from "react-chessboard";
import { z } from "zod";
import { SHARED_COACH_PREFIX } from "./sharedInstructions";

// Zod schemas for game agent tools
const DrawArrowParameters = z.object({
    from: z.string().describe('The starting square (e.g., "e2").'),
    to: z.string().describe('The ending square (e.g., "e4").'),
    color: z.string().optional().describe('The color of the arrow (e.g., "red", "blue", "green"). Defaults to green.')
});

const GetTopMovesParameters = z.object({
    fen: z.string().optional().describe('The FEN position to analyze. Defaults to the current board position if not provided.'),
    numMoves: z.number().optional().describe('Number of top moves to return (default: 3).'),
    depth: z.number().optional().describe('Analysis depth (default: 15).')
});

/**
 * Creates the system instructions for the Game Agent (coach during live games)
 */
export function createGameAgentInstructions(
    playerRole: string,
    engineRole: string,
    moveHistory: string,
    boardAscii: string
): string {
    return `
You are a Grandmaster Chess Coach named 'Zuggy'. 
Your goal is to explain the current state of the game and moves in a clear, engaging, and educational way.
The human player is playing as ${playerRole} and the computer opponent is playing as ${engineRole}.

${SHARED_COACH_PREFIX}

CURRENT POSITION:
Board:
${boardAscii}

Move history: ${moveHistory}

TOOLS AVAILABLE:
1. draw_arrow: Visualize threats, attacks, defenses, and ideas on the board.
2. get_top_moves: Analyze ANY position. Pass a FEN string to analyze hypothetical positions.

YOUR ROLE AS COACH:
You are a COACH, not the player. The computer moves are handled by a separate engine.

When it's your turn to speak:
1. Analyze the position with get_top_moves to understand what's happening.
2. Explain WHY the last moves were good/bad using the tactical data (threats, hanging pieces).
3. Use draw_arrow to visualize the threats and ideas. NEVER talk without arrows.

CONCISENESS IS CRITICAL:
- Your responses are spoken aloud. Keep speech brief (1-2 sentences).
- During the opening (first 10-15 moves), just name the opening unless something unusual happens.
- Focus on the most important tactical feature: the biggest threat or hanging piece.
`;
}

/**
 * Creates the tools available to the Game Agent
 */
export function createGameAgentTools(
    addArrow: (arrow: Arrow) => void,
    getTopMoves: (fen: string, numMoves?: number, depth?: number) => Promise<MoveAnnotation[]>,
    getCurrentFen: () => string
) {
    return [
        tool({
            name: 'draw_arrow',
            description: 'Draw a tactical arrow on the chessboard. MANDATORY: Use this whenever you mention a piece, square, threat, or move to provide visual context. Use "red" for threats, "green" for moves/suggestions, and "blue" for positional ideas.',
            parameters: DrawArrowParameters,
            strict: true,
            execute: async ({ from, to, color }: z.infer<typeof DrawArrowParameters>) => {
                const arrow: Arrow = { startSquare: from, endSquare: to, color: color || "green" };
                addArrow(arrow);
                return { status: "success" };
            }
        }),
        tool({
            name: 'get_top_moves',
            description: 'Analyze a position and get the top moves with evaluations, threats, and tactical features. Use this to understand WHY a move is good.',
            parameters: GetTopMovesParameters,
            strict: true,
            execute: async ({ fen, numMoves = 3, depth = 15 }: z.infer<typeof GetTopMovesParameters>) => {
                const targetFen = fen || getCurrentFen();
                const moves = await getTopMoves(targetFen, numMoves, depth);
                return {
                    status: "success",
                    moves: moves.map(m => ({
                        move: m.san,
                        evaluation: m.evaluation,
                        mate: m.mate,
                        isCheck: m.isCheck,
                        isCapture: m.isCapture,
                        capturedPiece: m.capturedPiece,
                        // Tactical reasoning
                        newThreats: m.tactical.threats
                            .filter(t => t.isNewThreat)
                            .map(t => `${t.attacker} on ${t.attackerSquare} attacks ${t.target} on ${t.targetSquare}`),
                        hangingPieces: m.tactical.hanging
                            .map(h => `${h.piece} on ${h.square} (value: ${h.value})`),
                        tacticalNotes: m.tactical.notes,
                        principalVariation: m.principalVariation.slice(0, 4).join(" "),
                    }))
                };
            }
        })
    ];
}

export const GAME_AGENT_NAME = 'Zuggy';
