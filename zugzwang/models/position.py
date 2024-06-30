from dataclasses import dataclass

import chess


@dataclass
class Position:
    board: chess.Board
    move: chess.Move

    def __enter__(self):
        self.board.push(self.move)
        return self.board
    
    def __exit__(self, exc_type, exc_value, traceback):
        self.board.pop()
