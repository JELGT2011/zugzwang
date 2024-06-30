import copy
from dataclasses import dataclass
import hashlib
import os
from typing import List

import chess
import chess.svg
import cairosvg
import moviepy
import moviepy.editor

from zugzwang.arrow import StyledArrow
from zugzwang.models.narration import Narration


@dataclass
class Scene:
    name: str
    narration: Narration
    board: chess.Board
    arrows: List[StyledArrow]
    orientation: chess.Color
    output_dir: str
    pause_duration: float = 0.25

    @property
    def video_hash(self):
        hash_key = f"{self.narration.audio_hash}-{self.board.fen()}-{sorted(self.arrows)}"
        return hashlib.sha256(hash_key.encode()).hexdigest()

    @property
    def video_path(self):
        return os.path.join(self.output_dir, f"{self.video_hash}.mp4")

    def __init__(self, name, narration, board, arrows, orientation, output_dir, pause_duration=0.25):
        self.name = name
        self.narration = narration
        self.board = copy.deepcopy(board)
        self.arrows = arrows
        self.orientation = orientation
        self.output_dir = output_dir
        self.pause_duration = pause_duration
        os.makedirs(self.output_dir, exist_ok=True)

    def generate(self, height: int, width: int) -> moviepy.editor.VideoClip:
        if not os.path.exists(self.video_path):
            narration_clip = self.narration.generate()
            pause_clip = moviepy.editor.AudioClip(lambda t: 0, duration=self.pause_duration)
            audio_clip = moviepy.editor.concatenate_audioclips([narration_clip, pause_clip])

            board_clip = self._generate_board_clip(size=width - 64)
            title_clip = moviepy.editor.TextClip(self.name, fontsize=54, font="Bebas Neue Pro", color="white", bg_color="black", method="caption", size=(width, None))
            caption_clip = moviepy.editor.TextClip(self.narration.text, fontsize=36, font="Bebas Neue Pro", color="white", bg_color="black", method="caption", size=(width, None))
            scene_clip = moviepy.editor.CompositeVideoClip(
                [
                    board_clip.set_position((64 / 2, 64)),
                    title_clip.set_position((0, 64 + width)),
                    caption_clip.set_position((0, 64 + width + 64 + title_clip.size[1] + 64)),
                ],
                size=(width, height),
            )
            scene_clip = scene_clip.set_audio(audio_clip)
            scene_clip = scene_clip.set_duration(audio_clip.duration)
            scene_clip.write_videofile(self.video_path, fps=24)

        scene_clip = moviepy.editor.VideoFileClip(self.video_path)
        return scene_clip
    
    def _generate_board_clip(self, size) -> moviepy.editor.ImageClip:
        hash_key = f"{self.board.fen()}-{sorted(self.arrows)}"
        id = hashlib.sha256(hash_key.encode()).hexdigest()
        board_clip_path = os.path.join(self.output_dir, f"{id}.png")

        if not os.path.exists(board_clip_path):
            svg = chess.svg.board(
                board=self.board,
                orientation=self.orientation,
                arrows=self.arrows,
                lastmove=self.board.move_stack[-1] if self.board.move_stack else None,
                size=size,
                colors={
                    "margin": "#000000",
                    "outer border": "#000000",
                },
            )
            cairosvg.svg2png(bytestring=svg, write_to=board_clip_path)

        board_clip = moviepy.editor.ImageClip(board_clip_path)
        return board_clip
