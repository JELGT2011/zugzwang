import copy
from dataclasses import dataclass, field
import hashlib
import os
from typing import Iterable, List, Optional, Tuple, Union

import chess
import chess.svg
import cairosvg
import moviepy
import moviepy.editor
import moviepy.audio.fx.all as afx
import moviepy.video.fx.all as vfx
from PIL import Image
import numpy as np

from zugzwang.elevenlabs import generate_audio_from_text

narrations_dir = os.path.join("data", "narrations")


@dataclass
class Puzzle:
    puzzleid: str
    fen: str
    rating: int
    ratingdeviation: int
    moves: List[str]
    themes: List[str]

    @property
    def difficulty(self):
        if self.rating < 1200:
            return "easy"
        elif self.rating < 1800:
            return "medium"
        elif self.rating < 2400:
            return "hard"
        elif self.rating < 3000:
            return "master"
        elif self.rating < 4000:
            return "grandmaster"
        else:
            return "?"

    @property
    def orientation(self):
        return chess.WHITE if self.fen.split()[1] == "b" else chess.BLACK


@dataclass
class Narration:
    text: str
    voice_id: str
    audio_path: str
    audio_hash: str

    def __init__(self, text: str, voice_id: str="EODKX28NbkUPd7QWJ7yr"):
        self.text = text
        self.voice_id = voice_id
        self.audio_hash = hashlib.sha256(text.encode()).hexdigest()
        self.audio_path = os.path.join(narrations_dir, voice_id, f"{self.audio_hash}.mp3")
        os.makedirs(os.path.dirname(self.audio_path), exist_ok=True)

        if not os.path.exists(self.audio_path):
            generate_audio_from_text(text, self.audio_path, voice_id)


@dataclass
class Scene:
    name: str
    narration: Narration
    media_filepath: str

    @property
    def video_filepath(self):
        return ""

    def generate_clip(self, id: str, output_dir: str, height: int, width: int, pause_duration: float=0.25):
        narration_clip = moviepy.editor.AudioFileClip(self.narration.audio_path)
        pause_clip = moviepy.editor.AudioClip(lambda t: 0, duration=pause_duration)
        audio_clip = moviepy.editor.concatenate_audioclips([narration_clip, pause_clip])

        image_clip = (moviepy.editor.ImageClip(self.media_filepath)
                        .fl_image(lambda image: np.array(Image.fromarray(image).convert('RGB')))  # sometimes the image is missing a channel (?)
                        # .fx(vfx.resize, newsize=(height, width))
                        .fx(vfx.crop, width=width, height=height)
                        .fx(vfx.margin, mar=32, opacity=0))
        title_clip = moviepy.editor.TextClip(self.name, fontsize=54, font="Bebas Neue Pro", color="white", bg_color="rgba(255, 0, 0, 0.5)", method="caption", size=(width, None))
        # caption_clip = moviepy.editor.TextClip(self.narration.text, fontsize=36, color="white", method="caption", size=(width, None))
        
        scene_clip = moviepy.editor.CompositeVideoClip(
            [
                image_clip.set_position("center", "center"),
                title_clip.set_position("top", "center"),
                # caption_clip.set_position("center", "center"),
            ],
            size=(width, height),
        )
        scene_clip = scene_clip.set_audio(audio_clip)
        scene_clip = scene_clip.set_duration(audio_clip.duration)
        scene_clip.write_videofile(os.path.join(output_dir, f"{id}.mp4"), fps=24)

        return scene_clip


@dataclass
class ChessScene:
    name: str
    narration: Narration
    board: chess.Board
    arrows: Iterable[Union[chess.svg.Arrow, Tuple[chess.Square, chess.Square]]]
    orientation: Optional[chess.Color]
    lastmove: Optional[chess.Move]

    def __init__(self, name, narration, board, arrows, orientation=chess.WHITE, lastmove=None):
        self.name = name
        self.narration = narration
        self.board = copy.deepcopy(board)
        self.arrows = arrows
        self.orientation = orientation
        self.lastmove = copy.deepcopy(lastmove)

    def generate_svg(self, size):
        svg = chess.svg.board(
            board=self.board,
            orientation=self.orientation,
            arrows=self.arrows,
            lastmove=self.lastmove,
            size=size,
            colors={
                "margin": "#000000",
                "outer border": "#000000",
            },
        )
        return svg
    
    def generate_clip(self, id: str, output_dir: str, height: int, width: int, pause_duration: float=0.25):
        svg_path = os.path.join(output_dir, f"{id}.png")
        svg = self.generate_svg(size=width - 64)
        cairosvg.svg2png(bytestring=svg, write_to=svg_path)

        narration_clip = moviepy.editor.AudioFileClip(self.narration.audio_path).fx(afx.audio_normalize).fx(afx.volumex, 1)
        pause_clip = moviepy.editor.AudioClip(lambda t: 0, duration=pause_duration)
        audio_clip = moviepy.editor.concatenate_audioclips([narration_clip, pause_clip])

        board_clip = moviepy.editor.ImageClip(svg_path)
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
        scene_clip.write_videofile(os.path.join(output_dir, f"{id}.mp4"), fps=24)

        return scene_clip


@dataclass
class Quiz:
    pass


@dataclass
class Walkthrough:
    pass
