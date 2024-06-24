import os
import requests

from dotenv import load_dotenv

load_dotenv()

CHUNK_SIZE = 1024
ELEVENLABS_API_KEY = os.environ["ELEVENLABS_API_KEY"]


def generate_audio_from_text(text: str, output_path: str, voice_id: str):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            # "style": 123,
            "use_speaker_boost": True
        },
        # "pronunciation_dictionary_locators": [
        #     {
        #         "pronunciation_dictionary_id": "<string>",
        #         "version_id": "<string>"
        #     }
        # ],
        # "seed": 123,
        # "previous_text": "<string>",
        # "next_text": "<string>",
        # "previous_request_ids": ["<string>"],
        # "next_request_ids": ["<string>"]
    }
    headers = {
        "accept": "audio/mpeg",
        "content-type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
    }
    response = requests.request("POST", url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Request failed: status_code = {response.status_code}, content = {response.content}")

    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
            f.write(chunk)
    return output_path


if __name__ == "__main__":
    text = "Hello, world!"
    voice_id = "uYkKk3J4lEp7IHQ8CLBi"
    output_path = os.path.join("data", "narrations", voice_id, "hello.mp3")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    generate_audio_from_text(text, output_path, voice_id)
