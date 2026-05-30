import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { PUZZLE_QUESTION_SYSTEM_PROMPT } from "@/agents/puzzleQuestionPrompt";
import {
    ArrowSchema,
    PieceSchema,
    SolutionAnalysisSchema,
    TacticalContextSchema,
    formatPieces,
    formatSolutionAnalysis,
    formatTacticalContext,
} from "@/lib/puzzleContextSchemas";

export const maxDuration = 60;

const QuestionResponseSchema = z.object({
    spokenText: z
        .string()
        .describe(
            "1-3 short sentences spoken aloud answering the player's question. Never reveal the exact solution move. 15-50 words."
        ),
    arrows: z
        .array(ArrowSchema)
        .describe(
            "Visual annotations to draw on the board. Must NOT include the solution's from→to as an arrow."
        ),
});

const TranscriptMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
});

const RequestSchema = z.object({
    userQuestion: z.string().min(1).max(2000),
    fen: z.string(),
    pieces: z.array(PieceSchema),
    themes: z.array(z.string()),
    moveNumber: z.number().int().nonnegative(),
    totalMoves: z.number().int().nonnegative(),
    playerColor: z.string(),
    tacticalContext: TacticalContextSchema,
    solutionMove: z.string(),
    solutionMoveReadable: z.string(),
    solutionAnalysis: SolutionAnalysisSchema.nullable().optional(),
    transcriptHistory: z.array(TranscriptMessageSchema).optional(),
});

type QuestionRequest = z.infer<typeof RequestSchema>;

function formatTranscript(history: QuestionRequest["transcriptHistory"]): string {
    if (!history || history.length === 0) return "(no prior exchanges in this session)";
    return history
        .map((m) => {
            const speaker = m.role === "user" ? "Player" : "Zuggy";
            return `${speaker}: ${m.content}`;
        })
        .join("\n");
}

function buildUserPrompt(req: QuestionRequest): string {
    const sections: string[] = [
        `USER QUESTION: ${req.userQuestion}`,
        ``,
        `PLAYER COLOR: ${req.playerColor}`,
        `MOVE: ${req.moveNumber} of ${req.totalMoves}`,
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

    sections.push(`TACTICAL ANALYSIS:`);
    sections.push(formatTacticalContext(req.tacticalContext));
    sections.push(``);

    sections.push(`TRANSCRIPT HISTORY (this session):`);
    sections.push(formatTranscript(req.transcriptHistory));
    sections.push(``);

    sections.push(
        `Answer the user's question now. Stay grounded in the analysis. Verify your arrows do NOT include ${req.solutionMove.slice(0, 2)}→${req.solutionMove.slice(2, 4)}.`
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
                format: zodOutputFormat(QuestionResponseSchema),
            },
            system: [
                {
                    type: "text",
                    text: PUZZLE_QUESTION_SYSTEM_PROMPT,
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
                "[puzzles/question] Anthropic error:",
                error.status,
                error.message
            );
            return Response.json(
                { error: error.message, type: error.type },
                { status: error.status }
            );
        }
        console.error("[puzzles/question] unexpected error:", error);
        return Response.json({ error: "Internal error" }, { status: 500 });
    }
}
