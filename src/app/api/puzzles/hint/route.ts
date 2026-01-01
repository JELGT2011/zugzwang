import { createPuzzleHintPrompt, PUZZLE_HINT_SYSTEM_MESSAGE } from "@/lib/puzzleHintAgent";
import type { MoveAnnotation } from "@/contexts/StockfishContext";
import type { PuzzleTheme } from "@/types/puzzle";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface HintRequestBody {
  fen: string;
  themes: PuzzleTheme[];
  analysis: MoveAnnotation[];
  hintsUsed: number;
  moveNumber: number;
  totalMoves: number;
  boardAscii: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: HintRequestBody = await request.json();

    const { fen, themes, analysis, hintsUsed, moveNumber, totalMoves, boardAscii } = body;

    // Validate required fields
    if (!fen || !themes || !analysis || !boardAscii) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the prompt
    const prompt = createPuzzleHintPrompt({
      fen,
      themes,
      analysis,
      hintsUsed,
      moveNumber,
      totalMoves,
      boardAscii,
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PUZZLE_HINT_SYSTEM_MESSAGE },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const hint = completion.choices[0]?.message?.content?.trim();

    if (!hint) {
      return NextResponse.json(
        { error: "Failed to generate hint" },
        { status: 500 }
      );
    }

    return NextResponse.json({ hint });
  } catch (error) {
    console.error("Error generating puzzle hint:", error);
    return NextResponse.json(
      { error: "Failed to generate hint" },
      { status: 500 }
    );
  }
}
