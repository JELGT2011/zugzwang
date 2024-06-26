import inspect
import os

import chess
import chess.svg
import moviepy.audio.fx.all as afx

from zugzwang.models import Narration, Puzzle, ChessScene
from zugzwang.utils import show_attacked, show_attacks

puzzle = Puzzle(
    puzzleid='Phosq',
    fen='r1b1kr2/ppq2p2/2pp3p/8/3b2n1/2NB1RB1/P1PQ2PP/5R1K b q - 1 21',
    rating=1965,
    ratingdeviation=123,
    moves=['c8e6', 'c3b5', 'c6b5', 'd3b5'],
    themes=['crushing', 'middlegame', 'sacrifice', 'short'],
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
        Can you find the crushing move?
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
        Black develops, prevents any checks on the E file, and prepares to queen-side castle.
    """,
    board=board,
    arrows=[
        chess.svg.Arrow(chess.E1, chess.E8, color="yellow"),
        chess.svg.Arrow(chess.E8, chess.C8, color="yellow"),  # TODO: show a better way to represent castle
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

add_scene(
    name=puzzle_name,
    narration="""
        Black's dark-square bishop is undefended, and their king is still in the center, let's open up the position.
    """,
    board=board,
    arrows=[
        chess.svg.Arrow(chess.D2, chess.D4, color="yellow"),
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
        {move_name}. We attack the queen and bishop, and black can no longer simply trade it for the knight.
    """,
    board=board,
    arrows=[
        *show_attacked(board, chess.B5),
        *show_attacks(board, chess.B5, max_arrows=2),
        chess.svg.Arrow(chess.C3, chess.C3, color="yellow"),
    ],
    orientation=puzzle.orientation,
    lastmove=lastmove,
)

lastmove = chess.Move.from_uci(puzzle.moves[2])
board.push(lastmove)
add_scene(
    name=puzzle_name,
    narration=f"""
        Black cannot move the queen and defend the bishop in one move, so the best option is to take it.
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
        We take the pawn with check, finally revealing our attack to win back the piece. Black's king is exposed and the position is starting to open. GG.
    """,
    board=board,
    arrows=[
        *show_attacked(board, chess.E8),
        *show_attacked(board, chess.D4),
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
    background_video = moviepy.editor.ColorClip(size=(width, height), color=(0, 0, 0), duration=1)
    background_audio = moviepy.editor.AudioFileClip("data/music/dark_02.mp3").fx(afx.audio_normalize).fx(afx.volumex, 0.1)

    generate_video(scenes, output_dir, background_video, background_audio)
