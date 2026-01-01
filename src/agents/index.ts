// Agent exports
export {
    createGameAgentInstructions,
    createGameAgentTools,
    GAME_AGENT_NAME,
} from "./GameAgent";

export {
    createPuzzleAgentInstructions,
    createPuzzleAgentTools,
    PUZZLE_AGENT_NAME,
    type PuzzleTacticalContext,
} from "./PuzzleAgent";

export {
    SHARED_COACH_PREFIX,
    STOCKFISH_GROUNDING,
    ARROW_ANNOTATION,
} from "./sharedInstructions";
