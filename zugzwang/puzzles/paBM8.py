import inspect
import os

import chess
import chess.svg
import moviepy.editor
import moviepy.audio.fx.all as afx

from zugzwang.youtube import youtube_upload
from zugzwang.models import Narration, Puzzle, ChessScene
from zugzwang.utils import show_attacked, show_attacks, generate_video

puzzle = Puzzle(
    puzzleid='paBM8',
    fen='5qnr/Rb1k4/1p2ppQ1/2p2N1p/8/2PP4/5PPP/6K1 b - - 3 27',
    rating=2078,
    ratingdeviation=78,
    moves=['d7c6', 'f5d4', 'c5d4', 'g6e4'],
    themes=['clearance', 'crushing', 'middlegame', 'sacrifice', 'short'],
)

voice_id = "7vsrRG6Gg5O5RWIv2i0J"
scenes = []
board = chess.Board(puzzle.fen)

title = "Daily Chess Puzzle"
description = "follow for daily puzzles, and leave a comment with suggestions!"
tags = ["chess", "chesspuzzle", "puzzle"]
category = "gaming"

height = 1920
width = 1080
output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
output_file = os.path.join(output_dir, "final.mp4")
background_video = moviepy.editor.ColorClip(size=(width, height), color=(0, 0, 0), duration=1)
background_audio = moviepy.editor.AudioFileClip("data/music/dark_02.mp3").fx(afx.audio_normalize).fx(afx.volumex, 0.1)


def get_narration(text: str):
    text = text.rstrip().lstrip()
    text = inspect.cleandoc(text)
    return Narration(text, voice_id=voice_id)


def add_scene(name: str, narration: str, **kwargs) -> ChessScene:
    scene = ChessScene(name=name, narration=get_narration(narration), **kwargs)
    scenes.append(scene)
    return scene


add_scene(
    name=title,
    narration="""
        Can you find the crushing move?
    """,
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
)

lastmove = chess.Move.from_uci(puzzle.moves[0])
board.push(lastmove)

player = puzzle.orientation
opponent = not player

puzzle_name = f"Puzzle: {puzzle.difficulty} ({puzzle.rating} elo)"
piece = board.piece_at(lastmove.to_square)
piece_name = chess.piece_name(piece.piece_type).lower()
move_name = f"{piece_name} to {chess.SQUARE_NAMES[lastmove.to_square]}"
add_scene(
    name=puzzle_name,
    narration=f"""
        {'White' if opponent == chess.WHITE else 'Black'} plays {move_name}.
    """,
    board=board,
    arrows=[],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

add_scene(
    name=puzzle_name,
    narration="""
        Black defends the bishop with the king, but the king is the worst defender because it's the most valuable piece.
    """,
    board=board,
    arrows=[
        *show_attacked(board, chess.B7),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

add_scene(
    name=puzzle_name,
    narration="""
        Our knight is under attack, and it doesn't have any particularly good squares.
    """,
    board=board,
    arrows=[
        *show_attacked(board, chess.F5),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[1])
board.push(lastmove)
piece = board.piece_at(lastmove.to_square)
piece_name = chess.piece_name(piece.piece_type).lower()
move_name = f"{piece_name.capitalize()} to {chess.SQUARE_NAMES[lastmove.to_square]}"
add_scene(
    name=puzzle_name,
    narration=f"""
        Let's go with the most forcing option, checking the enemy king, and giving our queen access to e4.
    """,
    board=board,
    arrows=[
        *show_attacked(board, chess.C6),
        chess.svg.Arrow(chess.G6, chess.E4, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[2])
board.push(lastmove)
add_scene(
    name=puzzle_name,
    narration=f"""
        Black should obviously take the knight.
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
        We give a check and will at least win back the piece, depending on black's response.
    """,
    board=board,
    arrows=[
        *show_attacked(board, chess.C6),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)


if __name__ == '__main__':
    # TODO: generate videos as hashes
    # TODO: upload to youtube if the generated video already exists (we are re-running a successful generation)
    generate_video(scenes, output_dir, background_video, background_audio)
    # youtube_upload(output_file, title, description, tags, category, privacy_status="public")
