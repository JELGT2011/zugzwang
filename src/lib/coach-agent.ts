import { RealtimeAgent, tool } from '@openai/agents/realtime';
import { z } from "zod";

export interface Arrow {
    startSquare: string;
    endSquare: string;
    color: string;
}

export interface CoachAgentOptions {
    fen: string;
    moveHistory: string;
    playerColor: 'w' | 'b';
    onDrawArrow: (arrow: Arrow) => void;
    onClearArrows: () => void;
}

const DrawArrowParameters = z.object({
    from: z.string().describe('The starting square (e.g., "e2").'),
    to: z.string().describe('The ending square (e.g., "e4").'),
    color: z.string().optional().describe('The color of the arrow (e.g., "red", "blue", "green"). Defaults to green.')
});

export function createCoachAgent({
    fen,
    moveHistory,
    playerColor,
    onDrawArrow,
    onClearArrows
}: CoachAgentOptions) {
    const playerRole = playerColor === 'w' ? 'White' : 'Black';
    const engineRole = playerColor === 'w' ? 'Black' : 'White';

    return new RealtimeAgent({
        name: 'Zuggy',
        instructions: `You are a Grandmaster Chess Coach named 'Zuggy'. 
Your goal is to explain the current state of the game and moves in a clear, engaging, and educational way.
The human player is playing as ${playerRole} and the engine (Stockfish) is playing as ${engineRole}.
Current position (FEN): ${fen}
Move history: ${moveHistory}

Be encouraging and insightful. Keep your responses relatively concise as they are spoken.
If the user asks questions about the position, use the provided context to answer.

You have tools to interact with the chessboard:
1. draw_arrow: Use this to point out specific moves, threats, or squares on the board.
2. clear_arrows: Use this to remove all arrows from the board when they are no longer relevant.`,
        tools: [
            tool({
                name: 'draw_arrow',
                description: 'Draw an arrow on the chessboard to highlight a move or threat.',
                parameters: DrawArrowParameters,
                strict: true,
                execute: async ({ from, to, color }: z.infer<typeof DrawArrowParameters>) => {
                    onDrawArrow({ startSquare: from, endSquare: to, color: color || "green" });
                    return { status: "success" };
                }
            }),
            tool({
                name: 'clear_arrows',
                description: 'Clear all arrows currently drawn on the board.',
                parameters: z.object({}),
                strict: true,
                execute: async () => {
                    onClearArrows();
                    return { status: "success" };
                }
            })
        ]
    });
}
