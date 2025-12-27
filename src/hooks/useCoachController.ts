import { useStockfish, type MoveAnnotation } from "@/contexts/StockfishContext";
import { useBoardStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import { OpenAIRealtimeWebRTC, RealtimeAgent, RealtimeSession, tool } from "@openai/agents/realtime";
import { Chess, type Move } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arrow } from "react-chessboard";
import { z } from "zod";
import { useBoardController } from "./useBoardController";

// ============================================================================
// Module-level session state (shared across all hook instances)
// This ensures that session refs are not duplicated when the hook is called
// from multiple components.
// ============================================================================
const sharedSessionState = {
    session: null as RealtimeSession | null,
    audioElement: null as HTMLAudioElement | null,
    lastProcessedMove: null as string | null,
    messageQueue: [] as string[],
    isResponseActive: false,
    currentUserTranscript: "",
};

// Zod schemas for coach tools
const DrawArrowParameters = z.object({
    from: z.string().describe('The starting square (e.g., "e2").'),
    to: z.string().describe('The ending square (e.g., "e4").'),
    color: z.string().optional().describe('The color of the arrow (e.g., "red", "blue", "green"). Defaults to green.')
});

const GetTopMovesParameters = z.object({
    fen: z.string().optional().describe('The FEN position to analyze. Defaults to the current board position if not provided.'),
    numMoves: z.number().optional().describe('Number of top moves to return (default: 3).'),
    depth: z.number().optional().describe('Analysis depth (default: 15).')
});

/**
 * Creates the system instructions for the coach agent
 */
const createCoachInstructions = (
    playerRole: string,
    engineRole: string,
    moveHistory: string,
    boardAscii: string
) => `
You are a Grandmaster Chess Coach named 'Zuggy'. 
Your goal is to explain the current state of the game and moves in a clear, engaging, and educational way.
The human player is playing as ${playerRole} and the computer opponent is playing as ${engineRole}.

ANALYSIS GROUNDING:
- After every turn, you receive detailed position analysis that includes:
  * TOP MOVES with evaluations (positive = White advantage, negative = Black advantage)
  * WHY GOOD: Specific threats created (which piece attacks what)
  * HANGING PIECES: Opponent pieces that are attacked but undefended
  * TACTICAL NOTES: Checks, captures, and other important features
- ALWAYS use this tactical data to explain WHY a move is good or bad, not just that it is.
- When explaining threats, reference the specific squares and pieces from the analysis.

Board:
${boardAscii}

Move history: ${moveHistory}

You have tools to interact with the chessboard:
1. draw_arrow: Visualize threats, attacks, defenses, and ideas on the board.
2. get_top_moves: Analyze ANY position. Pass a FEN string to analyze hypothetical positions.

IMPORTANT: You are a COACH, not the player. The computer moves are handled by a separate engine. When it's your turn to speak:
1. Explain WHY the last moves were good/bad using the tactical data (threats, hanging pieces).
2. MANDATORY: Use draw_arrow to visualize the threats and ideas. NEVER talk without arrows.

ARROW USAGE IS MANDATORY:
- When the analysis says "knight on f3 attacks pawn on e5", draw a RED arrow from f3 to e5.
- When a piece is hanging (attacked but undefended), draw a RED arrow to it showing the threat.
- When suggesting a move, draw a GREEN arrow showing the move.
- When showing a defensive move, draw a BLUE arrow.
- EVERY piece or square you mention MUST have a corresponding arrow.

CONCISENESS IS CRITICAL:
- Your responses are spoken aloud. Keep speech brief (1-2 sentences).
- Arrow tool calls don't count as verbose—use many arrows to illustrate your points.
- During the opening (first 10-15 moves), just name the opening unless something unusual happens.
- Focus on the most important tactical feature: the biggest threat or hanging piece.
`;

/**
 * Creates the tools available to the coach agent
 */
