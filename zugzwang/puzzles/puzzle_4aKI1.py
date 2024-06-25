import inspect
import os

import chess
import chess.svg
import numpy as np
from PIL import Image

from zugzwang.models import Narration, Puzzle, ChessScene
from zugzwang.utils import show_attacks

puzzle = Puzzle(
    puzzleid='4aKI1',
    fen='1r3k2/3R1ppp/p6P/4PpP1/P3pP2/8/8/6K1 b - - 0 31',
    rating=2040,
    ratingdeviation=88,
    moves=['f8e8', 'd7b7', 'b8b7', 'h6g7'],
    themes=['advancedPawn', 'crushing', 'endgame', 'rookEndgame', 'sacrifice', 'short'],
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
        What are you willing to sacrifice?
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

add_scene(
    name=puzzle_name,
    narration="""
        We have an advanced pawn 2 moves away from promoting, but black's rook covers the 8th rank.
    """,
    board=board,
    arrows=[
        *show_attacks(board, chess.G7),
        chess.svg.Arrow(chess.B8, chess.G8, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

add_scene(
    name=puzzle_name,
    narration="""
        Our rook is under attack, we can move it and force black to respond.
    """,
    board=board,
    arrows=[
        *show_attacks(board, chess.D7),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[1])
board.push(lastmove)
add_scene(
    name=puzzle_name,
    narration="""
        Rook to b7. Black cannot save the rook and prevent our pawn from promotion.
    """,
    board=board,
    arrows=[
        *show_attacks(board, chess.B7),
        *show_attacks(board, chess.G7),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[2])
board.push(lastmove)
add_scene(
    name=puzzle_name,
    narration="""
        Black takes the undefended rook.
    """,
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[3])
board.push(lastmove)
add_scene(
    name=puzzle_name,
    narration="""
        We take the pawn, and black cannot stop promotion. GG.
    """,
    board=board,
    arrows=[
        *show_attacks(board, chess.F8),
        chess.svg.Arrow(chess.G7, chess.G8, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)


if __name__ == '__main__':
    import moviepy.editor
    from zugzwang.utils import generate_video

    height = 1920
    width = 1080
    output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
    # background_video = moviepy.editor.VideoFileClip("data/backgrounds/euphoria-inspired-mood-lights.mp4", target_resolution=(height, width), audio=False)
    background_video = moviepy.editor.ColorClip(size=(width, height), color=(0, 0, 0), duration=1)
    background_audio = moviepy.editor.AudioFileClip("data/music/dark.mp4")

    generate_video(scenes, output_dir, background_video, background_audio)
