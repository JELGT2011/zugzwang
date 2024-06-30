from dataclasses import dataclass
from typing import List

import chess


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