function createCoachTools(
    addArrow: (arrow: Arrow) => void,
    getTopMoves: (fen: string, numMoves?: number, depth?: number) => Promise<MoveAnnotation[]>,
    getCurrentFen: () => string
) {
    return [
        tool({
            name: 'draw_arrow',
            description: 'Draw a tactical arrow on the chessboard. MANDATORY: Use this whenever you mention a piece, square, threat, or move to provide visual context. Use "red" for threats, "green" for moves/suggestions, and "blue" for positional ideas.',
            parameters: DrawArrowParameters,
            strict: true,
            execute: async ({ from, to, color }: z.infer<typeof DrawArrowParameters>) => {
                const arrow: Arrow = { startSquare: from, endSquare: to, color: color || "green" };
                addArrow(arrow);
                return { status: "success" };
            }
        }),
        tool({
            name: 'get_top_moves',
            description: 'Analyze a position and get the top moves with evaluations, threats, and tactical features. Use this to understand WHY a move is good.',
            parameters: GetTopMovesParameters,
            strict: true,
            execute: async ({ fen, numMoves = 3, depth = 15 }: z.infer<typeof GetTopMovesParameters>) => {
                const targetFen = fen || getCurrentFen();
                const moves = await getTopMoves(targetFen, numMoves, depth);
                return {
                    status: "success",
                    moves: moves.map(m => ({
                        move: m.san,
                        evaluation: m.evaluation,
                        mate: m.mate,
                        isCheck: m.isCheck,
                        isCapture: m.isCapture,
                        capturedPiece: m.capturedPiece,
                        // Tactical reasoning
                        newThreats: m.tactical.threats
                            .filter(t => t.isNewThreat)
                            .map(t => `${t.attacker} on ${t.attackerSquare} attacks ${t.target} on ${t.targetSquare}`),
                        hangingPieces: m.tactical.hanging
                            .map(h => `${h.piece} on ${h.square} (value: ${h.value})`),
                        tacticalNotes: m.tactical.notes,
                        principalVariation: m.principalVariation.slice(0, 4).join(" "),
                    }))
                };
            }
        })
    ];
}

/**
 * CoachController hook - provides a clean interface to the AI coach connection and state.
 * Manages the realtime session, audio devices, and coach interactions.
 * 
 * NOTE: This hook is safe to call from multiple components. Session state is shared
 * at the module level to prevent duplicate sessions.
 * 
 * For move-watching effects, use useCoachSession() which should only be called ONCE.
 */
