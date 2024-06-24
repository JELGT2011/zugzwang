import os
import chess
import chess.svg

from zugzwang.models import Narration, Puzzle, ChessScene

puzzle = Puzzle(
    puzzleid='tHkPZ',
    fen='2kr3r/ppp1q1pp/3bppb1/2Np4/1Q1P2P1/4P3/PPP2PP1/2KR1B1R b - - 8 16',
    rating=2422,
    ratingdeviation=90,
    moves=['b7b6', 'b4a4', 'c7c6', 'a4c6'],
    themes=['crushing', 'middlegame', 'queensideAttack', 'short'],
)

scenes = []

board = chess.Board(puzzle.fen)

scene = ChessScene(
    name="Daily Chess Puzzle",
    narration=Narration("Think fast? Think again. This puzzle demands patience."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[0])
board.push(lastmove)

puzzle_name = f"Puzzle: {puzzle.difficulty} ({puzzle.rating} elo)"
piece = board.piece_at(lastmove.to_square)
piece_name = chess.piece_name(piece.piece_type).lower()
move_name = f"{piece_name} to {chess.SQUARE_NAMES[lastmove.to_square]}"
scene = ChessScene(
    name=puzzle_name,
    narration=Narration(f"It starts with {'white' if puzzle.orientation != chess.WHITE else 'black'} playing {move_name}."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

# scene = Scene(
#     name=puzzle_name,
#     narration=Narration("We have many ways to recapture the rook, but there's no need to rush, do we have a better move?"),
#     board=board,
#     arrows=[
#         chess.svg.Arrow(chess.E7, chess.F8, color="yellow"),
#         chess.svg.Arrow(chess.D8, chess.F8, color="yellow"),
#         chess.svg.Arrow(chess.D7, chess.F8, color="yellow"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )
# scenes.append(scene)

# lastmove = chess.Move.from_uci(puzzle.moves[1])
# board.push(lastmove)

# scene = Scene(
#     name=puzzle_name,
#     narration=Narration("We have a check available with bishop h4."),
#     board=board,
#     arrows=[
#         chess.svg.Arrow(chess.H4, chess.E1, color="red"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )
# scenes.append(scene)

# scene = Scene(
#     name=puzzle_name,
#     narration=Narration("White cannot move the king onto the open F file and allow recapturing the rook with check."),
#     board=board,
#     arrows=[
#         chess.svg.Arrow(chess.E1, chess.F1, color="yellow"),
#         chess.svg.Arrow(chess.D6, chess.F8, color="yellow"),
#         chess.svg.Arrow(chess.D8, chess.F8, color="yellow"),
#         chess.svg.Arrow(chess.F8, chess.F1, color="red"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )
# scenes.append(scene)

# lastmove = chess.Move.from_uci(puzzle.moves[2])
# board.push(lastmove)

# scene = Scene(
#     name=puzzle_name,
#     narration=Narration("So white blocks with the rook."),
#     board=board,
#     arrows=[
#         chess.svg.Arrow(chess.H4, chess.E1, color="yellow"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )
# scenes.append(scene)

# scene = Scene(
#     name=puzzle_name,
#     narration=Narration("We could take it and win an exchange. But again, there's no rush."),
#     board=board,
#     arrows=[
#         chess.svg.Arrow(chess.H4, chess.F2, color="yellow"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )
# scenes.append(scene)

# scene = Scene(
#     name=puzzle_name,
#     narration=Narration("Notice the knight on e5 has only 1 defender, but is attacked twice."),
#     board=board,
#     arrows=[
#         chess.svg.Arrow(chess.D4, chess.E5, color="green"),
#         chess.svg.Arrow(chess.D6, chess.E5, color="yellow"),
#         chess.svg.Arrow(chess.D7, chess.E5, color="yellow"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )
# scenes.append(scene)

# lastmove = chess.Move.from_uci(puzzle.moves[3])
# board.push(lastmove)

# scene = Scene(
#     name=puzzle_name,
#     narration=Narration("We can force the trade, and in the end we'll win a pawn, reveal the rook attack and pin on the knight, and we can still capture the pinned rook on f2 afterwards, it's gg."),
#     board=board,
#     arrows=[
#         chess.svg.Arrow(chess.H4, chess.E1, color="yellow"),
#         chess.svg.Arrow(chess.D4, chess.E5, color="green"),
#         chess.svg.Arrow(chess.D6, chess.E5, color="yellow"),
#         chess.svg.Arrow(chess.D8, chess.D2, color="yellow"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )
# scenes.append(scene)


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
    generate_video(scenes, output_dir)
