import { NextResponse } from "next/server";
import type { Puzzle } from "@/types/puzzle";

// This will be replaced with actual puzzle data
// The puzzles can be loaded from a JSON file or database
let puzzlesCache: Puzzle[] | null = null;

async function loadPuzzles(): Promise<Puzzle[]> {
  if (puzzlesCache) {
    return puzzlesCache;
  }

  try {
    // Try to load puzzles from the data file
    // You can replace this with your puzzle data source
    const puzzlesModule = await import("@/data/puzzles");
    puzzlesCache = puzzlesModule.puzzles || puzzlesModule.default || [];
    return puzzlesCache;
  } catch {
    console.log("No puzzles data file found. Using sample puzzles.");
    // Return sample puzzles for development
    puzzlesCache = getSamplePuzzles();
    return puzzlesCache;
  }
}

// Sample puzzles for development/testing
function getSamplePuzzles(): Puzzle[] {
  return [
    {
      id: "00sHx",
      fen: "r4rk1/pp3ppp/2n1bq2/3p4/2pP4/P1P1P3/1B1N1PPP/R2QR1K1 w - - 0 16",
      moves: ["d1h5", "f6h4", "h5h4"],
      rating: 1446,
      ratingDeviation: 76,
      popularity: 97,
      nbPlays: 43473,
      themes: ["crushing", "endgame", "short"],
    },
    {
      id: "00sJ5",
      fen: "r2qr1k1/ppp2ppp/2n5/3p4/3Pn3/P1PBP3/5PPP/R1BQK2R w KQ - 2 12",
      moves: ["d3e4", "d5e4", "d1d8", "e8d8"],
      rating: 1181,
      ratingDeviation: 76,
      popularity: 91,
      nbPlays: 12563,
      themes: ["advantage", "middlegame", "short", "trappedPiece"],
    },
    {
      id: "00sO9",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      moves: ["f3e5", "f6e4", "e5f7", "e8f7", "c4e4"],
      rating: 1350,
      ratingDeviation: 76,
      popularity: 94,
      nbPlays: 28912,
      themes: ["fork", "middlegame", "opening", "sacrifice"],
    },
    {
      id: "00zyu",
      fen: "8/6pk/6bp/7p/5P1P/6PK/8/8 w - - 0 48",
      moves: ["f4f5", "g6f5", "g3g4", "h5g4"],
      rating: 1812,
      ratingDeviation: 79,
      popularity: 85,
      nbPlays: 8234,
      themes: ["endgame", "pawnEndgame", "long"],
    },
    {
      id: "01A5u",
      fen: "r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
      moves: ["c4f7", "e8f7", "f3e5", "d6e5", "d1h5"],
      rating: 1567,
      ratingDeviation: 76,
      popularity: 89,
      nbPlays: 15678,
      themes: ["attackingF2F7", "fork", "kingsideAttack", "opening", "sacrifice"],
    },
    {
      id: "01B7x",
      fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 2 5",
      moves: ["c1g5", "h7h6", "g5f6", "d8f6"],
      rating: 1234,
      ratingDeviation: 78,
      popularity: 92,
      nbPlays: 21456,
      themes: ["opening", "pin", "short"],
    },
    {
      id: "01C9z",
      fen: "2kr3r/ppp2ppp/2n5/3q4/3P4/2P5/PP3PPP/R2QR1K1 w - - 0 15",
      moves: ["e1e8", "d8e8", "d1d5"],
      rating: 1678,
      ratingDeviation: 77,
      popularity: 88,
      nbPlays: 12890,
      themes: ["backRankMate", "mate", "mateIn2", "middlegame"],
    },
    {
      id: "01D2a",
      fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 2 5",
      moves: ["d1a4", "c5d4", "f3d4", "e5d4", "a4c6"],
      rating: 1423,
      ratingDeviation: 76,
      popularity: 90,
      nbPlays: 18234,
      themes: ["discoveredAttack", "fork", "middlegame"],
    },
    {
      id: "01E4b",
      fen: "r2qkbnr/ppp2ppp/2n1b3/3pp3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 5",
      moves: ["f1b5", "d8d7", "e4d5", "e6d5", "b5c6", "d7c6", "f3e5"],
      rating: 1956,
      ratingDeviation: 80,
      popularity: 82,
      nbPlays: 6789,
      themes: ["long", "middlegame", "pin", "sacrifice"],
    },
    {
      id: "01F6c",
      fen: "r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 4 6",
      moves: ["c1g5", "d7d6", "c3d5", "c5e7", "d5f6"],
      rating: 1734,
      ratingDeviation: 78,
      popularity: 86,
      nbPlays: 9456,
      themes: ["fork", "kingsideAttack", "long", "middlegame"],
    },
    {
      id: "01G8d",
      fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQ - 0 7",
      moves: ["c4f7", "f8f7", "f3e5", "d6e5", "d1b3"],
      rating: 1589,
      ratingDeviation: 77,
      popularity: 87,
      nbPlays: 11234,
      themes: ["attackingF2F7", "fork", "middlegame", "sacrifice"],
    },
    {
      id: "01H0e",
      fen: "8/8/4k3/8/4K3/4P3/8/8 w - - 0 1",
      moves: ["e4f4", "e6e5", "f4e5"],
      rating: 823,
      ratingDeviation: 75,
      popularity: 96,
      nbPlays: 45678,
      themes: ["endgame", "pawnEndgame", "short"],
    },
    {
      id: "01I2f",
      fen: "r2qk2r/ppp2ppp/2n1bn2/2bpp3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQkq - 0 7",
      moves: ["e4d5", "f6d5", "c3d5", "e6d5", "d1a4"],
      rating: 1478,
      ratingDeviation: 76,
      popularity: 89,
      nbPlays: 14567,
      themes: ["discoveredAttack", "fork", "middlegame"],
    },
    {
      id: "01J4g",
      fen: "r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 6 7",
      moves: ["c1g5", "h7h6", "g5h4", "g7g5", "f3g5", "h6g5", "h4g5"],
      rating: 1845,
      ratingDeviation: 79,
      popularity: 84,
      nbPlays: 7890,
      themes: ["kingsideAttack", "long", "middlegame", "sacrifice"],
    },
    {
      id: "01K6h",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      moves: ["h5f7", "e8e7", "f7e6"],
      rating: 1123,
      ratingDeviation: 75,
      popularity: 95,
      nbPlays: 34567,
      themes: ["fork", "mateIn2", "opening", "short"],
    },
    {
      id: "01L8i",
      fen: "2r3k1/pp3ppp/2n5/3p4/3Pn3/P1P1P3/1B3PPP/R2QR1K1 w - - 0 18",
      moves: ["b2e5", "c6e5", "d4e5", "d5d4", "e3d4"],
      rating: 1667,
      ratingDeviation: 77,
      popularity: 86,
      nbPlays: 10234,
      themes: ["advantage", "deflection", "endgame", "long"],
    },
    {
      id: "01M0j",
      fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5",
      moves: ["e1g1", "b4c3", "d2c3", "f6e4", "d1d5"],
      rating: 1534,
      ratingDeviation: 76,
      popularity: 88,
      nbPlays: 13456,
      themes: ["fork", "middlegame", "opening", "trappedPiece"],
    },
    {
      id: "01N2k",
      fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQ - 4 7",
      moves: ["e1g1", "f6g4", "h2h3", "g4f2", "f1f2", "c5f2", "f1f2"],
      rating: 2012,
      ratingDeviation: 81,
      popularity: 80,
      nbPlays: 5678,
      themes: ["sacrifice", "kingsideAttack", "veryLong", "middlegame"],
    },
    {
      id: "01O4l",
      fen: "r3k2r/pppq1ppp/2n1bn2/3pp3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQkq - 4 8",
      moves: ["e4d5", "f6d5", "c3d5", "e6d5", "c2c4"],
      rating: 1389,
      ratingDeviation: 76,
      popularity: 91,
      nbPlays: 16789,
      themes: ["advantage", "middlegame", "opening", "short"],
    },
    {
      id: "01P6m",
      fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5",
      moves: ["c4f7", "e8e7", "d1c2", "e4d6", "f7d5"],
      rating: 1756,
      ratingDeviation: 78,
      popularity: 85,
      nbPlays: 8901,
      themes: ["attackingF2F7", "fork", "middlegame", "sacrifice"],
    },
  ];
}

export async function GET() {
  try {
    const puzzles = await loadPuzzles();
    return NextResponse.json({ puzzles });
  } catch (error) {
    console.error("Error loading puzzles:", error);
    return NextResponse.json(
      { error: "Failed to load puzzles", puzzles: [] },
      { status: 500 }
    );
  }
}

