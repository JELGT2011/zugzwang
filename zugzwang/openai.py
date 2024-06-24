import os
from typing import List

from openai import Client
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ["OPENAI_API_KEY"]

client = Client(api_key=API_KEY)


def generate_text(prompt: str, text: str, model: str = 'gpt-4o'):
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": text},
        ],
    )
    return completion.choices[0].message['content']


def generate_image(prompt: str, text: str, model: str = 'dall-e-3') -> str:
    return generate_images(prompt, text, model=model)[0]


def generate_images(prompt: str, text: str, n: int = 1, model: str = 'dall-e-3') -> List[str]:
    try:
        image = client.images.generate(
            model=model,
            prompt=f"{prompt} {text}",
            n=n,
        )
        urls = [data.url for data in image.data]
        return urls
    except Exception as e:
        print(e)
        return [""]
