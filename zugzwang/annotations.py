from typing import List

import chess

from zugzwang.arrow import StyledArrow


def show_attacked(board, square) -> List[chess.svg.Arrow]:
    arrows = list()
    attacked = board.piece_at(square)

    attackers = board.attackers(chess.BLACK if board.turn == chess.WHITE else chess.WHITE, square)
    defenders = board.attackers(chess.WHITE if board.turn == chess.WHITE else chess.BLACK, square)

    for attacker in attackers:
        arrows.append(StyledArrow(attacker, square, color="green"))

    for defender in defenders:
        # do not show pieces defending their king
        if attacked and attacked.piece_type == chess.KING:
            continue
        
        arrows.append(StyledArrow(defender, square, color="red"))
    
    return arrows


def show_attacks(board, square, max_arrows: int = 3) -> List[StyledArrow]:
    arrows = list()
    attackers = board.attacks(square)

    # do not show empty squares
    attackers = [attacker for attacker in attackers if board.piece_at(attacker) is not None]

    # sort attacker pieces by priority
    attackers = sorted(attackers, key=lambda attacker: board.piece_at(attacker).piece_type, reverse=True)

    max_arrows = min(max_arrows, len(attackers))
    for attacker in attackers[:max_arrows]:
        arrows.append(StyledArrow(square, attacker, color="green"))
    
    return arrows


def show_pin(board, start, end) -> StyledArrow:
    arrows = list()
    pin = StyledArrow(start, end, color="yellow")
    arrows.append(pin)
    return arrows
