// Chess analysis utilities and tactical pattern detection
import { Chess, Move, Square } from "chess.js";

export interface TacticalPattern {
  type: string;
  description: string;
  squares?: Square[];
}

export interface PositionAnalysis {
  fen: string;
  evaluation: number;
  mate?: number;
  bestMove: string;
  principalVariation: string[];
  threats: TacticalPattern[];
  opportunities: TacticalPattern[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  phase: "opening" | "middlegame" | "endgame";
  materialBalance: number;
  moveQuality?: {
    quality: string;
    evalDelta: number;
  };
}

export interface CoachingContext {
  currentPosition: PositionAnalysis;
  previousPosition?: PositionAnalysis;
  lastMove?: Move;
  playerColor: "white" | "black";
  gameHistory: Move[];
  skillLevel: number;
  hintLevel: "minimal" | "moderate" | "detailed";
}

// Detect game phase based on material and piece activity
export function detectGamePhase(chess: Chess): "opening" | "middlegame" | "endgame" {
  const fen = chess.fen();
  const pieces = fen.split(" ")[0];
  
  // Count major/minor pieces
  const queens = (pieces.match(/[qQ]/g) || []).length;
  const rooks = (pieces.match(/[rR]/g) || []).length;
  const bishops = (pieces.match(/[bB]/g) || []).length;
  const knights = (pieces.match(/[nN]/g) || []).length;
  
  const totalMinorMajor = queens + rooks + bishops + knights;
  
  // Simple heuristic
  if (chess.history().length < 10) {
    return "opening";
  }
  
  if (totalMinorMajor <= 4 || queens === 0) {
    return "endgame";
  }
  
  return "middlegame";
}

// Calculate material balance (positive = white advantage)
export function calculateMaterialBalance(chess: Chess): number {
  const pieceValues: Record<string, number> = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0,
  };
  
  const fen = chess.fen();
  const position = fen.split(" ")[0];
  let balance = 0;
  
  for (const char of position) {
    const piece = char.toLowerCase();
    if (pieceValues[piece] !== undefined) {
      const value = pieceValues[piece];
      balance += char === char.toUpperCase() ? value : -value;
    }
  }
  
  return balance;
}

// Detect if a piece is hanging (can be captured for free)
export function findHangingPieces(chess: Chess): TacticalPattern[] {
  const patterns: TacticalPattern[] = [];
  const board = chess.board();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const square = (String.fromCharCode(97 + col) + (8 - row)) as Square;
      
      // Check if any opponent piece can capture this square
      const attackers = getAttackers(chess, square, piece.color === "w" ? "b" : "w");
      const defenders = getAttackers(chess, square, piece.color);
      
      if (attackers.length > 0 && defenders.length === 0) {
        patterns.push({
          type: "hanging_piece",
          description: `${piece.color === "w" ? "White" : "Black"} ${getPieceName(piece.type)} on ${square} is undefended`,
          squares: [square],
        });
      }
    }
  }
  
  return patterns;
}

// Get all pieces of a color that attack a square
function getAttackers(chess: Chess, square: Square, attackerColor: "w" | "b"): Square[] {
  const attackers: Square[] = [];
  const moves = chess.moves({ verbose: true });
  
  // Check all possible moves to see if any attack this square
  const tempChess = new Chess(chess.fen());
  
  // Set it to the attacker's turn
  const fen = chess.fen().split(" ");
  fen[1] = attackerColor;
  fen[3] = "-"; // Clear en passant
  
  try {
    tempChess.load(fen.join(" "));
    const attackerMoves = tempChess.moves({ verbose: true });
    
    for (const move of attackerMoves) {
      if (move.to === square && move.flags.includes("c")) {
        attackers.push(move.from);
      }
    }
  } catch {
    // Invalid position, ignore
  }
  
  return attackers;
}

// Detect pins (pieces that can't move because they're blocking an attack on a more valuable piece)
export function findPins(chess: Chess): TacticalPattern[] {
  const patterns: TacticalPattern[] = [];
  const moves = chess.moves({ verbose: true });
  
  // A piece is pinned if moving it would expose the king to check
  // This is complex to detect directly, so we use a simplified approach
  
  return patterns;
}

// Detect check and checkmate threats
export function findThreats(chess: Chess, forColor: "w" | "b"): TacticalPattern[] {
  const patterns: TacticalPattern[] = [];
  const moves = chess.moves({ verbose: true });
  
  for (const move of moves) {
    const tempChess = new Chess(chess.fen());
    tempChess.move(move);
    
    if (tempChess.isCheckmate()) {
      patterns.push({
        type: "checkmate_threat",
        description: `Checkmate threat with ${move.san}`,
        squares: [move.from, move.to],
      });
    } else if (tempChess.isCheck()) {
      patterns.push({
        type: "check_threat",
        description: `Check available with ${move.san}`,
        squares: [move.from, move.to],
      });
    }
  }
  
  return patterns;
}

