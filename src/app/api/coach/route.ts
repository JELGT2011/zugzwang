import { openai } from "@ai-sdk/openai";
import { streamText, Message } from "ai";

export const runtime = "edge";

const SYSTEM_PROMPT = `You are a friendly, encouraging chess coach helping a player improve their game. You're watching them play against an AI opponent and providing real-time coaching.

Your communication style:
- Be concise but insightful (2-4 sentences usually)
- Use chess terminology but explain complex concepts simply
- Be encouraging, even when pointing out mistakes
- Focus on teaching patterns and ideas, not just moves
- Adjust detail level based on the hint level requested

When explaining the AI's move:
- Explain the idea/plan behind the move
- Mention what it threatens or prepares
- Keep it brief unless it's a critical moment

When evaluating the player's move:
- If it was good/great: acknowledge it briefly with why it worked
- If it was an inaccuracy/mistake: explain what was missed without being harsh
- If it was a blunder: clearly but kindly explain what went wrong and the tactical theme

When giving hints:
- "minimal": Just point in a direction ("Look at your knight's potential")
- "moderate": Give the theme without the exact move ("There's a fork available")
- "detailed": Explain the best continuation with reasoning

Use chess notation when referring to specific moves. Include evaluation context when relevant but don't overwhelm with numbers.

IMPORTANT: Do NOT reveal the exact best move unless explicitly asked for detailed hints. Guide the player to find it themselves.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages } = body as { messages: Message[] };

    // Process messages to extract analysis context
    const processedMessages = messages.map((msg: Message) => {
      if (msg.role === "user") {
        try {
          const parsed = JSON.parse(msg.content as string);
          if (parsed.messageType && parsed.analysisContext) {
            let prompt = "";
            switch (parsed.messageType) {
              case "ai_move":
                prompt = `The AI just made a move. Please explain what it's doing and what I should watch out for.\n\n${parsed.analysisContext}`;
                break;
              case "player_move":
                prompt = `I just made a move. Please evaluate it and give me feedback.\n\n${parsed.analysisContext}`;
                break;
              case "hint_request":
                prompt = `I need a hint for this position. What should I be looking at?\n\n${parsed.analysisContext}`;
                break;
              default:
                prompt = parsed.analysisContext;
            }
            return { ...msg, content: prompt };
          }
        } catch {
          // Not JSON, use as-is
        }
      }
      return msg;
    });

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages: processedMessages,
      temperature: 0.7,
      maxTokens: 300,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Coach API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate coaching response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
