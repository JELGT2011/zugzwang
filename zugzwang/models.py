import copy
from dataclasses import dataclass, field
import hashlib
import inspect
import os
from typing import Iterable, List, Optional, Set, Tuple, Union

import chess
import chess.svg
import cairosvg
import moviepy
import moviepy.editor
import moviepy.audio.fx.all as afx
import moviepy.video.fx.all as vfx

from zugzwang.arrow import StyledArrow
from zugzwang.elevenlabs import generate_audio_from_text
from zugzwang.youtube import youtube_upload

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

    @property
    def audio_hash(self):
        return hashlib.sha256(self.text.encode()).hexdigest()

    @property
    def audio_path(self):
        return os.path.join(narrations_dir, self.voice_id, f"{self.audio_hash}.mp3")

    def __init__(self, text: str, voice_id: str):
        self.text = inspect.cleandoc(text.rstrip().lstrip())
        self.voice_id = voice_id

    def generate(self) -> moviepy.editor.AudioClip:
        os.makedirs(os.path.dirname(self.audio_path), exist_ok=True)

        if not os.path.exists(self.audio_path):
            generate_audio_from_text(self.text, self.audio_path, self.voice_id)
        
        narration_clip = moviepy.editor.AudioFileClip(self.audio_path).fx(afx.audio_normalize).fx(afx.volumex, 1)
        return narration_clip


# @dataclass
# class Scene:
#     name: str
#     narration: Narration
#     media_filepath: str

#     @property
#     def video_filepath(self):
#         return ""

#     def generate_clip(self, output_dir: str, height: int, width: int, pause_duration: float=0.25):
#         hash_key = f"{self.narration.audio_hash}-{os.path.basename(self.media_filepath)}"
#         id = hashlib.sha256(hash_key.encode()).hexdigest()
#         narration_clip = moviepy.editor.AudioFileClip(self.narration.audio_path)
#         pause_clip = moviepy.editor.AudioClip(lambda t: 0, duration=pause_duration)
#         audio_clip = moviepy.editor.concatenate_audioclips([narration_clip, pause_clip])

#         image_clip = (moviepy.editor.ImageClip(self.media_filepath)
#                         .fl_image(lambda image: np.array(Image.fromarray(image).convert('RGB')))  # sometimes the image is missing a channel (?)
#                         # .fx(vfx.resize, newsize=(height, width))
#                         .fx(vfx.crop, width=width, height=height)
#                         .fx(vfx.margin, mar=32, opacity=0))
#         title_clip = moviepy.editor.TextClip(self.name, fontsize=54, font="Bebas Neue Pro", color="white", bg_color="rgba(255, 0, 0, 0.5)", method="caption", size=(width, None))
#         # caption_clip = moviepy.editor.TextClip(self.narration.text, fontsize=36, color="white", method="caption", size=(width, None))
        
#         scene_clip = moviepy.editor.CompositeVideoClip(
#             [
#                 image_clip.set_position("center", "center"),
#                 title_clip.set_position("top", "center"),
#                 # caption_clip.set_position("center", "center"),
#             ],
#             size=(width, height),
#         )
#         scene_clip = scene_clip.set_audio(audio_clip)
#         scene_clip = scene_clip.set_duration(audio_clip.duration)
#         scene_clip.write_videofile(os.path.join(output_dir, f"{id}.mp4"), fps=24)

#         return scene_clip

@dataclass
class Position:
    board: chess.Board
    move: chess.Move

    def __enter__(self):
        self.board.push(self.move)
        return self.board
    
    def __exit__(self, exc_type, exc_value, traceback):
        self.board.pop()


@dataclass
class ChessScene:
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


@dataclass
class PuzzleVideo:
    output_dir: str
    title: str
    description: str
    tags: List[str]
    category: str
    puzzle: Puzzle
    voice_id: str
    background_video: moviepy.editor.VideoClip
    background_music: moviepy.editor.AudioClip
    scenes: List[ChessScene]

    @property
    def video_hash(self):
        hash_key = "-".join([scene.video_hash for scene in self.scenes])
        return hashlib.sha256(hash_key.encode()).hexdigest()
    
    @property
    def video_path(self):
        return os.path.join(self.output_dir, f"{self.video_hash}.mp4")

    def __init__(self, output_dir: str, title: str, description: str, tags: List[str], category: str, puzzle: Puzzle, voice_id: str, background_video: moviepy.editor.VideoClip, background_music: moviepy.editor.AudioClip):
        self.output_dir = output_dir
        self.title = title
        self.description = description
        self.tags = tags
        self.category = category
        self.puzzle = puzzle
        self.voice_id = voice_id
        self.background_video = background_video
        self.background_music = background_music
        self.scenes = list()
        os.makedirs(self.output_dir, exist_ok=True)

    def add_scene(self, name: str, narration: str, **kwargs) -> ChessScene:
        scene = ChessScene(name=name, narration=Narration(narration, self.voice_id), output_dir=self.output_dir, orientation=self.puzzle.orientation, **kwargs)
        self.scenes.append(scene)
        return scene
    
    def generate(self, upload: bool = False) -> moviepy.editor.VideoClip:
        if upload and os.path.exists(self.video_path):
            youtube_upload(self.video_path, self.title, self.description, self.tags, self.category, privacy_status="public")

        if not os.path.exists(self.video_path):
            clips = []
            for scene in self.scenes:
                clip = scene.generate(self.background_video.h, self.background_video.w)
                clips.append(clip)

            narration_audio = moviepy.editor.concatenate_audioclips([clip.audio for clip in clips])
            background_music = self.background_music.audio_loop(duration=narration_audio.duration)
            final_audio = moviepy.editor.CompositeAudioClip([background_music.set_duration(narration_audio.duration), narration_audio])
            
            video = moviepy.editor.concatenate_videoclips(clips)
            video = moviepy.editor.CompositeVideoClip([self.background_video.set_duration(video.duration), video], size=(self.background_video.w, self.background_video.h))
            final_video = video.set_audio(final_audio)

            final_video.write_videofile(self.video_path, fps=24)
            
            # also write to "final.mp4" for easy access
            final_video.write_videofile(os.path.join(self.output_dir, "final.mp4"), fps=24)
        
        final_video = moviepy.editor.VideoFileClip(self.video_path)
        return final_video
