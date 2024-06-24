import os

from dotenv import load_dotenv
import requests

from zugzwang.models import Puzzle


load_dotenv()

RAPIDAPI_CHESS_PUZZLES_API_KEY = os.environ["RAPIDAPI_CHESS_PUZZLES_API_KEY"]
RAPIDAPI_CHESS_PUZZLES_API_HOST = os.environ["RAPIDAPI_CHESS_PUZZLES_API_HOST"]

url = f"https://{RAPIDAPI_CHESS_PUZZLES_API_HOST}/"
headers = {
    "x-rapidapi-key": RAPIDAPI_CHESS_PUZZLES_API_KEY,
    "x-rapidapi-host": RAPIDAPI_CHESS_PUZZLES_API_HOST,
}


def find_positions(rating, themes):
    querystring = {
        "rating": rating,
        "themesType": "ALL",
        "count": "10",
    }
    if themes:
        querystring["themes"] = "[" + ",".join([f'"{theme}"' for theme in themes]) + "]"

    response = requests.get(url, headers=headers, params=querystring)
    positions = response.json()['puzzles']
    puzzles = [Puzzle(**position) for position in positions]
    return puzzles


if __name__ == "__main__":
    puzzles = find_positions(rating=str(2000), themes=['crushing', 'sacrifice', 'short'])
    for puzzle in puzzles:
        print(puzzle)
        print()
