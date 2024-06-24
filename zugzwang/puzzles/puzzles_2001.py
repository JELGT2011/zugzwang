import os
import chess
import chess.svg

from zugzwang.models import Narration, Puzzle, ChessScene

puzzle = Puzzle(
    puzzleid='DirK4',
    fen='8/8/pp6/3k4/1P6/PK6/8/8 w - - 4 46',
    rating=1671,
    ratingdeviation=77,
    moves=['b3a4', 'd5c4', 'b4b5', 'a6b5'],
    themes=['endgame', 'mate', 'mateIn2', 'pawnEndgame', 'short', 'zugzwang'],
)

board = chess.Board(puzzle.fen)

opening_scene = ChessScene(
    name="Daily Chess Puzzle",
    narration=Narration("Take a break from the brain-rot and solve a chess puzzle."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
)

lastmove = chess.Move.from_uci(puzzle.moves[0])
board.push(lastmove)

puzzle_start_scene = ChessScene(
    name=f"Puzzle: {puzzle.difficulty} ({puzzle.rating} elo)",
    narration=Narration(f"{'White' if puzzle.orientation == chess.WHITE else 'Black'} to play, pause to try it yourself."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

puzzle_hint_1_scene = ChessScene(
    name="Puzzle: hint 1",
    narration=Narration("The white king currently only has 1 safe square."),
    board=board,
    arrows=[chess.svg.Arrow(chess.A4, chess.B3)],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

puzzle_hint_2_scene = ChessScene(
    name="Puzzle: hint 2",
    narration=Narration("If the king cannot move, white will only have 1 legal move and will be forced to push their pawn."),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.A4, chess.B3, color="red"),
        chess.svg.Arrow(chess.B4, chess.B5, color="blue"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[1])
board.push(lastmove)

puzzle_solution_1_scene = ChessScene(
    name="Puzzle: solution",
    narration=Narration("We can both cut off the white king, and protect our pawn after white pushes."),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.A4, chess.B3, color="red"),
        chess.svg.Arrow(chess.C4, chess.B5, color="green"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[2])
board.push(lastmove)

puzzle_solution_2_scene = ChessScene(
    name="Puzzle: solution",
    narration=Narration("White plays the only legal move."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[3])
board.push(lastmove)

puzzle_solution_3_scene = ChessScene(
    name="Puzzle: solution",
    narration=Narration("We take back with checkmate, as the king cannot move."),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.C4, chess.B3, color="yellow"),
        chess.svg.Arrow(chess.C4, chess.B4, color="yellow"),
        chess.svg.Arrow(chess.C4, chess.B5, color="yellow"),
        chess.svg.Arrow(chess.B5, chess.A4, color="red"),
        chess.svg.Arrow(chess.B6, chess.A5, color="red"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

closing_scene = ChessScene(
    name="Follow @DailyZugzwang",
    narration=Narration("Follow for daily puzzles."),
    board=chess.Board("8/5b2/5pb1/pppppppb/PPPPPPPB/5PB1/5B2/8 w - - 0 1"),
    arrows=[
        # chess.svg.Arrow(chess.A5, chess.H5, color="green"),
        # chess.svg.Arrow(chess.A4, chess.H4, color="green"),
    ],
)

scenes = [
    opening_scene,
    puzzle_start_scene,
    puzzle_hint_1_scene,
    puzzle_hint_2_scene,
    puzzle_solution_1_scene,
    puzzle_solution_2_scene,
    puzzle_solution_3_scene,
    closing_scene,
]


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
    generate_video(scenes, output_dir)
