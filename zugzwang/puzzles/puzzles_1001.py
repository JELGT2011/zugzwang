import os
import chess
import chess.svg

from zugzwang.models import Narration, ChessScene


opening_scene = ChessScene(
    name="Daily Chess Puzzle",
    narration=Narration("Take a break from the brain-rot and solve a chess puzzle."),
    board=chess.Board("3r2k1/2q2pp1/p6p/2p4P/Pp2N1R1/4P2K/1B1P2P1/8 b - - 4 33"),
    arrows=[],
)

puzzle_scenes = [
    ChessScene(
        name="Puzzle: easy (1057 elo)",
        narration=Narration("White to play, pause to try it yourself."),
        board=chess.Board("3r2k1/3q1pp1/p6p/2p4P/Pp2N1R1/4P2K/1B1P2P1/8 b - - 4 33"),
        arrows=[],
        lastmove=chess.Move.from_uci("c7d7"),
    ),
    ChessScene(
        name="Puzzle: hint 1",
        narration=Narration("Black has moved to pin our rook to the king, but pinned pieces can still pin other pieces."),
        board=chess.Board("3r2k1/3q1pp1/p6p/2p4P/Pp2N1R1/4P2K/1B1P2P1/8 b - - 4 33"),
        arrows=[chess.svg.Arrow(chess.D7, chess.H3, color="yellow")],
        lastmove=chess.Move.from_uci("c7d7"),
    ),
    ChessScene(
        name="Puzzle: hint 2",
        narration=Narration("Even though our rook is pinned, it still pins black's pawn on g7."),
        board=chess.Board("3r2k1/3q1pp1/p6p/2p4P/Pp2N1R1/4P2K/1B1P2P1/8 b - - 4 33"),
        arrows=[
            chess.svg.Arrow(chess.D7, chess.H3, color="yellow"),
            chess.svg.Arrow(chess.G4, chess.G8, color="green"),
        ],
        lastmove=chess.Move.from_uci("c7d7"),
    ),
    ChessScene(
        name="Puzzle: solution",
        narration=Narration("We utilize the pin to fork black's king and queen with our knight."),
        board=chess.Board("3r2k1/3q1pp1/p4N1p/2p4P/Pp4R1/4P2K/1B1P2P1/8 b - - 4 33"),
        arrows=[
            chess.svg.Arrow(chess.G4, chess.G8, color="green"),
            chess.svg.Arrow(chess.F6, chess.D7, color="red"),
            chess.svg.Arrow(chess.F6, chess.G8, color="red"),
        ],
        lastmove=chess.Move.from_uci("e4f6"),
    ),
    ChessScene(
        name="Puzzle: solution",
        narration=Narration("Black has to move the king."),
        board=chess.Board("3r3k/3q1pp1/p4N1p/2p4P/Pp4R1/4P2K/1B1P2P1/8 b - - 4 33"),
        arrows=[chess.svg.Arrow(chess.F6, chess.D7, color="red")],
        lastmove=chess.Move.from_uci("g8h8"),
    ),
    ChessScene(
        name="Puzzle: solution",
        narration=Narration("We win the queen for our knight."),
        board=chess.Board("3r3k/3N1pp1/p6p/2p4P/Pp4R1/4P2K/1B1P2P1/8 b - - 4 33"),
        arrows=[],
        lastmove=chess.Move.from_uci("f6d7"),
    ),
]

closing_scene = ChessScene(
    name="Follow @DailyZugzwang",
    narration=Narration("Follow for daily puzzles."),
    board=chess.Board("8/5b2/5pb1/pppppppb/PPPPPPPB/5PB1/5B2/8 w - - 0 1"),
    arrows=[
        chess.svg.Arrow(chess.A5, chess.H5, color="green"),
        chess.svg.Arrow(chess.A4, chess.H4, color="green"),
    ],
)

scenes = [
    opening_scene,
    *puzzle_scenes,
    closing_scene,
]


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    output_dir = os.path.join("data", "puzzles", "puzzles_1001")
    generate_video(scenes, output_dir)
