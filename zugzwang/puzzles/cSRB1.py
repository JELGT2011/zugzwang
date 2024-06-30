import os

import chess
import moviepy.editor
import moviepy.audio.fx.all as afx

from zugzwang.annotations import show_attacked, show_attacks
from zugzwang.arrow import StyledArrow
from zugzwang.models.position import Position
from zugzwang.models.puzzle import Puzzle
from zugzwang.models.video_template import PuzzleVideo


puzzle = Puzzle(
    puzzleid='cSRB1',
    fen='1r2r1k1/2q1bppp/2np1n2/2p2N2/2P1PP2/pP2BB1P/P6K/1R1Q2R1 b - - 1 23',
    rating=1946,
    ratingdeviation=111,
    moves=['e7f8', 'g1g7', 'f8g7', 'd1g1'],
    themes=['clearance', 'crushing', 'middlegame', 'sacrifice', 'short'],
)

board = chess.Board(puzzle.fen)

height = 1920
width = 1080

title = "Daily Chess Puzzle"

output_dir = os.path.join("data", "puzzles", __file__.split("/")[-1].replace(".py", ""))
background_video = moviepy.editor.ColorClip(size=(width, height), color=(0, 0, 0), duration=1)
background_audio = moviepy.editor.AudioFileClip("data/music/dark_02.mp3").fx(afx.audio_normalize).fx(afx.volumex, 0.1)
video = PuzzleVideo(
    output_dir=output_dir,
    title=title,
    description="follow for daily puzzles, and leave a comment with suggestions!",
    tags=["chess", "chesspuzzle", "puzzle"],
    category="gaming",
    puzzle=puzzle,
    voice_id="7vsrRG6Gg5O5RWIv2i0J",
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
        Black reveals an attack on our pawn, and defends their own.
    """,
    board=board,
    arrows=[
        *show_attacked(board, chess.E4),
        *show_attacked(board, chess.G7),
    ],
)

video.add_scene(
    name=puzzle_name,
    narration="""
        But did they really defend it?
    """,
    board=board,
    arrows=[
        StyledArrow(chess.G1, chess.G8, color="yellow"),
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
            We take with check, sacrificing the rook.
        """,
        board=board,
        arrows=[
            *show_attacks(board, chess.G7),
            *show_attacked(board, chess.G7),
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
