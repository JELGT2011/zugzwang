import { NextRequest, NextResponse } from "next/server";
import { StockfishAnalysis, AnalysisOptions } from "@/lib/stockfish";
import { spawn } from "child_process";
import path from "path";

// This is the server-side API route for Stockfish analysis
// It uses Stockfish.js running as a child process in Node.js

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { fen, options = {} } = await request.json() as { fen: string, options: AnalysisOptions };
    
    if (!fen) {
      return NextResponse.json({ error: "FEN is required" }, { status: 400 });
    }

    const pathToEngine = path.join(process.cwd(), "node_modules/stockfish/src/stockfish.js");
    
    return new Promise((resolve) => {
      const engine = spawn("node", [pathToEngine]);
      const result: Partial<StockfishAnalysis> = {};
      let isResolved = false;

      const finish = (response: NextResponse) => {
        if (isResolved) return;
        isResolved = true;
        engine.kill();
        resolve(response);
      };

      engine.stdout.on("data", (data) => {
        const output = data.toString();
        const lines = output.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          // UCI Protocol parsing logic
          if (line.startsWith("info") && line.includes("score")) {
            const parts = line.split(" ");
            
            const depthIdx = parts.indexOf("depth");
            if (depthIdx !== -1) result.depth = parseInt(parts[depthIdx + 1]);

            const scoreIdx = parts.indexOf("score");
            if (scoreIdx !== -1) {
              const scoreType = parts[scoreIdx + 1];
              const scoreValue = parseInt(parts[scoreIdx + 2]);
              if (scoreType === "cp") {
                result.evaluation = scoreValue;
                result.mate = undefined;
              } else if (scoreType === "mate") {
                result.mate = scoreValue;
                result.evaluation = scoreValue > 0 ? 10000 : -10000;
              }
            }

            const pvIdx = parts.indexOf("pv");
            if (pvIdx !== -1) {
              result.principalVariation = parts.slice(pvIdx + 1).filter((p: string) => p.trim());
            }
          }

          if (line.startsWith("bestmove")) {
            const parts = line.split(" ");
            const bestMove = parts[1];
            const ponderIdx = parts.indexOf("ponder");
            const ponderMove = ponderIdx !== -1 ? parts[ponderIdx + 1] : undefined;
            
            finish(NextResponse.json({
              bestMove,
              ponderMove,
              evaluation: result.evaluation || 0,
              mate: result.mate,
              depth: result.depth || 0,
              principalVariation: result.principalVariation || []
            }));
          }
        }
      });

      engine.stderr.on("data", (data) => {
        console.error(`Stockfish Engine Error: ${data}`);
      });

      engine.on("error", (error) => {
        console.error("Failed to start Stockfish engine:", error);
        finish(NextResponse.json({ error: "Failed to start engine" }, { status: 500 }));
      });

      // Send UCI commands
      engine.stdin.write("uci\n");
      engine.stdin.write("isready\n");
      
      if (options.skillLevel !== undefined) {
        engine.stdin.write(`setoption name Skill Level value ${options.skillLevel}\n`);
      }
      
      engine.stdin.write(`position fen ${fen}\n`);
      
      if (options.movetime) {
        engine.stdin.write(`go movetime ${options.movetime}\n`);
      } else {
        engine.stdin.write(`go depth ${options.depth || 12}\n`);
      }
    });

  } catch (error) {
    console.error("Stockfish API error:", error);
    return NextResponse.json({ error: "Internal server error during analysis" }, { status: 500 });
  }
}
