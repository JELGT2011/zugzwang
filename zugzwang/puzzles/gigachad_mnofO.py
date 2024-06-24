import os
import chess
import chess.svg

from zugzwang.models import Narration, Puzzle, ChessScene
from zugzwang.utils import show_attacks

puzzle = Puzzle(
    puzzleid='mnofO',
    fen='4r3/5pkp/8/b1P5/3RBPP1/1p4P1/8/6K1 w - - 0 39',
    rating=2084,
    ratingdeviation=87,
    moves=['g1g2', 'e8e4', 'd4e4', 'b3b2'],
    themes=['advancedPawn', 'crushing', 'endgame', 'sacrifice', 'short'],
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
    narration=generate_narration("We have a passed pawn on b3, but white controls the promotion square with the bishop."),
    board=board,
    arrows=[
        *show_attacks(board, chess.B1),
        chess.svg.Arrow(chess.B3, chess.B1, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[1])
board.push(lastmove)
scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("So we take it, and white is lost."),
    board=board,
    arrows=[
        *show_attacks(board, chess.E4),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

sideline = board.copy()
sideline_move = chess.Move.from_uci("d4d1")
sideline.push(sideline_move)
scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("White cannot stop our pawn push. If they try to move the rook back, we chase."),
    board=sideline,
    arrows=[
        *show_attacks(sideline, chess.E1),
    ],
    orientation=puzzle.orientation,
    lastmove=sideline_move,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[2])
board.push(lastmove)
scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("So the best move is to take our rook."),
    board=board,
    arrows=[
        *show_attacks(board, chess.B4),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)

lastmove = chess.Move.from_uci(puzzle.moves[3])
board.push(lastmove)
scene = ChessScene(
    name=puzzle_name,
    narration=generate_narration("We push our pawn, and the rook has no way to stop promotion. GG."),
    board=board,
    arrows=[
        *show_attacks(board, chess.E1),
        *show_attacks(board, chess.B4),
        chess.svg.Arrow(chess.B2, chess.B1, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)
scenes.append(scene)


if __name__ == '__main__':
    from zugzwang.utils import generate_video
    output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
    generate_video(scenes, output_dir)
