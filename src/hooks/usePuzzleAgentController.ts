import { createPuzzleAgentInstructions, createPuzzleAgentTools, PUZZLE_AGENT_NAME } from "@/agents";
import type { PuzzleTacticalContext } from "@/agents/PuzzleAgent";
import { usePuzzleStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import type { PuzzleTheme } from "@/types/puzzle";
import { OpenAIRealtimeWebRTC, RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { Chess, type Square, type PieceSymbol, type Color } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arrow } from "react-chessboard";

// ============================================================================
// Module-level session state for puzzle agent (separate from game agent)
// ============================================================================
const puzzleSessionState = {
    session: null as RealtimeSession | null,
    audioElement: null as HTMLAudioElement | null,
    mediaStream: null as MediaStream | null,
    messageQueue: [] as string[],
    isResponseActive: false,
    currentUserTranscript: "",
    lastProcessedMoveIndex: null as number | null,
};

// Piece names for readable output
const PIECE_NAMES: Record<PieceSymbol, string> = {
    p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'
};

// Piece values for material calculation
const PIECE_VALUES: Record<PieceSymbol, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
};

/**
 * Compute tactical analysis of a position using chess.js
 * No Stockfish needed - we analyze threats, pins, captures, etc. directly
 */
function computeTacticalContext(game: Chess): PuzzleTacticalContext {
    const turn = game.turn();
    const opponentColor: Color = turn === 'w' ? 'b' : 'w';
    
    const undefendedPieces: PuzzleTacticalContext['undefendedPieces'] = [];
    const pins: PuzzleTacticalContext['pins'] = [];
    const captures: PuzzleTacticalContext['captures'] = [];
    const checks: PuzzleTacticalContext['checks'] = [];
    const forkTargets: PuzzleTacticalContext['forkTargets'] = [];
    const notes: string[] = [];
    
    // Get all legal moves for analysis
    const legalMoves = game.moves({ verbose: true });
    
    // Find captures
    for (const move of legalMoves) {
        if (move.captured) {
            const piece = game.get(move.from as Square);
            if (piece) {
                captures.push({
                    attacker: PIECE_NAMES[piece.type],
                    attackerSquare: move.from,
                    target: PIECE_NAMES[move.captured as PieceSymbol],
                    targetSquare: move.to,
                });
            }
        }
        
        // Find checks
        // Make the move temporarily to check if it's a check
        const tempGame = new Chess(game.fen());
        tempGame.move(move);
        if (tempGame.isCheck()) {
            const piece = game.get(move.from as Square);
            if (piece) {
                checks.push({
                    piece: PIECE_NAMES[piece.type],
                    fromSquare: move.from,
                    toSquare: move.to,
                });
            }
        }
    }
    
    // Analyze the board for undefended pieces and pins
    const board = game.board();
    let materialBalance = 0;
    
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (!piece) continue;
            
            const square = (String.fromCharCode(97 + file) + (8 - rank)) as Square;
            materialBalance += piece.color === 'w' 
                ? PIECE_VALUES[piece.type] 
                : -PIECE_VALUES[piece.type];
            
            // Check if opponent's piece is attacked
            if (piece.color === opponentColor && piece.type !== 'k') {
                const isAttacked = game.isAttacked(square, turn);
                const isDefended = game.isAttacked(square, opponentColor);
                
                if (isAttacked) {
                    // Find what's attacking this piece
                    const attackers: string[] = [];
                    for (const move of legalMoves) {
                        if (move.to === square && move.captured) {
                            const attacker = game.get(move.from as Square);
                            if (attacker) {
                                attackers.push(`${PIECE_NAMES[attacker.type]} on ${move.from}`);
                            }
                        }
                    }
                    
                    if (!isDefended) {
                        undefendedPieces.push({
                            piece: PIECE_NAMES[piece.type],
                            square,
                            color: piece.color === 'w' ? 'white' : 'black',
                            attackedBy: attackers,
                        });
                    }
                }
            }
        }
    }
    
    // Check for fork opportunities (simplistic: look for moves that attack multiple pieces)
    for (const move of legalMoves) {
        const tempGame = new Chess(game.fen());
        tempGame.move(move);
        
        // Count valuable pieces attacked after this move
        const attackedPieces: string[] = [];
        const tempBoard = tempGame.board();
        
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = tempBoard[rank][file];
                if (!piece || piece.color === turn) continue;
                
                const sq = (String.fromCharCode(97 + file) + (8 - rank)) as Square;
                if (tempGame.isAttacked(sq, turn) && (piece.type === 'k' || piece.type === 'q' || piece.type === 'r')) {
                    attackedPieces.push(`${PIECE_NAMES[piece.type]} on ${sq}`);
                }
            }
        }
        
        if (attackedPieces.length >= 2) {
            forkTargets.push({ targetPieces: attackedPieces });
        }
    }
    
    // Add contextual notes
    if (game.isCheck()) {
        notes.push("The king is in check!");
    }
    if (undefendedPieces.length > 0) {
        notes.push(`There are ${undefendedPieces.length} undefended piece(s).`);
    }
    if (checks.length > 0) {
        notes.push(`${checks.length} check(s) available.`);
    }
    if (forkTargets.length > 0) {
        notes.push("Fork opportunities exist.");
    }
    
    return {
        undefendedPieces,
        pins,
        captures,
        checks,
        forkTargets,
        materialBalance,
        notes,
    };
}

