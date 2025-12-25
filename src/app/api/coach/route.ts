import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, fen, history } = await req.json();

  const systemPrompt = `You are a Grandmaster Chess Coach. 
Your goal is to explain the current state of the game and the last move played in a clear, engaging, and educational way.
The current position in FEN is: ${fen}
The move history (SAN) is: ${history}

Provide a brief analysis (2-3 sentences) of the current position. 
Explain the pros and cons of the last move. 
Suggest what the player should focus on next.
Keep it encouraging and insightful.
Respond in plain text.`;

  const result = streamText({
    model: 'google/gemini-3-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  });

  return result.toTextStreamResponse();
}
