import os
from typing import List

import chess
import chess.svg

import moviepy
import moviepy.editor
from moviepy.audio.fx.volumex import volumex

from zugzwang.models import Scene



def show_attacks(board, square) -> List[chess.svg.Arrow]:
    arrows = list()
    attackers = board.attackers(chess.BLACK if board.turn == chess.WHITE else chess.WHITE, square)
    defenders = board.attackers(chess.WHITE if board.turn == chess.WHITE else chess.BLACK, square)
    for attacker in attackers:
        arrows.append(chess.svg.Arrow(attacker, square, color="green"))
    for defender in defenders:
        arrows.append(chess.svg.Arrow(defender, square, color="red"))
    
    return arrows


def generate_video(
        scenes: List[Scene],
        output_dir: str,
        background_video: moviepy.editor.VideoClip,
        background_music: moviepy.editor.AudioClip,
        pause_duration: float=0.25,
    ):
    os.makedirs(output_dir, exist_ok=True)

    clips = []
    for i, scene in enumerate(scenes):
        clip = scene.generate_clip(i, output_dir, background_video.h, background_video.w, pause_duration)
        clips.append(clip)

    narration_audio = moviepy.editor.concatenate_audioclips([clip.audio for clip in clips])
    background_music = background_music.fx(volumex, 0.5).audio_loop(duration=narration_audio.duration)
    final_audio = moviepy.editor.CompositeAudioClip([background_music.set_duration(narration_audio.duration), narration_audio])
    
    video = moviepy.editor.concatenate_videoclips(clips)
    video = moviepy.editor.CompositeVideoClip([background_video.set_duration(video.duration), video], size=(background_video.w, background_video.h))
    final_video = video.set_audio(final_audio)
    final_video.write_videofile(os.path.join(output_dir, "final.mp4"), fps=24)
