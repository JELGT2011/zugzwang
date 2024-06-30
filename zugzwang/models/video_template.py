from dataclasses import dataclass
import hashlib
import os
from typing import List

import chess
import chess.svg
import moviepy
import moviepy.editor
import moviepy.audio.fx.all as afx
import moviepy.video.fx.all as vfx

from zugzwang.models.narration import Narration
from zugzwang.models.puzzle import Puzzle
from zugzwang.models.scene import Scene
from zugzwang.youtube import youtube_upload


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
    scenes: List[Scene]

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

    def add_scene(self, name: str, narration: str, **kwargs) -> Scene:
        scene = Scene(name=name, narration=Narration(narration, self.voice_id), output_dir=self.output_dir, orientation=self.puzzle.orientation, **kwargs)
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
