import { useStockfish, type MoveAnnotation } from "@/contexts/StockfishContext";
import { useCoachStore } from "@/stores/coachStore";
import { OpenAIRealtimeWebRTC, RealtimeAgent, RealtimeSession, tool } from "@openai/agents/realtime";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Arrow } from "react-chessboard";
import { z } from "zod";
import { useBoardController } from "./useBoardController";

// Zod schemas for coach tools
const DrawArrowParameters = z.object({
    from: z.string().describe('The starting square (e.g., "e2").'),
    to: z.string().describe('The ending square (e.g., "e4").'),
    color: z.string().optional().describe('The color of the arrow (e.g., "red", "blue", "green"). Defaults to green.')
});

const MakeMoveParameters = z.object({
    from: z.string().describe('The starting square (e.g., "e2").'),
    to: z.string().describe('The ending square (e.g., "e4").'),
    promotion: z.string().optional().describe('Promotion piece if promoting a pawn (e.g., "q" for queen).')
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
The human player is playing as ${playerRole} and you are playing as ${engineRole}.

STOCKFISH GROUNDING:
- You are a mouthpiece for Stockfish. 
- With every player move, you will receive a detailed Stockfish analysis including top moves, evaluations, and threats.
- ALWAYS prioritize this provided analysis over your own chess knowledge. If Stockfish says a move is a blunder or identifies a threat, that is the absolute truth.
- Use the evaluation numbers (e.g., +1.5, -0.8) to gauge how well the player is doing.

Board:
${boardAscii}

Move history: ${moveHistory}

You have tools to interact with the chessboard:
1. draw_arrow: Use this to point out specific moves, threats, or squares on the board.
2. make_move: Use this to make moves on the board - REQUIRED when it's your turn as ${engineRole}.
3. get_top_moves: Use this to analyze positions and find the best moves.

IMPORTANT: You are not just coaching - you are also playing as ${engineRole}. When it's ${engineRole}'s turn to move, you MUST:
1. Use get_top_moves to analyze the position
2. Use make_move to execute the best move for ${engineRole}
3. Briefly explain your move choice (1-2 sentences max)
4. MANDATORY: Use draw_arrow to highlight the tactical reasoning (e.g., an attack, defense, or key square). NEVER just talk without drawing at least one arrow to illustrate your point.

ARROW USAGE IS MANDATORY:
- You must use draw_arrow for EVERY explanation. If you mention a piece or square, you MUST draw an arrow involving it.
- VISUALIZE THE ANALYSIS: Use the provided Stockfish "Threats" and "Defenses" data to draw arrows.
- COLOR CODING:
    - Use "red" for threats (from attacker to target).
    - Use "green" for general positional ideas.
    - Use "blue" for defenses (from defender to protected piece).
- If Stockfish identifies a threat (e.g., "Threat: Qh5 attacks f7"), draw a RED arrow from h5 to f7.
- If a move defends a piece, draw a BLUE arrow from the defender to the piece.

CONCISENESS IS CRITICAL:
- Your responses are spoken aloud. Keep the SPOKEN text extremely brief and focused.
- Tool calls (like draw_arrow) are NOT considered "verbose"—use them generously to illustrate your points.
- During the opening (first 10-15 moves), do not provide deep analysis unless specifically asked or if something very unusual happens. Just name the opening or make your move quickly.
- Avoid repeating information. If the user has questions, they will ask.
- Any mention of a square or piece MUST be accompanied by an arrow (draw_arrow).
`;

/**
 * Creates the tools available to the coach agent
 */
function createCoachTools(
    addArrow: (arrow: Arrow) => void,
    makeMove: (from: string, to: string, promotion?: string) => boolean,
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
        // tool({
        //     name: 'highlight_square',
        //     description: 'Highlight a specific square on the board.',
        //     parameters: HighlightSquareParameters,
        //     strict: true,
        //     execute: async ({ square, color }: z.infer<typeof HighlightSquareParameters>) => {
        //         const arrow: Arrow = { startSquare: square, endSquare: square, color: color || "green" };
        //         addArrow(arrow);
        //         return { status: "success" };
        //     }
        // }),
        tool({
            name: 'make_move',
            description: 'Make a move on the chessboard. Use this to demonstrate or suggest moves.',
            parameters: MakeMoveParameters,
            strict: true,
            execute: async ({ from, to, promotion }: z.infer<typeof MakeMoveParameters>) => {
                const success = makeMove(from, to, promotion);
                return {
                    status: success ? "success" : "failed",
                    message: success ? `Move ${from} to ${to} executed successfully` : `Invalid move from ${from} to ${to}`
                };
            }
        }),
        tool({
            name: 'get_top_moves',
            description: 'Analyze a position and get the top moves with evaluations. Use this to understand the best moves in a position.',
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
                        threats: m.threats.map(t => `${t.from}->${t.to} (${t.piece})`),
                        defenses: m.defends.map(d => `${d.from}->${d.to} (${d.piece})`),
                    }))
                };
            }
        })
    ];
}

/**
 * CoachController hook - provides a clean interface to the AI coach connection and state.
 * Manages the realtime session, audio devices, and coach interactions.
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

    const { playerColor, addArrow, makeMove, getFen, getLastMove, getMoveHistory, game } = useBoardController();

    // Get actual values (not functions) so we can watch them in useEffect
    const fen = getFen();
    const lastMove = getLastMove();
    const moveHistory = getMoveHistory();
    const currentTurn = game.turn();

    // Get stockfish context for analysis
    const { getTopMoves } = useStockfish();

    // Local state for device selection modal
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<{ fen: string; moveHistory: string; boardAscii: string } | null>(null);

    // Session refs (not stored in Zustand as they're not serializable)
    const sessionRef = useRef<RealtimeSession | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const lastProcessedMove = useRef<string | null>(null);
    const messageQueue = useRef<string[]>([]);
    const isResponseActive = useRef<boolean>(false);
    const currentUserTranscript = useRef<string>("");

    const cleanupSession = useCallback(() => {
        if (sessionRef.current) {
            try {
                sessionRef.current.close();
            } catch (e) {
                console.error("Error closing session:", e);
            }
            sessionRef.current = null;
        }
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.srcObject = null;
            audioElementRef.current = null;
        }
        // Reset state tracking refs
        isResponseActive.current = false;
        messageQueue.current = [];
        lastProcessedMove.current = null;

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
                audioElementRef.current = audioElement;

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
                    tools: createCoachTools(addArrow, makeMove, getTopMoves, getFen),
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
                sessionRef.current = session;

                // Listen for all transport events for debugging
                session.transport.on("*", (event: any) => {
                    console.debug("[Transport Event]", event);

                    // Track response lifecycle
                    if (event.type === "response.created") {
                        isResponseActive.current = true;
                    }
                    if (event.type === "response.done") {
                        isResponseActive.current = false;

                        // If there are pending messages in the queue, send them now
                        if (messageQueue.current.length > 0 && sessionRef.current) {
                            console.debug(`[Queue] Processing ${messageQueue.current.length} queued messages`);
                            while (messageQueue.current.length > 0) {
                                const msg = messageQueue.current.shift();
                                if (msg) {
                                    console.debug("[Queue] Sending message:", msg);
                                    sessionRef.current.sendMessage(msg);
                                }
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
                        currentUserTranscript.current += event.delta;
                    }
                });

                // Listen for user's audio transcript completion
                session.transport.on("conversation.item.input_audio_transcription.completed", (event: any) => {
                    console.debug("[User transcript completed]", event.transcript || currentUserTranscript.current);
                    const userText = event.transcript || currentUserTranscript.current;
                    if (userText?.trim()) {
                        addToHistory({
                            role: "user",
                            content: userText,
                            timestamp: Date.now(),
                        });
                    }
                    // Clear the building transcript
                    currentUserTranscript.current = "";
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
                if (sessionRef.current === session) {
                    setConnectionState("connected");
                    console.debug("[Session active and connected]");

                    // Explicitly ensure audio element is ready to play
                    if (audioElementRef.current && audioElementRef.current.paused) {
                        try {
                            await audioElementRef.current.play();
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
            makeMove,
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
        if (!sessionRef.current) {
            console.warn("[sendMessage] No active session");
            return;
        }

        // If a response is already active, queue this message for later
        if (isResponseActive.current) {
            console.debug("[sendMessage] Response active, queueing message:", message);
            messageQueue.current.push(message);
        } else {
            // Otherwise send immediately
            console.debug("[sendMessage] Sending message immediately");
            sessionRef.current.sendMessage(message);
        }
    }, []);

    const updateLastProcessedMove = useCallback((move: string) => {
        lastProcessedMove.current = move;
    }, []);

    const getLastProcessedMove = useCallback(() => {
        return lastProcessedMove.current;
    }, []);

    // Watch for moves and send updates to the coach
    // Only send messages for player moves, not agent's own moves
    useEffect(() => {
        if (!isConnected) return;

        const handleMoveUpdate = async () => {
            if (lastMove && lastMove !== lastProcessedMove.current) {
                lastProcessedMove.current = lastMove;

                // Check whose turn it is now
                // If it's NOT the player's turn, that means the player just moved (should notify agent)
                // If it IS the player's turn, that means the agent just moved (don't notify - agent knows its own move)
                const isPlayersTurn = currentTurn === playerColor;

                if (!isPlayersTurn) {
                    // Player just moved, notify the agent with Stockfish analysis
                    const moveHistoryStr = moveHistory.map(m => m.san).join(" ");
                    const boardAscii = game.ascii();

                    // Get Stockfish analysis for the new position
                    // We analyze from the agent's perspective (it's now the agent's turn to move or react)
                    const analysis = await getTopMoves(fen, 3, 15);
                    const analysisStr = analysis.map((m, i) => {
                        const threatStr = m.threats.length > 0 
                            ? `\n   - Threats: ${m.threats.map(t => `${t.from}->${t.to} (${t.piece})`).join(', ')}` 
                            : '';
                        const defenseStr = m.defends.length > 0 
                            ? `\n   - Defenses: ${m.defends.map(d => `${d.from}->${d.to} (${d.piece})`).join(', ')}` 
                            : '';
                        return `${i + 1}. ${m.san} (Eval: ${m.evaluation}${m.mate ? `, Mate in ${m.mate}` : ''})${threatStr}${defenseStr}`;
                    }).join('\n');

                    const updateMsg = `Player played: ${lastMove}.\n\nBoard:\n${boardAscii}\n\nHistory: ${moveHistoryStr}\n\nStockfish Analysis of current position:\n${analysisStr}\n\nUsing this analysis, briefly explain the implications of the player's move and the current state of the game. Use draw_arrow (RED for threats, BLUE for defenses, GREEN for your ideas) to visualize the specific piece interactions found by Stockfish.`;

                    console.debug("[sendMessage] Player moved, sending update to agent with analysis", updateMsg);
                    sendMessage(updateMsg);
                } else {
                    console.debug("[sendMessage] Agent made its own move, skipping notification");
                }
            }
        };

        handleMoveUpdate();
    }, [isConnected, lastMove, fen, moveHistory, game, currentTurn, playerColor, sendMessage, getTopMoves]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanupSession;
    }, [cleanupSession]);

    // Wrapper to initiate connection with device selection
    const initiateConnection = useCallback(async (overrides?: { fen: string, moveHistory: string, boardAscii: string }) => {
        // Get current board state or use overrides
        const moveHistoryStr = overrides ? overrides.moveHistory : moveHistory.map(m => m.san).join(" ");
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
