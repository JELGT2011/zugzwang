import os
import chess
import chess.svg

from zugzwang.models import Narration, Puzzle, ChessScene

puzzle = Puzzle(
    puzzleid='uQj06',
    fen='3r2k1/1q5p/p1b1p1p1/1pP5/1P1p4/P2N4/2Q3PP/4RK2 w - - 3 31',
    rating=1933,
    ratingdeviation=74,
    moves=['e1e6', 'b7f7', 'f1e1', 'f7e6'],
    themes=['crushing', 'endgame', 'fork', 'short'],
)

board = chess.Board(puzzle.fen)

opening_scene = ChessScene(
    name="Daily Chess Puzzle",
    narration=Narration("Can you find the winning combination?"),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
)

lastmove = chess.Move.from_uci(puzzle.moves[0])
board.push(lastmove)

piece = board.piece_at(lastmove.to_square)
piece_name = chess.piece_name(piece.piece_type).lower()
move_name = f"{piece_name} to {chess.SQUARE_NAMES[lastmove.to_square]}"
puzzle_start_scene = ChessScene(
    name=f"Puzzle: {puzzle.difficulty} ({puzzle.rating} elo)",
    narration=Narration(f"It starts with {'white' if puzzle.orientation != chess.WHITE else 'black'} playing {move_name}."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

puzzle_hint_1_scene = ChessScene(
    name="Puzzle: hint 1",
    narration=Narration("We should always consider available checks. Here, there are 3."),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.C6, chess.G2, color="yellow"),
        chess.svg.Arrow(chess.D8, chess.F8, color="yellow"),
        chess.svg.Arrow(chess.B7, chess.F7, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

puzzle_hint_2_scene = ChessScene(
    name="Puzzle: hint 2",
    narration=Narration("Since the pawn has 2 defenders and 2 attackers, we should not take it."),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.C6, chess.G2, color="yellow"),
        chess.svg.Arrow(chess.B7, chess.G2, color="yellow"),
        chess.svg.Arrow(chess.F1, chess.G2, color="red"),
        chess.svg.Arrow(chess.C2, chess.G2, color="red"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

puzzle_hint_3_scene = ChessScene(
    name="Puzzle: hint 3",
    narration=Narration("We could instead deliver a check with the rook. White has no good moves to block, but they can just sidestep the check."),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.D8, chess.F8, color="yellow"),
        chess.svg.Arrow(chess.F8, chess.F1, color="yellow"),
        chess.svg.Arrow(chess.F1, chess.G1, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[1])
board.push(lastmove)

move_1_scene = ChessScene(
    name="Puzzle: move 1",
    narration=Narration("But if we check with the queen, it's a double attack on the king and the rook. There is no way to defend both pieces at once."),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.F7, chess.E6, color="yellow"),
        chess.svg.Arrow(chess.F7, chess.F1, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[2])
board.push(lastmove)

move_2_scene = ChessScene(
    name="Puzzle: move 2",
    narration=Narration("White moves the king"),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.F7, chess.E6, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[3])
board.push(lastmove)

move_3_scene = ChessScene(
    name="Puzzle: move 3",
    narration=Narration("And we win a free rook."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

# closing_scene = Scene(
#     name="Follow @DailyZugzwang",
#     narration=Narration("Follow for daily puzzles."),
#     board=chess.Board("8/5b2/5pb1/pppppppb/PPPPPPPB/5PB1/5B2/8 w - - 0 1"),
#     arrows=[
#         # chess.svg.Arrow(chess.A5, chess.H5, color="green"),
#         # chess.svg.Arrow(chess.A4, chess.H4, color="green"),
#     ],
# )

scenes = [
    opening_scene,
    puzzle_start_scene,
    puzzle_hint_1_scene,
    puzzle_hint_2_scene,
    puzzle_hint_3_scene,
    move_1_scene,
    move_2_scene,
    move_3_scene,
    # closing_scene,
]


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
    generate_video(scenes, output_dir)
