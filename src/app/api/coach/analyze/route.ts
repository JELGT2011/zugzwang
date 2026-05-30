import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { COACH_SYSTEM_PROMPT } from "@/agents/coachPrompt";

export const maxDuration = 60;

const ArrowSchema = z.object({
    from: z.string().describe('Starting square in algebraic notation, e.g. "e2"'),
    to: z.string().describe('Ending square in algebraic notation, e.g. "e4"'),
    color: z.enum(["red", "green", "blue"]).describe(
        'red = threats/attacks; green = suggested moves/ideas; blue = defensive or positional ideas'
    ),
});

const CoachResponseSchema = z.object({
    spokenText: z
        .string()
        .describe(
            "1-2 short sentences for the coach to speak aloud. Conversational, no markdown, no lists. 15-35 words ideal."
        ),
    arrows: z
        .array(ArrowSchema)
        .describe(
            "Visual annotations to draw on the board. Every piece, square, or move mentioned in spokenText must have a corresponding arrow."
        ),
});

const RequestSchema = z.object({
    fen: z.string(),
    moveHistory: z.string(),
    lastMove: z.string().nullable(),
    boardAscii: z.string(),
    playerColor: z.enum(["w", "b"]),
    stockfishAnalysis: z.string(),
    gameOver: z.boolean(),
    gameStatus: z.string().optional(),
});

type AnalyzeRequest = z.infer<typeof RequestSchema>;

function buildUserPrompt(req: AnalyzeRequest): string {
    const playerName = req.playerColor === "w" ? "White" : "Black";

    const stateSection = req.gameOver
        ? `GAME STATE: GAME OVER. ${req.gameStatus ?? ""}\n\nGive a brief warm wrap-up identifying the critical moment.`
        : `GAME STATE: in progress`;

    return [
        `PLAYER: ${playerName}`,
        `LAST MOVE: ${req.lastMove ?? "none (start of game)"}`,
        `WHOSE TURN: ${req.fen.split(" ")[1] === "w" ? "White" : "Black"}`,
        ``,
        `BOARD:`,
        req.boardAscii,
        ``,
        `MOVE HISTORY: ${req.moveHistory || "(no moves yet)"}`,
        ``,
        `STOCKFISH ANALYSIS:`,
        req.stockfishAnalysis,
        ``,
        stateSection,
        ``,
        `Produce the structured coach response now. Ground every claim in the Stockfish data above. If you mention a square, give it an arrow.`,
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
            max_tokens: 16000,
            thinking: { type: "adaptive" },
            output_config: {
                effort: "high",
                format: zodOutputFormat(CoachResponseSchema),
            },
            system: [
                {
                    type: "text",
                    text: COACH_SYSTEM_PROMPT,
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

        return Response.json({
            spokenText: output.spokenText,
            arrows: output.arrows,
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
            console.error("[coach/analyze] Anthropic error:", error.status, error.message);
            return Response.json(
                { error: error.message, type: error.type },
                { status: error.status }
            );
        }
        console.error("[coach/analyze] unexpected error:", error);
        return Response.json({ error: "Internal error" }, { status: 500 });
    }
}
