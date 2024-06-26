import os
import chess
import chess.svg

from zugzwang.models import Narration, Puzzle, ChessScene
from zugzwang.utils import show_attacked

puzzle = Puzzle(
    puzzleid='pYoMZ',
    fen='r2qk2r/pp3pp1/2nb4/3p4/B2NnPp1/2P1Q3/PP1P2P1/RNB2RK1 w kq - 1 15',
    rating=2376,
    ratingdeviation=82,
    moves=['d2d3', 'd8h4', 'd3e4', 'g4g3'],
    themes=['crushing', 'middlegame', 'quietMove', 'sacrifice', 'short'],
)

voice_id = "7vsrRG6Gg5O5RWIv2i0J"
scenes = []

board = chess.Board(puzzle.fen)

scene = ChessScene(
    name="Daily Chess Puzzle",
    narration=Narration("Would you be brave enough for this line?", voice_id=voice_id),
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
    narration=Narration(f"{'White' if puzzle.orientation != chess.WHITE else 'Black'} plays {move_name}.", voice_id=voice_id),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)


scene = ChessScene(
    name=puzzle_name,
    narration=Narration("We ignore the obvious threat. If he dies, he dies. We've got bigger plans.", voice_id=voice_id),
    board=board,
    arrows=[
        *show_attacked(board, chess.E4),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[1])
board.push(lastmove)

scene = ChessScene(
    name=puzzle_name,
    narration=Narration("We move our queen to the open H file, threatening mate in 1.", voice_id=voice_id),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.H4, chess.H1, color="yellow"),
        chess.svg.Arrow(chess.H4, chess.H2, color="yellow"),
        chess.svg.Arrow(chess.E4, chess.F2, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[2])
board.push(lastmove)

scene = ChessScene(
    name=puzzle_name,
    narration=Narration("White takes the knight, eliminating the mate threat, but we have one more trick.", voice_id=voice_id),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.H4, chess.H1, color="yellow"),
        chess.svg.Arrow(chess.H4, chess.H2, color="yellow"),
        chess.svg.Arrow(chess.G1, chess.F2, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[3])
board.push(lastmove)

scene = ChessScene(
    name=puzzle_name,
    narration=Narration("We push the pawn, cutting off white's queen, and removing the king's escape square, once again threatening mate in 1. White can sacrifice the queen, but it won't be enough. GG.", voice_id=voice_id),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.E3, chess.G3, color="yellow"),
        chess.svg.Arrow(chess.G3, chess.F2, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
    generate_video(scenes, output_dir)
