from datetime import datetime, timedelta
from typing import List, Union
from zoneinfo import ZoneInfo

from simple_youtube_api.Channel import Channel
from simple_youtube_api.LocalVideo import LocalVideo

GOOGLE_CLIENT_SECRETS = "google-client-secrets.json"

def find_next_best_upload_time() -> str:
  now = datetime.now(tz=ZoneInfo('America/Los_Angeles'))
  
  tomorrow = now + timedelta(days=1)
  publish = tomorrow.replace(hour=12, minute=0, second=0, microsecond=0)

  publish = publish.astimezone(ZoneInfo('UTC'))
  return publish.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def youtube_upload(
    video_filepath: str,
    title: str,
    description: str,
    tags: List[str],
    category: Union[int, str],
    license: str = "creativeCommon",
    privacy_status: str = "private",
  ):

  channel = Channel()
  channel.login(GOOGLE_CLIENT_SECRETS, "credentials.storage")

  video = LocalVideo(file_path=video_filepath)

  video.set_title(title)
  video.set_description(description)
  video.set_tags(tags)
  video.set_category(category)
  video.set_default_language("en-US")

  video.set_embeddable(True)
  video.set_license(license)
  video.set_privacy_status(privacy_status)
  video.set_public_stats_viewable(True)

  video.set_publish_at(find_next_best_upload_time())

  # video.set_thumbnail_path('test_thumb.png')

  video = channel.upload_video(video)
  print(f"video successfully uploaded. id = {video.id}")

  video.like()


if __name__ == "__main__":
  video_filepath = "./data/puzzles/puzzle_4aKI1/final.mp4"
  title = "What are you willing to sacrifice?"
  description = "follow for daily puzzles, and leave a comment with suggestions!"
  tags = ["chess", "chesspuzzle", "puzzle"]
  category = "education"
  youtube_upload(video_filepath, title, description, tags, category)