// Detect forks (one piece attacking two or more enemy pieces)
export function findForks(chess: Chess): TacticalPattern[] {
  const patterns: TacticalPattern[] = [];
  const moves = chess.moves({ verbose: true });
  
  for (const move of moves) {
    const tempChess = new Chess(chess.fen());
    tempChess.move(move);
    
    // Count how many pieces the moved piece now attacks
    const attackedPieces = countAttackedPieces(tempChess, move.to);
    
    if (attackedPieces >= 2) {
      patterns.push({
        type: "fork",
        description: `Potential fork with ${move.san}`,
        squares: [move.to],
      });
    }
  }
  
  return patterns;
}

function countAttackedPieces(chess: Chess, fromSquare: Square): number {
  const board = chess.board();
  const piece = chess.get(fromSquare);
  if (!piece) return 0;
  
  const moves = chess.moves({ square: fromSquare, verbose: true });
  let attackedCount = 0;
  
  for (const move of moves) {
    if (move.captured) {
      attackedCount++;
    }
  }
  
  return attackedCount;
}

function getPieceName(piece: string): string {
  const names: Record<string, string> = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  return names[piece.toLowerCase()] || piece;
}

// Build a structured analysis of the position for LLM consumption
export function buildAnalysisContext(
  chess: Chess,
  evaluation: number,
  mate: number | undefined,
  bestMove: string,
  principalVariation: string[],
  previousEval?: number,
  lastMove?: Move
): PositionAnalysis {
  const threats = findThreats(chess, chess.turn());
  const opportunities = findForks(chess);
  const hangingPieces = findHangingPieces(chess);
  
  let moveQuality: { quality: string; evalDelta: number } | undefined;
  
  if (previousEval !== undefined && lastMove) {
    // Calculate eval delta from the perspective of the player who just moved
    const playerWasWhite = lastMove.color === "w";
    const evalDelta = playerWasWhite 
      ? evaluation - previousEval 
      : previousEval - evaluation;
    
    const quality = classifyMoveQualityDetailed(evalDelta);
    moveQuality = { quality, evalDelta };
  }
  
  return {
    fen: chess.fen(),
    evaluation,
    mate,
    bestMove,
    principalVariation,
    threats: [...threats, ...hangingPieces],
    opportunities,
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    phase: detectGamePhase(chess),
    materialBalance: calculateMaterialBalance(chess),
    moveQuality,
  };
}

function classifyMoveQualityDetailed(evalDelta: number): string {
  if (evalDelta >= 200) return "brilliant";
  if (evalDelta >= 50) return "great";
  if (evalDelta >= 0) return "good";
  if (evalDelta >= -30) return "ok";
  if (evalDelta >= -100) return "inaccuracy";
  if (evalDelta >= -300) return "mistake";
  return "blunder";
}

// Format analysis for LLM prompt
export function formatAnalysisForLLM(context: CoachingContext): string {
  const { currentPosition, previousPosition, lastMove, playerColor, gameHistory, hintLevel } = context;
  
  const lines: string[] = [];
  
  lines.push(`=== Position Analysis ===`);
  lines.push(`FEN: ${currentPosition.fen}`);
  lines.push(`Phase: ${currentPosition.phase}`);
  lines.push(`Evaluation: ${formatEvaluation(currentPosition.evaluation, currentPosition.mate)}`);
  lines.push(`Material balance: ${currentPosition.materialBalance > 0 ? "+" : ""}${currentPosition.materialBalance} centipawns`);
  
  if (currentPosition.isCheck) lines.push(`Status: CHECK`);
  if (currentPosition.isCheckmate) lines.push(`Status: CHECKMATE`);
  if (currentPosition.isStalemate) lines.push(`Status: STALEMATE`);
  
  lines.push(`\n=== Engine Recommendation ===`);
  lines.push(`Best move: ${currentPosition.bestMove}`);
  lines.push(`Principal variation: ${currentPosition.principalVariation.slice(0, 5).join(" ")}`);
  
  if (lastMove && currentPosition.moveQuality) {
    lines.push(`\n=== Last Move Analysis ===`);
    lines.push(`Move played: ${lastMove.san}`);
    lines.push(`Quality: ${currentPosition.moveQuality.quality}`);
    lines.push(`Eval change: ${currentPosition.moveQuality.evalDelta > 0 ? "+" : ""}${currentPosition.moveQuality.evalDelta} centipawns`);
    
    if (previousPosition) {
      lines.push(`Eval before: ${formatEvaluation(previousPosition.evaluation, previousPosition.mate)}`);
      lines.push(`Eval after: ${formatEvaluation(currentPosition.evaluation, currentPosition.mate)}`);
    }
  }
  
  if (currentPosition.threats.length > 0) {
    lines.push(`\n=== Tactical Patterns ===`);
    for (const threat of currentPosition.threats.slice(0, 3)) {
      lines.push(`- ${threat.type}: ${threat.description}`);
    }
  }
  
  lines.push(`\n=== Context ===`);
  lines.push(`Player is: ${playerColor}`);
  lines.push(`Move number: ${Math.floor(gameHistory.length / 2) + 1}`);
  lines.push(`Hint level: ${hintLevel}`);
  
  return lines.join("\n");
}

function formatEvaluation(evaluation: number, mate?: number): string {
  if (mate !== undefined) {
    return mate > 0 ? `Mate in ${mate}` : `Getting mated in ${Math.abs(mate)}`;
  }
  const pawns = evaluation / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(2)} pawns`;
}

