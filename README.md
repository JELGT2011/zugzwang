# Zugzwang

## Setup
```bash
cp .env.template .env
```
- generate and update API keys in `.env`


## Roadmap

### Media
- [ ] give each piece a unique voice (?)
- [ ] select background music from a library
- [ ] add intro animation, etc
- [ ] add edits/memes as clips to insert (make available to LLM later)
- [ ] create a better outro

### Automation
- [ ] generate unique puzzle intros/titles
- [ ] automatically annotate positions
- [ ] automatically generate narrations

### Long-form
- [ ] create specialized prompt for finding a video idea (from a library)


## Puzzles
```python
Puzzle(
    puzzleid='K1DLt',
    fen='rr4k1/2pq1pb1/p1nppn1p/5bp1/QpPP4/4PN1P/PP1NBPPB/3R1RK1 w - - 6 15',
    rating=1944,
    ratingdeviation=76,
    moves=['d2b3', 'c6d4', 'a4d7', 'd4e2'],
    themes=['crushing', 'kingsideAttack', 'middlegame', 'sacrifice', 'short'],
)
```
