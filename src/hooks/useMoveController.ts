import { useStockfish } from "@/contexts/StockfishContext";
import { useBoardStore } from "@/stores/boardStore";
import { Chess} from "chess.js";
import { useCallback } from "react";

export interface Move {
    from: string;
    to: string;
    promotion?: string;
}

/**
 * useMoveController - A hook that provides a strategy for determining the next move
 * based on the current game mode (Game, Puzzle, Opening).
 */
export function useMoveController() {
    const { getBestMove } = useStockfish();
    const gameMode = useBoardStore((state) => state.gameMode);

    const getNextMove = useCallback(async (game: Chess): Promise<Move | null> => {
        const fen = game.fen();

        switch (gameMode) {
            case "game": {
                // For a standard game, we use Stockfish to find the best move
                const bestMoveUci = await getBestMove(fen);
                if (!bestMoveUci) return null;

                // Parse UCI format (e.g., "e2e4" or "e7e8q")
                const from = bestMoveUci.slice(0, 2);
                const to = bestMoveUci.slice(2, 4);
                const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

                return { from, to, promotion };
            }

            case "puzzle":
                // TODO: Implement puzzle sequence logic
                console.warn("Puzzle mode not yet implemented in MoveController");
                return null;

            case "opening":
                // TODO: Implement opening tree logic
                console.warn("Opening mode not yet implemented in MoveController");
                return null;

            default:
                return null;
        }
    }, [gameMode, getBestMove]);

    return { getNextMove };
}