export function useCoachController() {
    // Get coach state
    const connectionState = useCoachStore((state) => state.connectionState);
    const inputDevices = useCoachStore((state) => state.inputDevices);
    const outputDevices = useCoachStore((state) => state.outputDevices);
    const selectedInputDeviceId = useCoachStore((state) => state.selectedInputDeviceId);
    const selectedOutputDeviceId = useCoachStore((state) => state.selectedOutputDeviceId);
    const isTestingAudio = useCoachStore((state) => state.isTestingAudio);
    const transcript = useCoachStore((state) => state.transcript);
    const transcriptHistory = useCoachStore((state) => state.transcriptHistory);

    // Get coach actions
    const setConnectionState = useCoachStore((state) => state.setConnectionState);
    const setInputDevices = useCoachStore((state) => state.setInputDevices);
    const setOutputDevices = useCoachStore((state) => state.setOutputDevices);
    const setSelectedInputDeviceId = useCoachStore((state) => state.setSelectedInputDeviceId);
    const setSelectedOutputDeviceId = useCoachStore((state) => state.setSelectedOutputDeviceId);
    const setIsTestingAudio = useCoachStore((state) => state.setIsTestingAudio);
    const setTranscript = useCoachStore((state) => state.setTranscript);
    const addToHistory = useCoachStore((state) => state.addToHistory);
    const clearHistory = useCoachStore((state) => state.clearHistory);
    const resetCoachState = useCoachStore((state) => state.reset);

    // Derived state
    const isConnected = connectionState === "connected";
    const isConnecting = connectionState === "connecting";

    const { playerColor, addArrow, getFen, getMoveHistory, game } = useBoardController();

    // Get actual values (not functions) for use in connect()
    const fen = getFen();
    const moveHistory = getMoveHistory();

    // Get stockfish context for analysis
    const { getTopMoves } = useStockfish();

    // Local state for device selection modal
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<{ fen: string; moveHistory: string; boardAscii: string } | null>(null);

    const cleanupSession = useCallback(() => {
        if (sharedSessionState.session) {
            try {
                sharedSessionState.session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            }
            sharedSessionState.session = null;
        }
        if (sharedSessionState.audioElement) {
            sharedSessionState.audioElement.pause();
            sharedSessionState.audioElement.srcObject = null;
            sharedSessionState.audioElement = null;
        }
        // Reset state tracking
        sharedSessionState.isResponseActive = false;
        sharedSessionState.messageQueue = [];
        sharedSessionState.lastProcessedMove = null;

        setConnectionState("disconnected");
    }, [setConnectionState]);

    const testAudio = useCallback(async () => {
        setIsTestingAudio(true);
        try {
            // Create a simple test tone using Web Audio API
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 440; // A4 note
            gainNode.gain.value = 0.3; // 30% volume

            oscillator.start();
            console.debug("[Audio Test] Playing 440Hz tone for 1 second");

            // Play for 1 second
            await new Promise((resolve) => setTimeout(resolve, 1000));

            oscillator.stop();
            audioContext.close();
            console.debug("[Audio Test] Done");
        } catch (error) {
            console.error("[Audio Test] Failed:", error);
        } finally {
            setIsTestingAudio(false);
        }
    }, [setIsTestingAudio]);

    const refreshDevices = useCallback(async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = allDevices.filter((d) => d.kind === "audioinput" && d.deviceId);
            const audioOutputs = allDevices.filter((d) => d.kind === "audiooutput" && d.deviceId);

            setInputDevices(audioInputs);
            setOutputDevices(audioOutputs);

            // Auto-select first device if none selected or if "default" was previously selected
            const currentStore = useCoachStore.getState();
            if ((!currentStore.selectedInputDeviceId || currentStore.selectedInputDeviceId === "default") && audioInputs.length > 0) {
                setSelectedInputDeviceId(audioInputs[0].deviceId);
            }
            if ((!currentStore.selectedOutputDeviceId || currentStore.selectedOutputDeviceId === "default") && audioOutputs.length > 0) {
                setSelectedOutputDeviceId(audioOutputs[0].deviceId);
            }

            console.debug("[Audio] Found devices:", {
                inputs: audioInputs.length,
                outputs: audioOutputs.length
            });
        } catch (e) {
            console.error("Error enumerating devices:", e);
        }
    }, [setInputDevices, setOutputDevices, setSelectedInputDeviceId, setSelectedOutputDeviceId]);

    const connect = useCallback(
        async (fen: string, moveHistory: string, boardAscii: string) => {
            console.debug("[Connect Coach] Starting...", { isConnected });

            // If already connected, just disconnect
            if (isConnected) {
                console.debug("[Connect Coach] Already connected, disconnecting");
                cleanupSession();
                return;
            }

            // Ensure any existing session is fully cleaned up before starting a new one
            cleanupSession();

            console.debug("[Connect Coach] Setting state to connecting");
            setConnectionState("connecting");
            try {
                // Request permissions first if we don't have them to get labels
                if (inputDevices.some((d: MediaDeviceInfo) => !d.label)) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach((t) => t.stop()); // Stop immediately
                        await refreshDevices();
                    } catch (e) {
                        console.warn("Could not get microphone permission for labels:", e);
                    }
                }

                const response = await fetch("/api/realtime/session", { method: "POST" });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to get ephemeral key: ${errorText}`);
                }

                const data = await response.json();
                const ephemeralKey = data.value;
                if (!ephemeralKey) {
                    console.error("No ephemeral key found in response data:", data);
                    throw new Error("No ephemeral key found in response");
                }

                // Get the media stream for the selected input device
                // Use the specific device ID
                const audioConstraints =
                    selectedInputDeviceId
                        ? { deviceId: { exact: selectedInputDeviceId } }
                        : true;

                console.debug("[Audio] Using input device:",
                    selectedInputDeviceId || "system default"
                );

                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                });

                // Create an audio element for playback
                const audioElement = new Audio();
                audioElement.autoplay = true;
                sharedSessionState.audioElement = audioElement;

                // Set the output device if specified and browser supports it
                if (selectedOutputDeviceId) {
                    if ('setSinkId' in audioElement) {
                        try {
                            await (audioElement as any).setSinkId(selectedOutputDeviceId);
                            console.debug("[Audio] Using output device:", selectedOutputDeviceId);
                        } catch (err) {
                            console.warn("[Audio] Failed to set output device:", err);
                        }
                    }
                } else {
                    console.debug("[Audio] Using default output device");
                }

                console.debug("[Audio Element Created]", {
                    autoplay: audioElement.autoplay,
                    muted: audioElement.muted,
                    volume: audioElement.volume,
                });

                // Create the coach agent
                const playerRole = playerColor === 'w' ? 'White' : 'Black';
                const engineRole = playerColor === 'w' ? 'Black' : 'White';

                const agent = new RealtimeAgent({
                    name: 'Zuggy',
                    instructions: createCoachInstructions(playerRole, engineRole, moveHistory, boardAscii),
                    tools: createCoachTools(addArrow, getTopMoves, getFen),
                });

                // Instantiate transport with the specific media stream and audio element
                const transport = new OpenAIRealtimeWebRTC({
                    mediaStream,
                    audioElement,
                });

                const session = new RealtimeSession(agent, {
                    // model: "gpt-realtime-mini-2025-10-06",
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
                sharedSessionState.session = session;

                // Listen for all transport events for debugging
                session.transport.on("*", (event: any) => {
                    console.debug("[Transport Event]", event);

                    // Track response lifecycle
                    if (event.type === "response.created") {
                        sharedSessionState.isResponseActive = true;
                    }
                    if (event.type === "response.done") {
                        sharedSessionState.isResponseActive = false;

                        // If there are pending messages in the queue, send them now
                        if (sharedSessionState.messageQueue.length > 0 && sharedSessionState.session) {
                            console.debug(`[Queue] Processing ${sharedSessionState.messageQueue.length} queued messages`);
                            while (sharedSessionState.messageQueue.length > 0) {
                                const msg = sharedSessionState.messageQueue.shift();
                                if (!msg) continue;

                                console.debug("[Queue] Sending message:", msg);
                                sharedSessionState.session.sendMessage(msg);
                            }
                        }
                    }

                    // Log errors in detail
                    if (event.type === "response.done" && event.response?.status === "failed") {
                        console.error("[Response Failed]", event.response.status_details);
                    }
                    if (event.type?.includes("failed") || event.type?.includes("error")) {
                        console.error("[Event Error]", event);
                    }
                });

                // Listen for audio events
                session.transport.on("audio", (event: any) => {
                    console.debug("[Audio received]", event.data?.byteLength || 0, "bytes");
                });

                // Listen for user's audio transcript deltas
                session.transport.on("conversation.item.input_audio_transcription.delta", (event: any) => {
                    if (event.delta) {
                        sharedSessionState.currentUserTranscript += event.delta;
                    }
                });

                // Listen for user's audio transcript completion
                session.transport.on("conversation.item.input_audio_transcription.completed", (event: any) => {
                    console.debug("[User transcript completed]", event.transcript || sharedSessionState.currentUserTranscript);
                    const userText = event.transcript || sharedSessionState.currentUserTranscript;
                    if (userText?.trim()) {
                        addToHistory({
                            role: "user",
                            content: userText,
                            timestamp: Date.now(),
                        });
                    }
                    // Clear the building transcript
                    sharedSessionState.currentUserTranscript = "";
                });

                // Listen for assistant's audio transcript deltas
                session.transport.on("response.output_audio_transcript.delta", (event: any) => {
                    if (event.delta) {
                        setTranscript((prev) => prev + event.delta);
                    }
                });

                // Listen for assistant's audio transcript completion
                session.transport.on("response.output_audio_transcript.done", (event: any) => {
                    // Save the completed transcript to history
                    const assistantText = event.transcript || useCoachStore.getState().transcript;
                    if (assistantText?.trim()) {
                        addToHistory({
                            role: "assistant",
                            content: assistantText,
                            timestamp: Date.now(),
                        });
                        // Clear the current transcript for the next message
                        setTranscript("");
                    }
                });

                session.on("error", (err: any) => {
                    console.error("Session error:", err);
                    cleanupSession();
                });

                console.debug("[Connecting to session...]", {
                    ephemeralKey: ephemeralKey.substring(0, 10) + "...",
                });

                // Add a timeout to the connection attempt
                const connectPromise = session.connect({ apiKey: ephemeralKey });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Connection timeout after 30 seconds")), 30000)
                );

                await Promise.race([connectPromise, timeoutPromise]);

                console.debug("[Connected successfully]");

                // Re-check if we were cleaned up during the async connect call
                if (sharedSessionState.session === session) {
                    setConnectionState("connected");
                    console.debug("[Session active and connected]");

                    // Explicitly ensure audio element is ready to play
                    if (sharedSessionState.audioElement && sharedSessionState.audioElement.paused) {
                        try {
                            await sharedSessionState.audioElement.play();
                            console.debug("[Audio Element] Started playback after connection");
                        } catch (e) {
                            console.warn("[Audio Element] Could not start playback:", e);
                        }
                    }
                } else {
                    console.debug("[Session was cleaned up during connection, closing]");
                    session.close();
                }
            } catch (error) {
                console.error("Connection error:", error);
                cleanupSession();
            } finally {
                if (connectionState === "connecting") {
                    setConnectionState("disconnected");
                }
            }
        },
        [
            isConnected,
            inputDevices,
            selectedInputDeviceId,
            selectedOutputDeviceId,
            playerColor,
            addArrow,
            getTopMoves,
            getFen,
            connectionState,
            setConnectionState,
            setTranscript,
            addToHistory,
            cleanupSession,
            refreshDevices,
        ]
    );

    const sendMessage = useCallback((message: string) => {
        if (!sharedSessionState.session) {
            console.warn("[sendMessage] No active session");
            return;
        }

        // If a response is already active, queue this message for later
        if (sharedSessionState.isResponseActive) {
            console.debug("[sendMessage] Response active, queueing message:", message);
            sharedSessionState.messageQueue.push(message);
        } else {
            // Otherwise send immediately
            console.debug("[sendMessage] Sending message immediately");
            sharedSessionState.session.sendMessage(message);
        }
    }, []);

    const updateLastProcessedMove = useCallback((move: string) => {
        sharedSessionState.lastProcessedMove = move;
    }, []);

    const getLastProcessedMove = useCallback(() => {
        return sharedSessionState.lastProcessedMove;
    }, []);

    // Wrapper to initiate connection with device selection
    const initiateConnection = useCallback(async (overrides?: { fen: string, moveHistory: string, boardAscii: string }) => {
        // Get current board state or use overrides
        const moveHistoryStr = overrides ? overrides.moveHistory : moveHistory.map((m: Move) => m.san).join(" ");
        const boardAsciiStr = overrides ? overrides.boardAscii : game.ascii();
        const fenStr = overrides ? overrides.fen : fen;

        // Refresh devices first
        await refreshDevices();

        // Get fresh device lists from store after refresh
        const currentInputs = useCoachStore.getState().inputDevices;
        const currentOutputs = useCoachStore.getState().outputDevices;

        // Check if we have multiple devices
        const hasMultipleInputs = currentInputs.length > 1;
        const hasMultipleOutputs = currentOutputs.length > 1;

        if (hasMultipleInputs || hasMultipleOutputs) {
            // Show device selection modal
            setPendingConnection({ fen: fenStr, moveHistory: moveHistoryStr, boardAscii: boardAsciiStr });
            setShowDeviceModal(true);
        } else {
            // No device choice needed, connect immediately
            await connect(fenStr, moveHistoryStr, boardAsciiStr);
        }
    }, [fen, moveHistory, game, refreshDevices, connect]);

    const confirmDeviceSelection = useCallback(async () => {
        if (pendingConnection) {
            await connect(pendingConnection.fen, pendingConnection.moveHistory, pendingConnection.boardAscii);
            setPendingConnection(null);
        }
    }, [connect, pendingConnection]);

    return {
        // State
        connectionState,
        isConnected,
        isConnecting,
        inputDevices,
        outputDevices,
        selectedInputDeviceId,
        selectedOutputDeviceId,
        isTestingAudio,
        transcript,
        transcriptHistory,
        showDeviceModal,

        // Actions
        initiateConnection,
        connect,
        confirmDeviceSelection,
        cleanupSession,
        testAudio,
        refreshDevices,
        setSelectedInputDeviceId,
        setSelectedOutputDeviceId,
        setShowDeviceModal,
        sendMessage,
        updateLastProcessedMove,
        getLastProcessedMove,
        clearHistory,
        resetCoachState,
    };
}

/**
 * CoachSession hook - handles the session lifecycle and move-watching effects.
 * 
 * IMPORTANT: This hook should only be called ONCE in the entire app (typically in CoachPanel).
 * It contains side effects that:
 * 1. Watch for moves and send updates to the coach
 * 2. Clean up the session on unmount
 */
export function useCoachSession() {
    // Get state from stores
    const connectionState = useCoachStore((state) => state.connectionState);
    const setConnectionState = useCoachStore((state) => state.setConnectionState);

    const fen = useBoardStore((state) => state.fen);
    const moveHistory = useBoardStore((state) => state.moveHistory);
    const playerColor = useBoardStore((state) => state.playerColor);
    const isThinking = useBoardStore((state) => state.isThinking);

    const isConnected = connectionState === "connected";

    // Get stockfish context for analysis
    const { getTopMoves } = useStockfish();

    // Ref to track if we're currently processing to prevent race conditions
    const isProcessingRef = useRef(false);

    // Reconstruct Chess instance from FEN (memoized to avoid infinite loops)
    const game = useMemo(() => new Chess(fen), [fen]);

    // Compute derived values
    const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].san : null;
    const currentTurn = game.turn();
    const gameOver = game.isGameOver();

    // Helper to send messages
    const sendMessage = useCallback((message: string) => {
        if (!sharedSessionState.session) {
            console.warn("[sendMessage] No active session");
            return;
        }

        if (sharedSessionState.isResponseActive) {
            console.debug("[sendMessage] Response active, queueing message:", message);
            sharedSessionState.messageQueue.push(message);
        } else {
            console.debug("[sendMessage] Sending message immediately");
            sharedSessionState.session.sendMessage(message);
        }
    }, []);

    // Watch for moves and send updates to the coach
    // This effect ONLY runs in this hook instance
    useEffect(() => {
        if (!isConnected) return;

        const handleMoveUpdate = async () => {
            // We want to notify the coach in two cases:
            // 1. It's the player's turn and a move was just made (by the engine)
            // 2. The game is over
            const isPlayersTurn = currentTurn === playerColor;
            const shouldNotify = (isPlayersTurn && !isThinking && lastMove !== sharedSessionState.lastProcessedMove) || gameOver;

            // Guard against race conditions and duplicate processing
            if (!shouldNotify || !lastMove || isProcessingRef.current) {
                return;
            }

            // Set processing flag immediately
            isProcessingRef.current = true;
            sharedSessionState.lastProcessedMove = lastMove;

            console.debug("[useCoachSession] Turn complete or Game Over, notifying coach...");

            try {
                const moveHistoryStr = moveHistory.map((m: Move) => m.san).join(" ");
                const boardAscii = game.ascii();

                // Get position analysis for the current position (player's turn or game over)
                const analysis = await getTopMoves(fen, 3, 15);
                const analysisStr = analysis.map((m, i) => {
                    const lines: string[] = [];
                    
                    // Main move info
                    const evalStr = m.mate ? `Mate in ${m.mate}` : `Eval: ${m.evaluation ?? 'N/A'}`;
                    lines.push(`${i + 1}. ${m.san} (${evalStr})`);
                    
                    // Why is this move good? Tactical features
                    const newThreats = m.tactical.threats.filter(t => t.isNewThreat);
                    if (newThreats.length > 0) {
                        const threatDescriptions = newThreats.map(t => 
                            `${t.attacker} on ${t.attackerSquare} attacks ${t.target} on ${t.targetSquare}`
                        );
                        lines.push(`   WHY GOOD: Creates threats: ${threatDescriptions.join('; ')}`);
                    }
                    
                    if (m.tactical.hanging.length > 0) {
                        const hangingDescriptions = m.tactical.hanging.map(h => 
                            `${h.piece} on ${h.square}`
                        );
                        lines.push(`   HANGING PIECES: ${hangingDescriptions.join(', ')}`);
                    }
                    
                    if (m.isCapture && m.capturedPiece) {
                        lines.push(`   CAPTURES: ${m.capturedPiece}`);
                    }
                    
                    if (m.isCheck) {
                        lines.push(`   GIVES CHECK`);
                    }
                    
                    if (m.tactical.notes.length > 0) {
                        lines.push(`   NOTES: ${m.tactical.notes.join(', ')}`);
                    }
                    
                    // Expected continuation (brief)
                    if (m.principalVariation.length > 1) {
                        lines.push(`   Expected play: ${m.principalVariation.slice(0, 4).join(' ')}`);
                    }
                    
                    return lines.join('\n');
                }).join('\n\n');

                let updateMsg = "";
                if (gameOver) {
                    const status = game.isCheckmate()
                        ? (game.turn() === "w" ? "Black wins by checkmate!" : "White wins by checkmate!")
                        : "The game is over (Draw/Stalemate).";
                    updateMsg = `THE GAME IS OVER. ${status}\n\nFinal Board:\n${boardAscii}\n\nFinal History: ${moveHistoryStr}\n\nFinal Analysis:\n${analysisStr}\n\nPlease provide a brief wrap-up of the game, highlighting the critical moments and why the game ended the way it did. Use draw_arrow to illustrate key points.`;
                } else {
                    updateMsg = `Turn complete. Last move: ${lastMove}.\n\nBoard:\n${boardAscii}\n\nHistory: ${moveHistoryStr}\n\nPosition Analysis (best moves for the player):\n${analysisStr}\n\nExplain the current state briefly. Focus on the tactical features above (threats, hanging pieces). Use draw_arrow to visualize: RED for threats (attacker -> target), BLUE for hanging pieces or defenses, GREEN for suggested moves.`;
                }

                console.debug("[useCoachSession] Sending turn update to agent with analysis");
                sendMessage(updateMsg);
            } finally {
                isProcessingRef.current = false;
            }
        };

        handleMoveUpdate();
    }, [isConnected, lastMove, fen, moveHistory, game, currentTurn, playerColor, isThinking, gameOver, sendMessage, getTopMoves]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sharedSessionState.session) {
                try {
                    sharedSessionState.session.close();
                } catch (e) {
                    console.error("Error closing session:", e);
                }
                sharedSessionState.session = null;
            }
            if (sharedSessionState.audioElement) {
                sharedSessionState.audioElement.pause();
                sharedSessionState.audioElement.srcObject = null;
                sharedSessionState.audioElement = null;
            }
            sharedSessionState.isResponseActive = false;
            sharedSessionState.messageQueue = [];
            sharedSessionState.lastProcessedMove = null;

            setConnectionState("disconnected");
        };
    }, [setConnectionState]);
}
