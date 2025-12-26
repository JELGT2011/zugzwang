# Zugswang

## TODO
- [ ] improve agent robustness and accuracy
    - [ ] give agent more stockfish access, and constrain recommendations by stockfish's evaluation
    - [ ] ensure agent game state is consistent with board representation
    - [ ] update prompt to be more concise (especially in openings)
    - [ ] provide agent with text representation (instead of fen)
    - [ ] consolidate message pattern
- [ ] fix `Chess.js` and `zustand` integration
    - [ ] fix game history
    - [ ] clear arrows on position change
- [ ] load game from fen (or pgn)
- [ ] improve QoL
    - [ ] do not use default audio input/output devices
    - [ ] add eval bar
    - [ ] allow undo move
    - [ ] highlight squares in transcript (on hover, highlight the square)
    - [ ] highlight most recent move on the board
- [ ] features
    - [ ] implement puzzles
    - [ ] implement openings
