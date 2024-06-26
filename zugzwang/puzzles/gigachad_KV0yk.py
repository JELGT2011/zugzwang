import inspect
import os

import chess
import chess.svg
import numpy as np
from PIL import Image

from zugzwang.models import Narration, Puzzle, ChessScene
from zugzwang.utils import show_attacked

puzzle = Puzzle(
    puzzleid='KV0yk',
    fen='3r1rk1/1b3pp1/p6p/1p2q3/2pR2N1/2P1P2P/PP2Q1P1/5RK1 b - - 1 22',
    rating=2057,
    ratingdeviation=75,
    moves=['e5g3', 'g4h6', 'g7h6', 'd4g4'],
    themes=['clearance', 'crushing', 'kingsideAttack', 'master', 'middlegame', 'sacrifice', 'short'],
)

voice_id = "7vsrRG6Gg5O5RWIv2i0J"
scenes = []
board = chess.Board(puzzle.fen)


def get_narration(text: str):
    text = text.rstrip().lstrip()
    text = inspect.cleandoc(text)
    return Narration(text, voice_id=voice_id)


def add_scene(name: str, narration: str, **kwargs) -> ChessScene:
    scene = ChessScene(name=name, narration=get_narration(narration), **kwargs)
    scenes.append(scene)
    return scene


add_scene(
    name="Daily Chess Puzzle",
    narration="""
        Can you spot the tactic?
    """,
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
)

lastmove = chess.Move.from_uci(puzzle.moves[0])
board.push(lastmove)

puzzle_name = f"Puzzle: {puzzle.difficulty} ({puzzle.rating} elo)"
piece = board.piece_at(lastmove.to_square)
piece_name = chess.piece_name(piece.piece_type).lower()
move_name = f"{piece_name} to {chess.SQUARE_NAMES[lastmove.to_square]}"

add_scene(
    name=puzzle_name,
    narration=f"""
        {'White' if puzzle.orientation != chess.WHITE else 'Black'} plays {move_name}.
    """,
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

# add_scene(
#     name=puzzle_name,
#     narration="""
#         We have an outside passed pawn, but it will be difficult to protect it from white's pieces.
#     """,
#     board=board,
#     arrows=[
#         *show_attacks(board, chess.C4),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )

# add_scene(
#     name=puzzle_name,
#     narration="""
#         White wants to unpin the bishop, and get a more active king, but this is a mistake.
#     """,
#     board=board,
#     arrows=[
#         chess.svg.Arrow(chess.A1, chess.G1, color="yellow"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )

# lastmove = chess.Move.from_uci(puzzle.moves[1])
# board.push(lastmove)
# add_scene(
#     name=puzzle_name,
#     narration="""
#         We take the bishop.
#     """,
#     board=board,
#     arrows=[],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )

# lastmove = chess.Move.from_uci(puzzle.moves[2])
# board.push(lastmove)
# add_scene(
#     name=puzzle_name,
#     narration="""
#         White is forced to react, the best move is to take the rook.
#     """,
#     board=board,
#     arrows=[],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )

# lastmove = chess.Move.from_uci(puzzle.moves[3])
# board.push(lastmove)
# add_scene(
#     name=puzzle_name,
#     narration="""
#         We push our pawn, and the knight has no way to stop promotion. GG.
#     """,
#     board=board,
#     arrows=[
#         *show_attacks(board, chess.C4),
#         *show_attacks(board, chess.B5),
#         chess.svg.Arrow(chess.A3, chess.A2, color="yellow"),
#     ],
#     orientation=puzzle.orientation,
#     lastmove=lastmove,
# )


if __name__ == '__main__':
    import moviepy.editor
    from zugzwang.utils import generate_video

    height = 1920
    width = 1080
    output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
    background_video = moviepy.editor.ColorClip(size=(height, width), col=(0, 0, 0))
    background_audio = moviepy.editor.AudioFileClip("data/music/dark.mp4")

    generate_video(scenes[:1], output_dir, background_video, background_audio)
