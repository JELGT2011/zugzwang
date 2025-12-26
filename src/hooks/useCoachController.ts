import { useStockfish, type MoveAnnotation } from "@/contexts/StockfishContext";
import { useBoardStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import { OpenAIRealtimeWebRTC, RealtimeAgent, RealtimeSession, tool } from "@openai/agents/realtime";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Arrow } from "react-chessboard";
import { z } from "zod";

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
    fen: z.string().describe('The FEN position to analyze.'),
    numMoves: z.number().optional().describe('Number of top moves to return (default: 3).'),
    depth: z.number().optional().describe('Analysis depth (default: 15).')
});

/**
 * Creates the system instructions for the coach agent
 */
function createCoachInstructions(
    playerRole: string,
    engineRole: string,
    fen: string,
    moveHistory: string
): string {
    return `You are a Grandmaster Chess Coach named 'Zuggy'. 
Your goal is to explain the current state of the game and moves in a clear, engaging, and educational way.
The human player is playing as ${playerRole} and you are playing as ${engineRole}.
Current position (FEN): ${fen}
Move history: ${moveHistory}

You have tools to interact with the chessboard:
1. draw_arrow: Use this to point out specific moves, threats, or squares on the board.
2. make_move: Use this to make moves on the board - REQUIRED when it's your turn as ${engineRole}.
3. get_top_moves: Use this to analyze positions and find the best moves.

IMPORTANT: You are not just coaching - you are also playing as ${engineRole}. When it's ${engineRole}'s turn to move, you MUST:
1. Use get_top_moves to analyze the position
2. Use make_move to execute the best move for ${engineRole}
3. Briefly explain your move choice (1-2 sentences max)
4. Use draw_arrow to highlight the move you made or key tactical ideas

When it's the player's turn (${playerRole}), provide brief, encouraging coaching about the position.

Be encouraging and insightful. Keep your responses extremely concise as they are spoken.


Any mention of a square, or a piece, should be accompanied by either an arrow or a highlight.
`;
}

/**
 * Creates the tools available to the coach agent
 */
function createCoachTools(
    addArrow: (arrow: Arrow) => void,
    makeMove: (from: string, to: string, promotion?: string) => boolean,
    getTopMoves: (fen: string, numMoves?: number, depth?: number) => Promise<MoveAnnotation[]>
) {
    return [
        tool({
            name: 'draw_arrow',
            description: 'Draw an arrow on the chessboard to highlight a move or threat.',
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
                const moves = await getTopMoves(fen, numMoves, depth);
                return {
                    status: "success",
                    moves: moves.map(m => ({
                        move: m.san,
                        evaluation: m.evaluation,
                        mate: m.mate,
                        threats: m.threats,
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

    // Get board state and actions (needed for coach context)
    const playerColor = useBoardStore((state) => state.playerColor);
    const addArrow = useBoardStore((state) => state.addArrow);
    const makeMove = useBoardStore((state) => state.makeMove);

    // Get stockfish context for analysis
    const { getTopMoves } = useStockfish();

    // Local state for device selection modal
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<{ fen: string; moveHistory: string } | null>(null);

    // Session refs (not stored in Zustand as they're not serializable)
    const sessionRef = useRef<RealtimeSession | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const lastProcessedMove = useRef<string | null>(null);
    const pendingMoveMessage = useRef<string | null>(null);
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
        pendingMoveMessage.current = null;
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
            const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
            const audioOutputs = allDevices.filter((d) => d.kind === "audiooutput");

            setInputDevices(audioInputs);
            setOutputDevices(audioOutputs);

            console.debug("[Audio] Found devices:", {
                inputs: audioInputs.length,
                outputs: audioOutputs.length
            });
        } catch (e) {
            console.error("Error enumerating devices:", e);
        }
    }, [setInputDevices, setOutputDevices]);

    const connect = useCallback(
        async (fen: string, moveHistory: string) => {
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
                // If "default" or empty, use system default by passing true
                // Otherwise, use the specific device ID
                const audioConstraints =
                    selectedInputDeviceId && selectedInputDeviceId !== "default"
                        ? { deviceId: { exact: selectedInputDeviceId } }
                        : true;

                console.debug("[Audio] Using input device:",
                    selectedInputDeviceId === "default" || !selectedInputDeviceId
                        ? "system default"
                        : selectedInputDeviceId
                );

                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                });

                // Create an audio element for playback
                const audioElement = new Audio();
                audioElement.autoplay = true;
                audioElementRef.current = audioElement;

                // Set the output device if specified and browser supports it
                if (selectedOutputDeviceId && selectedOutputDeviceId !== "default") {
                    if ('setSinkId' in audioElement) {
                        try {
                            await (audioElement as any).setSinkId(selectedOutputDeviceId);
                            console.debug("[Audio] Using output device:", selectedOutputDeviceId);
                        } catch (err) {
                            console.warn("[Audio] Failed to set output device:", err);
                        }
                    }
                } else {
                    console.debug("[Audio] Using system default output device");
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
                    instructions: createCoachInstructions(playerRole, engineRole, fen, moveHistory),
                    tools: createCoachTools(addArrow, makeMove, getTopMoves)
                });

                // Instantiate transport with the specific media stream and audio element
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
                sessionRef.current = session;

                // Listen for all transport events for debugging
                session.transport.on("*", (event: any) => {
                    console.debug("[Transport Event]", event);

                    // Track response lifecycle
                    if (event.type === "response.created") {
                        isResponseActive.current = true;
                        console.debug("[Response] Started");
                    }
                    if (event.type === "response.done") {
                        isResponseActive.current = false;
                        console.debug("[Response] Ended");

                        // If there's a pending move message, send it now
                        if (pendingMoveMessage.current && sessionRef.current) {
                            console.debug("[Sending pending move message]", pendingMoveMessage.current);
                            sessionRef.current.sendMessage(pendingMoveMessage.current);
                            pendingMoveMessage.current = null;
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
                    console.debug("[User transcript delta]", event.delta);
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
                    console.debug("[Assistant transcript delta]", event.delta);
                    if (event.delta) {
                        setTranscript((prev) => prev + event.delta);
                    }
                });

                // Listen for assistant's audio transcript completion
                session.transport.on("response.output_audio_transcript.done", (event: any) => {
                    console.debug("[Assistant transcript done]", event.transcript);
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
            console.debug("[sendMessage] Response active, queueing message");
            pendingMoveMessage.current = message;
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

    // Cleanup on unmount
    useEffect(() => {
        return cleanupSession;
    }, [cleanupSession]);

    // Wrapper to initiate connection with device selection
    const initiateConnection = useCallback(async (fen: string, moveHistory: string) => {
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
            setPendingConnection({ fen, moveHistory });
            setShowDeviceModal(true);
        } else {
            // No device choice needed, connect immediately
            await connect(fen, moveHistory);
        }
    }, [refreshDevices, connect]);

    const confirmDeviceSelection = useCallback(async () => {
        if (pendingConnection) {
            await connect(pendingConnection.fen, pendingConnection.moveHistory);
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
