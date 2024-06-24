import os
import chess
import chess.svg

from zugzwang.models import Narration, ChessScene


opening_scene = ChessScene(
    name="Chess Tactics: Pins",
    narration=Narration("Take a break from the brain-rot and learn about chess."),
    board=chess.Board("4k3/4p3/3B4/8/8/8/8/4R3 w Ea - 0 1"),
    arrows=[chess.svg.Arrow(chess.E1, chess.E7)],
)

introduction_scenes = [
    ChessScene(
        name="Pin: what is it?",
        narration=Narration("A pin is a chess tactic that forces an opponent to keep a piece in place, because moving it would expose a more valuable piece behind it."),
        board=chess.Board("4k3/4p3/3B4/8/8/8/8/4R3 w Ea - 0 1"),
        arrows=[chess.svg.Arrow(chess.E1, chess.E7)],
    ),
    ChessScene(
        name="Pin: example",
        narration=Narration("In this example, the pawn on e7 cannot capture the bishop on d6, because of the rook on e1."),
        board=chess.Board("4k3/8/3p4/8/8/8/8/4R3 w Ea - 0 1"),
        arrows=[chess.svg.Arrow(chess.E1, chess.E8)],
        lastmove=chess.Move.from_uci("e7d6"),
    ),
]

easy_puzzle_scenes = [
    ChessScene(
        name="Puzzle: easy",
        narration=Narration("Let's try it out."),
        board=chess.Board("7b/1k4qP/2b2n2/1p1p4/pP1Q4/5P2/1PP5/1K5R b - - 2 40"),
        arrows=[],
    ),
    ChessScene(
        name="Puzzle: easy",
        narration=Narration("White to move and win material, pause to try it yourself."),
        board=chess.Board("7b/1k4qn/2b5/1p1p4/pP1Q4/5P2/1PP5/1K5R b - - 2 40"),
        arrows=[],
        lastmove=chess.Move.from_uci("f6h7"),
    ),
    ChessScene(
        name="Puzzle: hint",
        narration=Narration("The first thing to notice is your queen is attacked by the black queen, and it is undefended. Start by taking first on g7."),
        board=chess.Board("7b/1k4qn/2b5/1p1p4/pP1Q4/5P2/1PP5/1K5R b - - 2 40"),
        arrows=[chess.svg.Arrow(chess.G7, chess.D4)],
        lastmove=chess.Move.from_uci("f6h7"),
    ),
    ChessScene(
        name="Puzzle: hint",
        narration=Narration("Black captures back."),
        board=chess.Board("7b/1k4Qn/2b5/1p1p4/pP6/5P2/1PP5/1K5R b - - 2 40"),
        arrows=[],
        lastmove=chess.Move.from_uci("d4g7"),
    ),
    ChessScene(
        name="Puzzle: solution",
        narration=Narration("Notice the alignment of black's pieces on the 7th rank."),
        board=chess.Board("8/1k4bn/2b5/1p1p4/pP6/5P2/1PP5/1K5R b - - 2 40"),
        arrows=[chess.svg.Arrow(chess.H7, chess.A7, color="yellow")],
        lastmove=chess.Move.from_uci("h8g7"),
    ),
    ChessScene(
        name="Puzzle: solution",
        narration=Narration("We capture back, pinning the bishop to the king with no way for black to defend it, and win a piece."),
        board=chess.Board("8/1k4bR/2b5/1p1p4/pP6/5P2/1PP5/1K6 b - - 2 40"),
        arrows=[chess.svg.Arrow(chess.H7, chess.B7)],
        lastmove=chess.Move.from_uci("h1h7"),
    ),
]

scenes = [
    opening_scene,
    *introduction_scenes,
    *easy_puzzle_scenes,
]


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    output_dir = os.path.join("data", "puzzles", "pins_001")
    generate_video(scenes, output_dir)
