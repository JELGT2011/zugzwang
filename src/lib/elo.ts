/**
 * ELO Rating System
 * 
 * Standard ELO formula:
 * newRating = oldRating + K * (actualScore - expectedScore)
 * expectedScore = 1 / (1 + 10^((opponentRating - playerRating) / 400))
 */

export type GameResult = "win" | "draw" | "loss";

const RESULT_SCORES: Record<GameResult, number> = {
  win: 1,
  draw: 0.5,
  loss: 0,
};

/**
 * Calculate the expected score based on player and opponent ratings
 * @param playerRating - The player's current rating
 * @param opponentRating - The opponent's (or puzzle's) rating
 * @returns Expected score between 0 and 1
 */
export function calculateExpectedScore(
  playerRating: number,
  opponentRating: number
): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate the new ELO rating after a game/puzzle
 * @param playerRating - The player's current rating
 * @param opponentRating - The opponent's (or puzzle's) rating
 * @param result - The game result: "win", "draw", or "loss"
 * @param kFactor - The K-factor (default: 32, standard for chess puzzles)
 * @returns The new rating (rounded to nearest integer)
 */
export function calculateNewElo(
  playerRating: number,
  opponentRating: number,
  result: GameResult,
  kFactor: number = 32
): number {
  const expectedScore = calculateExpectedScore(playerRating, opponentRating);
  const actualScore = RESULT_SCORES[result];
  const newRating = playerRating + kFactor * (actualScore - expectedScore);
  
  // Round to nearest integer and ensure minimum rating of 100
  return Math.max(100, Math.round(newRating));
}

/**
 * Calculate rating change (delta) without applying it
 * @param playerRating - The player's current rating
 * @param opponentRating - The opponent's (or puzzle's) rating
 * @param result - The game result: "win", "draw", or "loss"
 * @param kFactor - The K-factor (default: 32)
 * @returns The rating change (positive for gain, negative for loss)
 */
export function calculateRatingDelta(
  playerRating: number,
  opponentRating: number,
  result: GameResult,
  kFactor: number = 32
): number {
  const expectedScore = calculateExpectedScore(playerRating, opponentRating);
  const actualScore = RESULT_SCORES[result];
  return Math.round(kFactor * (actualScore - expectedScore));
}

/**
 * Determine puzzle result based on mistakes
 * - Win: Solved without any incorrect moves
 * - Draw: Solved but made incorrect moves along the way
 * - Loss: Failed (gave up or showed solution)
 */
export function getPuzzleResult(
  solved: boolean,
  mistakeCount: number
): GameResult {
  if (!solved) {
    return "loss";
  }
  return mistakeCount === 0 ? "win" : "draw";
}