interface PuzzleAgentContext {
    boardAscii: string;
    themes: PuzzleTheme[];
    hintsUsed: number;
    playerColor: string;
    tacticalContext: PuzzleTacticalContext;
    solutionMove: string;
    solutionMoveReadable: string;
}

/**
 * Convert a UCI move to human-readable format
 */
function uciToReadable(uci: string, game: Chess): string {
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    
    const piece = game.get(from);
    if (!piece) return `move from ${from} to ${to}`;
    
    const pieceName = PIECE_NAMES[piece.type];
    let readable = `${pieceName} from ${from} to ${to}`;
    
    if (promotion) {
        const promoName = PIECE_NAMES[promotion as PieceSymbol] || promotion;
        readable += ` promoting to ${promoName}`;
    }
    
    return readable;
}

/**
 * PuzzleAgentController hook - provides a clean interface to the AI puzzle hint agent.
 * No Stockfish needed - uses chess.js for tactical analysis.
 */
export function usePuzzleAgentController() {
    // Get coach state (reusing the same store for connection state and audio)
    const connectionState = useCoachStore((state) => state.connectionState);
    const inputDevices = useCoachStore((state) => state.inputDevices);
    const outputDevices = useCoachStore((state) => state.outputDevices);
    const selectedInputDeviceId = useCoachStore((state) => state.selectedInputDeviceId);
    const selectedOutputDeviceId = useCoachStore((state) => state.selectedOutputDeviceId);
    const isMicMuted = useCoachStore((state) => state.isMicMuted);
    const transcript = useCoachStore((state) => state.transcript);
    const transcriptHistory = useCoachStore((state) => state.transcriptHistory);

    // Get coach actions
    const setConnectionState = useCoachStore((state) => state.setConnectionState);
    const setInputDevices = useCoachStore((state) => state.setInputDevices);
    const setOutputDevices = useCoachStore((state) => state.setOutputDevices);
    const setSelectedInputDeviceId = useCoachStore((state) => state.setSelectedInputDeviceId);
    const setSelectedOutputDeviceId = useCoachStore((state) => state.setSelectedOutputDeviceId);
    const setIsMicMuted = useCoachStore((state) => state.setIsMicMuted);
    const setTranscript = useCoachStore((state) => state.setTranscript);
    const addToHistory = useCoachStore((state) => state.addToHistory);
    const clearHistory = useCoachStore((state) => state.clearHistory);
    const resetCoachState = useCoachStore((state) => state.reset);

    // Puzzle state
    const currentPuzzle = usePuzzleStore((state) => state.currentPuzzle);
    const currentMoveIndex = usePuzzleStore((state) => state.currentMoveIndex);
    const hintsUsed = usePuzzleStore((state) => state.hintsUsed);

    // Derived state
    const isConnected = connectionState === "connected";
    const isConnecting = connectionState === "connecting";

    // Local state
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [pendingContext, setPendingContext] = useState<PuzzleAgentContext | null>(null);
    const [arrows, setArrows] = useState<Arrow[]>([]);

    // Compute current board state and tactical analysis
    const currentGameState = useMemo(() => {
        if (!currentPuzzle) return null;
        
        const game = new Chess(currentPuzzle.fen);
        // Apply all moves up to current index
        for (let i = 0; i < currentMoveIndex; i++) {
            const move = currentPuzzle.moves[i];
            try {
                game.move({
                    from: move.slice(0, 2),
                    to: move.slice(2, 4),
                    promotion: move.length > 4 ? move[4] : undefined,
                });
            } catch {
                break;
            }
        }
        
        // Compute tactical analysis using chess.js (no Stockfish needed!)
        const tacticalContext = computeTacticalContext(game);
        
        return {
            game,
            fen: game.fen(),
            ascii: game.ascii(),
            turn: game.turn(),
            tacticalContext,
        };
    }, [currentPuzzle, currentMoveIndex]);

    const addArrow = useCallback((arrow: Arrow) => {
        setArrows(prev => [...prev, arrow]);
    }, []);

    const clearArrows = useCallback(() => {
        setArrows([]);
    }, []);

    const cleanupSession = useCallback(() => {
        if (puzzleSessionState.session) {
            try {
                puzzleSessionState.session.close();
            } catch (e) {
                console.error("Error closing puzzle session:", e);
            }
            puzzleSessionState.session = null;
        }
        if (puzzleSessionState.audioElement) {
            puzzleSessionState.audioElement.pause();
            puzzleSessionState.audioElement.srcObject = null;
            puzzleSessionState.audioElement = null;
        }
        if (puzzleSessionState.mediaStream) {
            puzzleSessionState.mediaStream.getTracks().forEach((t) => t.stop());
            puzzleSessionState.mediaStream = null;
        }
        puzzleSessionState.isResponseActive = false;
        puzzleSessionState.messageQueue = [];
        puzzleSessionState.lastProcessedMoveIndex = null;
        setConnectionState("disconnected");
        setIsMicMuted(true); // Reset to muted state
    }, [setConnectionState, setIsMicMuted]);

    const refreshDevices = useCallback(async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = allDevices.filter((d) => d.kind === "audioinput" && d.deviceId);
            const audioOutputs = allDevices.filter((d) => d.kind === "audiooutput" && d.deviceId);

            setInputDevices(audioInputs);
            setOutputDevices(audioOutputs);

            const currentStore = useCoachStore.getState();
            if ((!currentStore.selectedInputDeviceId || currentStore.selectedInputDeviceId === "default") && audioInputs.length > 0) {
                setSelectedInputDeviceId(audioInputs[0].deviceId);
            }
            if ((!currentStore.selectedOutputDeviceId || currentStore.selectedOutputDeviceId === "default") && audioOutputs.length > 0) {
                setSelectedOutputDeviceId(audioOutputs[0].deviceId);
            }
        } catch (e) {
            console.error("Error enumerating devices:", e);
        }
    }, [setInputDevices, setOutputDevices, setSelectedInputDeviceId, setSelectedOutputDeviceId]);

    const connect = useCallback(
        async (context: PuzzleAgentContext) => {
            if (isConnected) {
                cleanupSession();
                return;
            }

            cleanupSession();
            setConnectionState("connecting");
            clearArrows();

            try {
                // Request permissions if needed
                if (inputDevices.some((d: MediaDeviceInfo) => !d.label)) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach((t) => t.stop());
                        await refreshDevices();
                    } catch (e) {
                        console.warn("Could not get microphone permission:", e);
                    }
                }

                const response = await fetch("/api/realtime/session", { method: "POST" });
                if (!response.ok) {
                    throw new Error(`Failed to get ephemeral key: ${await response.text()}`);
                }

                const data = await response.json();
                const ephemeralKey = data.value;
                if (!ephemeralKey) {
                    throw new Error("No ephemeral key found");
                }

                const audioConstraints = selectedInputDeviceId
                    ? { deviceId: { exact: selectedInputDeviceId } }
                    : true;

                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                });

                // Store mediaStream and start with mic muted
                puzzleSessionState.mediaStream = mediaStream;
                mediaStream.getAudioTracks().forEach((track) => {
                    track.enabled = false; // Start muted
                });
                setIsMicMuted(true);

                const audioElement = new Audio();
                audioElement.autoplay = true;
                puzzleSessionState.audioElement = audioElement;

                if (selectedOutputDeviceId && 'setSinkId' in audioElement) {
                    try {
                        await (audioElement as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(selectedOutputDeviceId);
                    } catch (err) {
                        console.warn("Failed to set output device:", err);
                    }
                }

                // Create the Puzzle Agent (no Stockfish needed - tactical analysis is pre-computed)
                const agent = new RealtimeAgent({
                    name: PUZZLE_AGENT_NAME,
                    instructions: createPuzzleAgentInstructions(context),
                    tools: createPuzzleAgentTools(addArrow),
                });

                const transport = new OpenAIRealtimeWebRTC({
                    mediaStream,
                    audioElement,
                });

                const session = new RealtimeSession(agent, {
                    transport,
                    config: {
                        audio: {
                            input: {
                                turnDetection: {
                                    type: "semantic_vad",
                                    eagerness: "medium",
                                    createResponse: true,
                                },
                            },
                        },
                    },
                });
                puzzleSessionState.session = session;

                // Event listeners
                session.transport.on("*", (event: { type: string; response?: { status: string; status_details?: unknown } }) => {
                    if (event.type === "response.created") {
                        puzzleSessionState.isResponseActive = true;
                    }
                    if (event.type === "response.done") {
                        puzzleSessionState.isResponseActive = false;
                        // Process ONE queued message at a time, with a delay to avoid race conditions
                        // The server may not be fully ready immediately after response.done
                        if (puzzleSessionState.messageQueue.length > 0) {
                            setTimeout(() => {
                                if (puzzleSessionState.session && !puzzleSessionState.isResponseActive) {
                                    const msg = puzzleSessionState.messageQueue.shift();
                                    if (msg) {
                                        puzzleSessionState.isResponseActive = true;
                                        puzzleSessionState.session.sendMessage(msg);
                                    }
                                }
                            }, 200); // Small delay to let server fully finish
                        }
                    }
                    if (event.type === "response.done" && event.response?.status === "failed") {
                        console.error("[Puzzle Agent] Response failed:", event.response.status_details);
                    }
                });

                session.transport.on("conversation.item.input_audio_transcription.delta", (event: { delta?: string }) => {
                    if (event.delta) {
                        puzzleSessionState.currentUserTranscript += event.delta;
                    }
                });

                session.transport.on("conversation.item.input_audio_transcription.completed", (event: { transcript?: string }) => {
                    const userText = event.transcript || puzzleSessionState.currentUserTranscript;
                    if (userText?.trim()) {
                        addToHistory({ role: "user", content: userText, timestamp: Date.now() });
                    }
                    puzzleSessionState.currentUserTranscript = "";
                });

                session.transport.on("response.output_audio_transcript.delta", (event: { delta?: string }) => {
                    if (event.delta) {
                        setTranscript((prev) => prev + event.delta);
                    }
                });

                session.transport.on("response.output_audio_transcript.done", (event: { transcript?: string }) => {
                    const assistantText = event.transcript || useCoachStore.getState().transcript;
                    if (assistantText?.trim()) {
                        addToHistory({ role: "assistant", content: assistantText, timestamp: Date.now() });
                        setTranscript("");
                    }
                });

                session.on("error", (err: unknown) => {
                    // Log the full error structure
                    console.error("Puzzle session error (full):", JSON.stringify(err, null, 2));
                    console.error("Queue state at error:", {
                        queueLength: puzzleSessionState.messageQueue.length,
                        isResponseActive: puzzleSessionState.isResponseActive,
                        lastProcessedMoveIndex: puzzleSessionState.lastProcessedMoveIndex,
                    });
                    cleanupSession();
                });

                const connectPromise = session.connect({ apiKey: ephemeralKey });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Connection timeout")), 30000)
                );

                await Promise.race([connectPromise, timeoutPromise]);

                if (puzzleSessionState.session === session) {
                    // Initialize lastProcessedMoveIndex to prevent usePuzzleSession 
                    // from immediately sending a position update when connection is established
                    puzzleSessionState.lastProcessedMoveIndex = usePuzzleStore.getState().currentMoveIndex;
                    
                    setConnectionState("connected");
                    if (puzzleSessionState.audioElement?.paused) {
                        try {
                            await puzzleSessionState.audioElement.play();
                        } catch (e) {
                            console.warn("Could not start audio playback:", e);
                        }
                    }
                } else {
                    session.close();
                }
            } catch (error) {
                console.error("Puzzle agent connection error:", error);
                cleanupSession();
            }
        },
        [
            isConnected,
            inputDevices,
            selectedInputDeviceId,
            selectedOutputDeviceId,
            addArrow,
            setConnectionState,
            setIsMicMuted,
            setTranscript,
            addToHistory,
            cleanupSession,
            refreshDevices,
            clearArrows,
        ]
    );

    const sendMessage = useCallback((message: string) => {
        if (!puzzleSessionState.session) {
            console.warn("[Puzzle Agent] No active session");
            return;
        }

        if (puzzleSessionState.isResponseActive) {
            console.debug("[Puzzle Agent] Response active, queueing message");
            puzzleSessionState.messageQueue.push(message);
        } else {
            console.debug("[Puzzle Agent] Sending message immediately");
            // Set active immediately to prevent race conditions
            puzzleSessionState.isResponseActive = true;
            puzzleSessionState.session.sendMessage(message);
        }
    }, []);

    // Toggle microphone mute state (for transcription)
    const toggleMic = useCallback(() => {
        if (!puzzleSessionState.mediaStream) {
            console.warn("[toggleMic] No active media stream");
            return;
        }

        const newMutedState = !isMicMuted;
        puzzleSessionState.mediaStream.getAudioTracks().forEach((track) => {
            track.enabled = !newMutedState; // enabled = !muted
        });
        setIsMicMuted(newMutedState);
        console.debug(`[Puzzle Mic] ${newMutedState ? "Muted" : "Unmuted"} (transcription ${newMutedState ? "stopped" : "started"})`);
    }, [isMicMuted, setIsMicMuted]);

    // Request a hint - connects if needed and sends hint request
    const requestHint = useCallback(async () => {
        if (!currentPuzzle || !currentGameState) return;

        // Get the current correct move from the solution
        const solutionMove = currentPuzzle.moves[currentMoveIndex] || '';
        const solutionMoveReadable = solutionMove 
            ? uciToReadable(solutionMove, currentGameState.game)
            : 'unknown';

        const context: PuzzleAgentContext = {
            boardAscii: currentGameState.ascii,
            themes: currentPuzzle.themes as PuzzleTheme[],
            hintsUsed,
            playerColor: currentGameState.turn === 'w' ? 'White' : 'Black',
            tacticalContext: currentGameState.tacticalContext,
            solutionMove,
            solutionMoveReadable,
        };

        if (!isConnected) {
            // Start connection and it will prompt for hint automatically
            await refreshDevices();
            const currentStore = useCoachStore.getState();
            const currentInputs = currentStore.inputDevices;
            const currentOutputs = currentStore.outputDevices;

            // Only show device modal if:
            // 1. Audio setup hasn't been completed yet, AND
            // 2. There are multiple devices to choose from
            if (!currentStore.audioSetupComplete && (currentInputs.length > 1 || currentOutputs.length > 1)) {
                setPendingContext(context);
                setShowDeviceModal(true);
            } else {
                await connect(context);
                // Send hint request after connection
                setTimeout(() => {
                    sendMessage("[SYSTEM: The user clicked the 'Get Hint' button. Provide a helpful hint for this puzzle. Start directly with your hint - do not say 'Sure' or acknowledge a request since the user didn't speak.]");
                }, 500);
            }
        } else {
            // Already connected, just request a hint
            clearArrows();
            sendMessage("[SYSTEM: The user clicked the hint button again. Provide another hint, going slightly deeper than before. Start directly with your hint - do not acknowledge a request since the user didn't speak.]");
        }
    }, [currentPuzzle, currentGameState, hintsUsed, currentMoveIndex, isConnected, refreshDevices, connect, sendMessage, clearArrows]);

    const confirmDeviceSelection = useCallback(async () => {
        if (pendingContext) {
            await connect(pendingContext);
            setTimeout(() => {
                sendMessage("[SYSTEM: The user clicked the 'Get Hint' button. Provide a helpful hint for this puzzle. Start directly with your hint - do not say 'Sure' or acknowledge a request since the user didn't speak.]");
            }, 500);
            setPendingContext(null);
        }
    }, [connect, pendingContext, sendMessage]);

    return {
        // State
        connectionState,
        isConnected,
        isConnecting,
        inputDevices,
        outputDevices,
        selectedInputDeviceId,
        selectedOutputDeviceId,
        isMicMuted,
        transcript,
        transcriptHistory,
        showDeviceModal,
        arrows,

        // Actions
        requestHint,
        connect,
        confirmDeviceSelection,
        cleanupSession,
        refreshDevices,
        setSelectedInputDeviceId,
        setSelectedOutputDeviceId,
        setShowDeviceModal,
        sendMessage,
        toggleMic,
        clearArrows,
        clearHistory,
        resetCoachState,
    };
}

