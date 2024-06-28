import os

import chess
import moviepy.editor
import moviepy.audio.fx.all as afx

from zugzwang.annotations import show_attacked, show_attacks
from zugzwang.arrow import StyledArrow
from zugzwang.models import Position, Puzzle, PuzzleVideo


puzzle = Puzzle(
    puzzleid='ZPugM',
    fen='3r3r/1kp1qp2/1p4p1/4p3/Q1N1P3/2pP2PP/P3n1PK/R4R2 b - - 2 27',
    rating=2036,
    ratingdeviation=76,
    moves=['d8d3', 'c4a5', 'b6a5', 'a4b5'],
    themes=['crushing', 'middlegame', 'sacrifice', 'short'],
)

board = chess.Board(puzzle.fen)

height = 1920
width = 1080

title = "Daily Chess Puzzle"
description = "follow for daily puzzles, and leave a comment with suggestions!"
tags = ["chess", "chesspuzzle", "puzzle"]
category = "gaming"

voice_id = "7vsrRG6Gg5O5RWIv2i0J"
output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
background_video = moviepy.editor.ColorClip(size=(width, height), color=(0, 0, 0), duration=1)
background_audio = moviepy.editor.AudioFileClip("data/music/dark_02.mp3").fx(afx.audio_normalize).fx(afx.volumex, 0.1)
video = PuzzleVideo(
    output_dir=output_dir,
    title=title,
    description=description,
    tags=tags,
    category=category,
    puzzle=puzzle,
    voice_id=voice_id,
    background_video=background_video,
    background_music=background_audio,
)

video.add_scene(
    name=title,
    narration="""
        Can you find the crushing move?
    """,
    board=board,
    arrows=[],
)

lastmove = chess.Move.from_uci(puzzle.moves.pop(0))
board.push(lastmove)

player = puzzle.orientation
opponent = not player

puzzle_name = f"Puzzle: {puzzle.difficulty} ({puzzle.rating} elo)"

piece = board.piece_at(lastmove.to_square)
piece_name = chess.piece_name(piece.piece_type).lower()
move_name = f"{piece_name} to {chess.SQUARE_NAMES[lastmove.to_square]}"
video.add_scene(
    name=puzzle_name,
    narration=f"""
        {'White' if opponent == chess.WHITE else 'Black'} plays {move_name}.
    """,
    board=board,
    arrows=[],
)

video.add_scene(
    name=puzzle_name,
    narration="""
        Black is attacking our g3 pawn.
    """,
    board=board,
    arrows=[
        *show_attacked(board, chess.G3),
    ],
)

video.add_scene(
    name=puzzle_name,
    narration="""
        But the rook is now undefended, how can we exploit this?
    """,
    board=board,
    arrows=[
        StyledArrow(chess.D3, chess.D3, color="yellow"),
    ],
)

# lastmove = chess.Move.from_uci(puzzle.moves.pop(0))
# board.push(lastmove)
# piece = board.piece_at(lastmove.to_square)
# piece_name = chess.piece_name(piece.piece_type).lower()
# move_name = f"{piece_name.capitalize()} to {chess.SQUARE_NAMES[lastmove.to_square]}"

with Position(board, chess.Move.from_uci(puzzle.moves.pop(0))) as board:
    video.add_scene(
        name=puzzle_name,
        narration=f"""
            Let's go with the most forcing option, checking the enemy king, and it has no good squares to go to.
        """,
        board=board,
        arrows=[
            *show_attacks(board, chess.A5),
        ],
    )

    with Position(board, chess.Move.from_uci(puzzle.moves.pop(0))) as board:
        video.add_scene(
            name=puzzle_name,
            narration=f"""
                Taking it seems like the obvious choice, but it's not great.
            """,
            board=board,
            arrows=[],
        )

        with Position(board, chess.Move.from_uci(puzzle.moves.pop(0))) as board:
            video.add_scene(
                name=puzzle_name,
                narration=f"""
                    We can give a check and pick up the undefended rook.
                """,
                board=board,
                arrows=[
                    *show_attacks(board, chess.B5, max_arrows=2),
                ],
            )
        
    video.add_scene(
        name=puzzle_name,
        narration=f"""
            Black isn't forced to take the knight, but the alternatives are much worse.
        """,
        board=board,
        arrows=[],
    )

    with Position(board, chess.Move(chess.B7, chess.A8)) as board:
        video.add_scene(
            name=puzzle_name,
            narration=f"""
                Moving to the half-open A-file, or to B8 allows a discovered check or a fork with the knight.
            """,
            board=board,
            arrows=[
                StyledArrow(chess.A4, chess.A8, color="yellow"),
                StyledArrow(chess.A5, chess.C6, color="yellow"),
            ],
            pause_duration=0,
        )

        with Position(board, chess.Move(chess.A5, chess.C6)) as board:
            video.add_scene(
                name=puzzle_name,
                narration=f"""
                    And we win a free queen.
                """,
                board=board,
                arrows=[
                    StyledArrow(chess.A4, chess.A8, color="yellow"),
                    StyledArrow(chess.C6, chess.E7, color="yellow"),
                ],
            )

    with Position(board, chess.Move(chess.B7, chess.C8)) as board:
        video.add_scene(
            name=puzzle_name,
            narration=f"""
                But even avoiding the immediate check still allows the knight to move with tempo.
            """,
            board=board,
            arrows=[
                StyledArrow(chess.A5, chess.C6, color="yellow"),
            ],
            pause_duration=0,
        )

        with Position(board, chess.Move(chess.A5, chess.C6)) as board:
            video.add_scene(
                name=puzzle_name,
                narration=f"""
                    And we'll have an attack.
                """,
                board=board,
                arrows=[
                    StyledArrow(chess.A4, chess.A6, color="yellow"),
                    StyledArrow(chess.A6, chess.C8, color="yellow"),
                    StyledArrow(chess.C6, chess.E7, color="yellow"),
                ],
            )

video.add_scene(
    name="Follow For More",
    narration=f"""
        Follow for daily puzzles.
    """,
    board=board,
    arrows=[],
    pause_duration=0.5,
)


if __name__ == '__main__':
    video.generate(upload=False)
