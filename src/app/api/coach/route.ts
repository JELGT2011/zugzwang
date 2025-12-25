import { auth } from "@/auth";
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const prompt = (playerRole: string, engineRole: string, fen: string, history: string) => {
    return `You are a Grandmaster Chess Coach. 
Your goal is to explain the current state of the game and the last move played in a clear, engaging, and educational way.
The human player is playing as ${playerRole} and the engine (Stockfish) is playing as ${engineRole}.
The current position in FEN is: ${fen}
The move history (SAN) is: ${history}

Provide a brief analysis (2-3 sentences) of the current position. 
Explain the pros and cons of the last move. 
Suggest what the player (who is ${playerRole}) should focus on next.
Keep it encouraging and insightful.
Respond in plain text.`;
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { messages, fen, history, playerColor } = await req.json();

    const playerRole = playerColor === 'w' ? 'White' : 'Black';
    const engineRole = playerColor === 'w' ? 'Black' : 'White';

    const result = streamText({
        model: 'google/gemini-3-flash',
        messages: [
            { role: 'system', content: prompt(playerRole, engineRole, fen, history) },
            ...messages,
        ],
    });

    return result.toTextStreamResponse();
}