/**
 * PuzzleSession hook - handles position updates and sends them to the agent.
 * 
 * IMPORTANT: This hook should only be called ONCE (typically in the puzzle page).
 * It watches for changes in the puzzle position and sends updates to the agent.
 */
export function usePuzzleSession() {
    // Get puzzle state
    const currentPuzzle = usePuzzleStore((state) => state.currentPuzzle);
    const currentMoveIndex = usePuzzleStore((state) => state.currentMoveIndex);
    const puzzleStatus = usePuzzleStore((state) => state.puzzleStatus);
    const hintsUsed = usePuzzleStore((state) => state.hintsUsed);

    // Get connection state
    const connectionState = useCoachStore((state) => state.connectionState);
    const setConnectionState = useCoachStore((state) => state.setConnectionState);
    const isConnected = connectionState === "connected";

    // Ref to track if we're currently processing to prevent race conditions
    const isProcessingRef = useRef(false);

    // Compute current board state and tactical analysis
    const currentGameState = useMemo(() => {
        if (!currentPuzzle) return null;
        
        const game = new Chess(currentPuzzle.fen);
        // Apply all moves up to current index
        for (let i = 0; i < currentMoveIndex; i++) {
            const move = currentPuzzle.moves[i];
            try {
                game.move({
                    from: move.slice(0, 2),
                    to: move.slice(2, 4),
                    promotion: move.length > 4 ? move[4] : undefined,
                });
            } catch {
                break;
            }
        }
        
        // Compute tactical analysis using chess.js
        const tacticalContext = computeTacticalContext(game);
        
        return {
            game,
            fen: game.fen(),
            ascii: game.ascii(),
            turn: game.turn(),
            tacticalContext,
        };
    }, [currentPuzzle, currentMoveIndex]);

    // Helper to send messages
    const sendMessage = useCallback((message: string) => {
        if (!puzzleSessionState.session) {
            console.warn("[PuzzleSession] No active session");
            return;
        }

        if (puzzleSessionState.isResponseActive) {
            console.debug("[PuzzleSession] Response active, queueing message");
            puzzleSessionState.messageQueue.push(message);
        } else {
            console.debug("[PuzzleSession] Sending message immediately");
            // Set active immediately to prevent race conditions
            puzzleSessionState.isResponseActive = true;
            puzzleSessionState.session.sendMessage(message);
        }
    }, []);

    // Watch for position changes and send updates to the agent
    useEffect(() => {
        if (!isConnected || !currentPuzzle || !currentGameState) return;
        if (puzzleStatus !== "playing") return;

        // Only notify if the move index has changed since last update
        if (currentMoveIndex === puzzleSessionState.lastProcessedMoveIndex) return;
        if (isProcessingRef.current) return;

        // Set processing flag
        isProcessingRef.current = true;
        puzzleSessionState.lastProcessedMoveIndex = currentMoveIndex;

        console.debug("[PuzzleSession] Position changed, updating agent...", { currentMoveIndex });

        const { ascii: boardAscii, turn, tacticalContext, game } = currentGameState;
        const playerColor = turn === 'w' ? 'White' : 'Black';

        // Get the current correct move from the solution
        const solutionMove = currentPuzzle.moves[currentMoveIndex] || '';
        const solutionMoveReadable = solutionMove 
            ? uciToReadable(solutionMove, game)
            : 'unknown';

        // Format tactical context for the agent
        const tacticalSummary: string[] = [];
        
        if (tacticalContext.checks.length > 0) {
            tacticalSummary.push(`Checks available: ${tacticalContext.checks.map(c => 
                `${c.piece} ${c.fromSquare}-${c.toSquare}`
            ).join(', ')}`);
        }
        
        if (tacticalContext.captures.length > 0) {
            tacticalSummary.push(`Captures available: ${tacticalContext.captures.map(c => 
                `${c.attacker} on ${c.attackerSquare} can take ${c.target} on ${c.targetSquare}`
            ).join('; ')}`);
        }
        
        if (tacticalContext.undefendedPieces.length > 0) {
            tacticalSummary.push(`Undefended opponent pieces: ${tacticalContext.undefendedPieces.map(p => 
                `${p.piece} on ${p.square}`
            ).join(', ')}`);
        }
        
        if (tacticalContext.forkTargets.length > 0) {
            tacticalSummary.push(`Fork opportunities exist targeting: ${tacticalContext.forkTargets.map(f => 
                f.targetPieces.join(' and ')
            ).join('; ')}`);
        }
        
        if (tacticalContext.notes.length > 0) {
            tacticalSummary.push(`Notes: ${tacticalContext.notes.join(', ')}`);
        }

        const updateMsg = `[SYSTEM: Position updated. ${playerColor} to move.

Board:
${boardAscii}

THE CORRECT SOLUTION (TOP SECRET - NEVER REVEAL):
Move: ${solutionMove} (${solutionMoveReadable})

Tactical Analysis (why this move works):
${tacticalSummary.length > 0 ? tacticalSummary.join('\n') : 'No immediate tactical features detected.'}

Material balance: ${tacticalContext.materialBalance > 0 ? `White +${tacticalContext.materialBalance}` : tacticalContext.materialBalance < 0 ? `Black +${Math.abs(tacticalContext.materialBalance)}` : 'Equal'}

Themes for this puzzle: ${currentPuzzle.themes.join(', ')}

IMPORTANT: Work backwards from the solution. All hints must point toward THIS SPECIFIC MOVE. Do NOT suggest other moves or general tactics that don't lead to the solution.]`;

        sendMessage(updateMsg);
        isProcessingRef.current = false;

    }, [isConnected, currentPuzzle, currentMoveIndex, puzzleStatus, currentGameState, hintsUsed, sendMessage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (puzzleSessionState.session) {
                try {
                    puzzleSessionState.session.close();
                } catch (e) {
                    console.error("Error closing puzzle session:", e);
                }
                puzzleSessionState.session = null;
            }
            if (puzzleSessionState.audioElement) {
                puzzleSessionState.audioElement.pause();
                puzzleSessionState.audioElement.srcObject = null;
                puzzleSessionState.audioElement = null;
            }
            if (puzzleSessionState.mediaStream) {
                puzzleSessionState.mediaStream.getTracks().forEach((t) => t.stop());
                puzzleSessionState.mediaStream = null;
            }
            puzzleSessionState.isResponseActive = false;
            puzzleSessionState.messageQueue = [];
            puzzleSessionState.lastProcessedMoveIndex = null;
            setConnectionState("disconnected");
        };
    }, [setConnectionState]);
}
