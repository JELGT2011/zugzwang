import os
import chess
import chess.svg

from zugzwang.models import Narration, Puzzle, ChessScene
from zugzwang.utils import show_attacks

puzzle = Puzzle(
    puzzleid='g4X2A',
    fen='6k1/5p2/2pN4/2P5/p6P/8/5P2/r4BK1 w - - 0 35',
    rating=1984,
    ratingdeviation=74,
    moves=['g1g2', 'a1f1', 'g2f1', 'a4a3'],
    themes=['crushing', 'endgame', 'sacrifice', 'short'],
)


def generate_narration(text: str, voice_id: str = "7vsrRG6Gg5O5RWIv2i0J"):
    return Narration(text, voice_id=voice_id)


scenes = []

board = chess.Board(puzzle.fen)

scene = ChessScene(
    name="Daily Chess Puzzle",
    narration=generate_narration("Can you spot the tactic?"),
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
    narration=generate_narration(f"{'White' if puzzle.orientation != chess.WHITE else 'Black'} plays {move_name}."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("We have an outside passed pawn, but it will be difficult to protect it from white's pieces."),
    board=board,
    arrows=[
        *show_attacks(board, chess.C4),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("White wants to unpin the bishop, and get a more active king, but this is a mistake."),
    board=board,
    arrows=[
        chess.svg.Arrow(chess.A1, chess.G1, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[1])
board.push(lastmove)
scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("We take the bishop."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[2])
board.push(lastmove)
scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("White is forced to react, the best move is to take the rook."),
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[3])
board.push(lastmove)
scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("We push our pawn, and the knight has no way to stop promotion. GG."),
    board=board,
    arrows=[
        *show_attacks(board, chess.C4),
        *show_attacks(board, chess.B5),
        chess.svg.Arrow(chess.A3, chess.A2, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
    generate_video(scenes, output_dir)
