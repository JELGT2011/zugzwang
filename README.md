# Zugzwang

## Setup
```bash
cp .env.template .env
```
- generate and update API keys in `.env`

## Product
- [ ] make videos more entertaining
    - [ ] give each piece a unique voice
    - [ ] add background music
    - [ ] add intro animation, etc
    - [ ] add edits/memes as clips to insert (make available to LLM later)
    - [ ] create specialized prompt for finding a video idea (from a library)
    - [ ] create specialized prompt for intro, interjections, etc

## Puzzles
```python
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
