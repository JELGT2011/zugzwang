# Zugzwang

## Product
- [ ] make videos more entertaining
    - [ ] give each piece a unique voice
    - [ ] add background music
    - [ ] add intro animation, etc
    - [ ] add edits/memes as clips to insert (make available to LLM later)
    - [ ] create specialized prompt for finding a video idea (from a library)
    - [ ] create specialized prompt for intro, interjections, etc

## TODO
- [ ] use `Puzzle` abstraction (find a way to include it into a scene)

## Puzzles
```python
Puzzle(
    puzzleid='KV0yk',
    fen='3r1rk1/1b3pp1/p6p/1p2q3/2pR2N1/2P1P2P/PP2Q1P1/5RK1 b - - 1 22',
    rating=2057,
    ratingdeviation=75,
    moves=['e5g3', 'g4h6', 'g7h6', 'd4g4'],
    themes=['clearance', 'crushing', 'kingsideAttack', 'master', 'middlegame', 'sacrifice', 'short'],
)

Puzzle(
    puzzleid='4aKI1',
    fen='1r3k2/3R1ppp/p6P/4PpP1/P3pP2/8/8/6K1 b - - 0 31',
    rating=2040,
    ratingdeviation=88,
    moves=['f8e8', 'd7b7', 'b8b7', 'h6g7'],
    themes=['advancedPawn', 'crushing', 'endgame', 'rookEndgame', 'sacrifice', 'short'],
)

Puzzle(
    puzzleid='Phosq',
    fen='r1b1kr2/ppq2p2/2pp3p/8/3b2n1/2NB1RB1/P1PQ2PP/5R1K b q - 1 21',
    rating=1965,
    ratingdeviation=123,
    moves=['c8e6', 'c3b5', 'c6b5', 'd3b5'],
    themes=['crushing', 'middlegame', 'sacrifice', 'short'],
)

Puzzle(
    puzzleid='paBM8',
    fen='5qnr/Rb1k4/1p2ppQ1/2p2N1p/8/2PP4/5PPP/6K1 b - - 3 27',
    rating=2078,
    ratingdeviation=78,
    moves=['d7c6', 'f5d4', 'c5d4', 'g6e4'],
    themes=['clearance', 'crushing', 'middlegame', 'sacrifice', 'short'],
)

Puzzle(
    puzzleid='ZPugM',
    fen='3r3r/1kp1qp2/1p4p1/4p3/Q1N1P3/2pP2PP/P3n1PK/R4R2 b - - 2 27',
    rating=2036,
    ratingdeviation=76,
    moves=['d8d3', 'c4a5', 'b6a5', 'a4b5'],
    themes=['crushing', 'middlegame', 'sacrifice', 'short'],
)

Puzzle(
    puzzleid='cSRB1',
    fen='1r2r1k1/2q1bppp/2np1n2/2p2N2/2P1PP2/pP2BB1P/P6K/1R1Q2R1 b - - 1 23',
    rating=1946,
    ratingdeviation=111,
    moves=['e7f8', 'g1g7', 'f8g7', 'd1g1'],
    themes=['clearance', 'crushing', 'middlegame', 'sacrifice', 'short'],
)

Puzzle(
    puzzleid='K1DLt',
    fen='rr4k1/2pq1pb1/p1nppn1p/5bp1/QpPP4/4PN1P/PP1NBPPB/3R1RK1 w - - 6 15',
    rating=1944,
    ratingdeviation=76,
    moves=['d2b3', 'c6d4', 'a4d7', 'd4e2'],
    themes=['crushing', 'kingsideAttack', 'middlegame', 'sacrifice', 'short'],
)

Puzzle(
    puzzleid='hVPjR',
    fen='2r2rk1/1pp1bppp/p4nq1/n2P4/5B2/P1N2B1P/1P1Q1PP1/R3R1K1 b - - 2 18',
    rating=2045,
    ratingdeviation=75,
    moves=['a5b3', 'd2d1', 'b3a1', 'e1e7'],
    themes=['crushing', 'middlegame', 'sacrifice', 'short'],
)
```
