import { createCoachAgent } from "@/lib/coach-agent";
import { useBoardStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import { OpenAIRealtimeWebRTC, RealtimeSession } from "@openai/agents/realtime";
import { useCallback, useEffect, useRef } from "react";

/**
 * CoachController hook - provides a clean interface to the AI coach connection and state.
 * Manages the realtime session, audio devices, and coach interactions.
 */
export function useCoachController() {
    // Get coach state
    const isConnected = useCoachStore((state) => state.isConnected);
    const isConnecting = useCoachStore((state) => state.isConnecting);
    const devices = useCoachStore((state) => state.devices);
    const selectedDeviceId = useCoachStore((state) => state.selectedDeviceId);
    const isTestingAudio = useCoachStore((state) => state.isTestingAudio);
    const transcript = useCoachStore((state) => state.transcript);
    const analysis = useCoachStore((state) => state.analysis);

    // Get coach actions
    const setIsConnected = useCoachStore((state) => state.setIsConnected);
    const setIsConnecting = useCoachStore((state) => state.setIsConnecting);
    const setDevices = useCoachStore((state) => state.setDevices);
    const setSelectedDeviceId = useCoachStore((state) => state.setSelectedDeviceId);
    const setIsTestingAudio = useCoachStore((state) => state.setIsTestingAudio);
    const setTranscript = useCoachStore((state) => state.setTranscript);
    const setAnalysis = useCoachStore((state) => state.setAnalysis);
    const resetCoachState = useCoachStore((state) => state.reset);

    // Get board state (needed for coach context)
    const playerColor = useBoardStore((state) => state.playerColor);
    const addArrow = useBoardStore((state) => state.addArrow);

    // Session refs (not stored in Zustand as they're not serializable)
    const sessionRef = useRef<RealtimeSession | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const lastProcessedMove = useRef<string | null>(null);
    const pendingMoveMessage = useRef<string | null>(null);
    const isResponseActive = useRef<boolean>(false);

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

        setIsConnected(false);
    }, [setIsConnected]);

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
            console.log("[Audio Test] Playing 440Hz tone for 1 second");

            // Play for 1 second
            await new Promise((resolve) => setTimeout(resolve, 1000));

            oscillator.stop();
            audioContext.close();
            console.log("[Audio Test] Done");
        } catch (error) {
            console.error("[Audio Test] Failed:", error);
        } finally {
            setIsTestingAudio(false);
        }
    }, [setIsTestingAudio]);

    const refreshDevices = useCallback(async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = allDevices.filter((d) => d.kind === "audioinput");
            setDevices(audioDevices);
            if (audioDevices.length > 0 && !selectedDeviceId) {
                const defaultDevice =
                    audioDevices.find((d) => d.deviceId === "default") || audioDevices[0];
                setSelectedDeviceId(defaultDevice.deviceId);
            }
        } catch (e) {
            console.error("Error enumerating devices:", e);
        }
    }, [selectedDeviceId, setDevices, setSelectedDeviceId]);

    const connect = useCallback(
        async (fen: string, moveHistory: string) => {
            console.log("[Connect Coach] Starting...", { isConnected });

            // If already connected, just disconnect
            if (isConnected) {
                console.log("[Connect Coach] Already connected, disconnecting");
                cleanupSession();
                return;
            }

            // Ensure any existing session is fully cleaned up before starting a new one
            cleanupSession();

            console.log("[Connect Coach] Setting isConnecting to true");
            setIsConnecting(true);
            try {
                // Request permissions first if we don't have them to get labels
                if (devices.some((d) => !d.label)) {
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

                // Get the specific media stream for the selected device
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
                });

                // Create an audio element for playback
                const audioElement = new Audio();
                audioElement.autoplay = true;
                audioElementRef.current = audioElement;

                console.log("[Audio Element Created]", {
                    autoplay: audioElement.autoplay,
                    muted: audioElement.muted,
                    volume: audioElement.volume,
                });

                const agent = createCoachAgent({
                    fen,
                    moveHistory,
                    playerColor,
                    onDrawArrow: addArrow,
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
                    console.log("[Transport Event]", event);

                    // Track response lifecycle
                    if (event.type === "response.created") {
                        isResponseActive.current = true;
                        console.log("[Response] Started");
                    }
                    if (event.type === "response.done") {
                        isResponseActive.current = false;
                        console.log("[Response] Ended");

                        // If there's a pending move message, send it now
                        if (pendingMoveMessage.current && sessionRef.current) {
                            console.log("[Sending pending move message]", pendingMoveMessage.current);
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
                    console.log("[Audio received]", event.data?.byteLength || 0, "bytes");
                });

                // Listen for audio transcript deltas
                session.transport.on("audio_transcript_delta", (event: any) => {
                    console.log("[Transcript delta]", event.delta);
                    setTranscript((prev) => prev + (event.delta || ""));
                });

                // Clear transcript when a new response starts (to show the new response)
                session.transport.on("response.audio_transcript.delta", (event: any) => {
                    // First delta of a new response - clear previous transcript
                    if (event.item_index === 0 && event.content_index === 0 && event.delta) {
                        setTranscript(event.delta);
                    } else {
                        setTranscript((prev) => prev + (event.delta || ""));
                    }
                });

                session.on("error", (err: any) => {
                    console.error("Session error:", err);
                    cleanupSession();
                });

                console.log("[Connecting to session...]", {
                    ephemeralKey: ephemeralKey.substring(0, 10) + "...",
                });

                // Add a timeout to the connection attempt
                const connectPromise = session.connect({ apiKey: ephemeralKey });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Connection timeout after 30 seconds")), 30000)
                );

                await Promise.race([connectPromise, timeoutPromise]);

                console.log("[Connected successfully]");

                // Re-check if we were cleaned up during the async connect call
                if (sessionRef.current === session) {
                    setIsConnected(true);
                    console.log("[Session active and connected]");

                    // Explicitly ensure audio element is ready to play
                    if (audioElementRef.current && audioElementRef.current.paused) {
                        try {
                            await audioElementRef.current.play();
                            console.log("[Audio Element] Started playback after connection");
                        } catch (e) {
                            console.warn("[Audio Element] Could not start playback:", e);
                        }
                    }
                } else {
                    console.log("[Session was cleaned up during connection, closing]");
                    session.close();
                }
            } catch (error) {
                console.error("Connection error:", error);
                setAnalysis("Failed to connect to the voice coach. Please check microphone permissions.");
                cleanupSession();
            } finally {
                setIsConnecting(false);
            }
        },
        [
            isConnected,
            devices,
            selectedDeviceId,
            playerColor,
            addArrow,
            setIsConnecting,
            setIsConnected,
            setTranscript,
            setAnalysis,
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
            console.log("[sendMessage] Response active, queueing message");
            pendingMoveMessage.current = message;
        } else {
            // Otherwise send immediately
            console.log("[sendMessage] Sending message immediately");
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
        return () => {
            cleanupSession();
        };
    }, [cleanupSession]);

    return {
        // State
        isConnected,
        isConnecting,
        devices,
        selectedDeviceId,
        isTestingAudio,
        transcript,
        analysis,

        // Actions
        connect,
        cleanupSession,
        testAudio,
        refreshDevices,
        setSelectedDeviceId,
        sendMessage,
        updateLastProcessedMove,
        getLastProcessedMove,
        resetCoachState,
    };
}
