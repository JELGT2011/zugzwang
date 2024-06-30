from dataclasses import dataclass
import hashlib
import inspect
import os

import moviepy
import moviepy.editor
import moviepy.audio.fx.all as afx

from zugzwang.elevenlabs import generate_audio_from_text

narrations_dir = os.path.join("data", "narrations")


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
