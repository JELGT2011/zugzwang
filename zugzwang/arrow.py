import chess
import chess.svg


class StyledArrow(chess.svg.Arrow):

    def _pgn_segment(self, start, end):
        if self.color == "red":
            color = "R"
        elif self.color == "yellow":
            color = "Y"
        elif self.color == "blue":
            color = "B"
        else:
            color = "G"

        return f"{color}{chess.SQUARE_NAMES[start]}{chess.SQUARE_NAMES[end]}"

    def pgn(self):
        """
        Returns the arrow in the format used by ``[%csl ...]`` and
        ``[%cal ...]`` PGN annotations, e.g., ``Ga1`` or ``Ya2h2``.

        Colors other than ``red``, ``yellow``, and ``blue`` default to green.
        """
        tail_row, tail_col = divmod(self.tail, 8)
        head_row, head_col = divmod(self.head, 8)

        if abs(tail_row - head_row) != 2 and abs(tail_col - head_col) != 2:
            # Not a knight's move
            return self._pgn_segment(self.tail, self.head)

        # Calculate intermediate square for knight's move
        intermediate_row = tail_row + 2 * (head_row - tail_row) // abs(head_row - tail_row)
        intermediate_col = tail_col + 2 * (head_col - tail_col) // abs(head_col - tail_col)
        intermediate = intermediate_row * 8 + intermediate_col

        # Return two segments for knight's move
        return self._pgn_segment(self.tail, intermediate) + self._pgn_segment(intermediate, self.head)
    
    def __lt__(self, other: "StyledArrow"):
        if not isinstance(other, StyledArrow):
            return NotImplemented
        
        return self.value < other.value
    
    @property
    def value(self):
        return self.head + self.tail
