"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBoardController } from "@/hooks";
import { createCoachAgent } from "@/lib/coach-agent";
import { OpenAIRealtimeWebRTC, RealtimeSession } from '@openai/agents/realtime';
import { Loader2, Mic, MicOff, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// CoachPanel is now a smart component that gets its data from the board controller
export default function CoachPanel() {
    const { game, playerColor, getFen, getLastMove, addArrow } = useBoardController();
    const fen = getFen();
    const moveHistory = game.history().join(" ");
    const lastMove = getLastMove();
    const [analysis, setAnalysis] = useState<string>("");
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcript, setTranscript] = useState<string>("");
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [isTestingAudio, setIsTestingAudio] = useState(false);

    const sessionRef = useRef<RealtimeSession | null>(null);
    const lastProcessedMove = useRef<string | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
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
    }, []);

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
            console.log('[Audio Test] Playing 440Hz tone for 1 second');

            // Play for 1 second
            await new Promise(resolve => setTimeout(resolve, 1000));

            oscillator.stop();
            audioContext.close();
            console.log('[Audio Test] Done');
        } catch (error) {
            console.error('[Audio Test] Failed:', error);
        } finally {
            setIsTestingAudio(false);
        }
    }, []);

    const refreshDevices = useCallback(async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = allDevices.filter(d => d.kind === 'audioinput');
            setDevices(audioDevices);
            if (audioDevices.length > 0 && !selectedDeviceId) {
                const defaultDevice = audioDevices.find(d => d.deviceId === 'default') || audioDevices[0];
                setSelectedDeviceId(defaultDevice.deviceId);
            }
        } catch (e) {
            console.error("Error enumerating devices:", e);
        }
    }, [selectedDeviceId]);

    useEffect(() => {
        refreshDevices();
        navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
        };
    }, [refreshDevices]);

    const connectCoach = async () => {
        console.log('[Connect Coach] Starting...', { isConnected });

        // If already connected, just disconnect
        if (isConnected) {
            console.log('[Connect Coach] Already connected, disconnecting');
            cleanupSession();
            return;
        }

        // Ensure any existing session is fully cleaned up before starting a new one
        cleanupSession();

        console.log('[Connect Coach] Setting isConnecting to true');
        setIsConnecting(true);
        try {
            // Request permissions first if we don't have them to get labels
            if (devices.some(d => !d.label)) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop()); // Stop immediately
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
                audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
            });

            // Create an audio element for playback
            const audioElement = new Audio();
            audioElement.autoplay = true;
            audioElementRef.current = audioElement;

            // Log audio element state
            console.log('[Audio Element Created]', {
                autoplay: audioElement.autoplay,
                muted: audioElement.muted,
                volume: audioElement.volume
            });

            // Don't try to play yet - wait for WebRTC to set up the stream
            // The click on "Connect" button counts as user interaction for autoplay
            const agent = createCoachAgent({
                fen,
                moveHistory,
                playerColor,
                onDrawArrow: addArrow,
            });

            // Instantiate transport with the specific media stream and audio element
            const transport = new OpenAIRealtimeWebRTC({
                mediaStream,
                audioElement
            });

            const session = new RealtimeSession(agent, {
                transport,
                config: {
                    audio: {
                        input: {
                            turnDetection: {
                                type: 'semantic_vad',
                                eagerness: 'medium',
                                createResponse: true,  // Automatically create response after detecting end of speech
                            }
                        }
                    }
                }
            });
            sessionRef.current = session;

            // Listen for all transport events for debugging
            session.transport.on('*', (event: any) => {
                console.log('[Transport Event]', event);

                // Track response lifecycle
                if (event.type === 'response.created') {
                    isResponseActive.current = true;
                    console.log('[Response] Started');
                }
                if (event.type === 'response.done') {
                    isResponseActive.current = false;
                    console.log('[Response] Ended');

                    // If there's a pending move message, send it now
                    if (pendingMoveMessage.current && sessionRef.current) {
                        console.log('[Sending pending move message]', pendingMoveMessage.current);
                        sessionRef.current.sendMessage(pendingMoveMessage.current);
                        pendingMoveMessage.current = null;
                    }
                }

                // Log errors in detail
                if (event.type === 'response.done' && event.response?.status === 'failed') {
                    console.error('[Response Failed]', event.response.status_details);
                }
                if (event.type?.includes('failed') || event.type?.includes('error')) {
                    console.error('[Event Error]', event);
                }
            });

            // Listen for audio events
            session.transport.on('audio', (event: any) => {
                console.log('[Audio received]', event.data?.byteLength || 0, 'bytes');
            });

            // Listen for audio transcript deltas
            session.transport.on('audio_transcript_delta', (event: any) => {
                console.log('[Transcript delta]', event.delta);
                setTranscript(prev => prev + (event.delta || ""));
            });

            // Clear transcript when a new response starts (to show the new response)
            session.transport.on('response.audio_transcript.delta', (event: any) => {
                // First delta of a new response - clear previous transcript
                if (event.item_index === 0 && event.content_index === 0 && event.delta) {
                    setTranscript(event.delta);
                } else {
                    setTranscript(prev => prev + (event.delta || ""));
                }
            });

            session.on('error', (err: any) => {
                console.error("Session error:", err);
                cleanupSession(); // Clean up on internal session errors
            });

            console.log('[Connecting to session...]', { ephemeralKey: ephemeralKey.substring(0, 10) + '...' });

            // Add a timeout to the connection attempt
            const connectPromise = session.connect({ apiKey: ephemeralKey });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
            );

            await Promise.race([connectPromise, timeoutPromise]);

            console.log('[Connected successfully]');

            // Re-check if we were cleaned up during the async connect call
            if (sessionRef.current === session) {
                setIsConnected(true);
                console.log('[Session active and connected]');

                // Explicitly ensure audio element is ready to play
                // The "Connect" button click counts as user interaction
                if (audioElementRef.current && audioElementRef.current.paused) {
                    try {
                        await audioElementRef.current.play();
                        console.log('[Audio Element] Started playback after connection');
                    } catch (e) {
                        console.warn('[Audio Element] Could not start playback:', e);
                        // This is okay - audio will start when WebRTC provides the stream
                    }
                }
            } else {
                console.log('[Session was cleaned up during connection, closing]');
                session.close();
            }
        } catch (error) {
            console.error("Connection error:", error);
            setAnalysis("Failed to connect to the voice coach. Please check microphone permissions.");
            cleanupSession();
        } finally {
            setIsConnecting(false);
        }
    };

    // Update context when moves are made
    useEffect(() => {
        if (isConnected && sessionRef.current && lastMove && lastMove !== lastProcessedMove.current) {
            lastProcessedMove.current = lastMove;

            const updateMsg = `New move played: ${lastMove}. Current FEN: ${fen}. History: ${moveHistory}. Briefly explain the implications of this move.`;

            // If a response is already active, queue this message for later
            if (isResponseActive.current) {
                console.log('[Move] Response active, queueing message');
                pendingMoveMessage.current = updateMsg;
            } else {
                // Otherwise send immediately
                console.log('[Move] Sending message immediately');
                sessionRef.current.sendMessage(updateMsg);
            }
        }
    }, [lastMove, fen, moveHistory, isConnected, playerColor]);

    useEffect(() => {
        return () => {
            cleanupSession();
        };
    }, [cleanupSession]);

    return (
        <Card className="flex flex-col flex-1 h-full min-h-0 bg-card border-border overflow-hidden gap-0 py-0">
            <CardHeader className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 grid-cols-none shrink-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    AI Coach
                </CardTitle>
                {!isConnected && !isConnecting && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <Settings className="w-3.5 h-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel>Microphone Settings</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {devices.length === 0 ? (
                                <DropdownMenuItem disabled>No microphones found</DropdownMenuItem>
                            ) : (
                                devices.map((device) => (
                                    <DropdownMenuItem
                                        key={device.deviceId}
                                        onClick={() => setSelectedDeviceId(device.deviceId)}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <span className="truncate flex-1">
                                            {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                                        </span>
                                        {selectedDeviceId === device.deviceId && (
                                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                        )}
                                    </DropdownMenuItem>
                                ))
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={refreshDevices} className="text-xs justify-center text-muted-foreground">
                                Refresh Devices
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={testAudio} disabled={isTestingAudio} className="text-xs justify-center text-muted-foreground">
                                {isTestingAudio ? "Testing Audio..." : "Test Audio Output"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>

            <ScrollArea className="flex-1">
                <CardContent className="p-4 font-sans text-sm leading-relaxed">
                    {!isConnected && !isConnecting && !analysis ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                            <p className="text-muted-foreground italic text-center">
                                Connect the voice coach to start receiving live analysis and ask questions.
                            </p>
                            <Button
                                variant="default"
                                size="lg"
                                className="gap-2"
                                onClick={connectCoach}
                                disabled={isConnecting}
                            >
                                <Mic className="w-4 h-4" />
                                Connect Coach
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center mb-4">
                                <Button
                                    variant={isConnected ? "destructive" : "default"}
                                    size="lg"
                                    className="gap-2"
                                    onClick={connectCoach}
                                    disabled={isConnecting}
                                >
                                    {isConnecting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : isConnected ? (
                                        <>
                                            <MicOff className="w-4 h-4" />
                                            Disconnect
                                        </>
                                    ) : (
                                        <>
                                            <Mic className="w-4 h-4" />
                                            Connect Coach
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none">
                                {transcript && (
                                    <div className="text-foreground mb-4">
                                        <span className="text-primary mr-2 font-bold">Zuggy:</span>
                                        {transcript}
                                    </div>
                                )}
                                {analysis && (
                                    <div className="text-foreground whitespace-pre-wrap coaching-message p-3 bg-muted/20 rounded-md border border-border/50">
                                        {analysis}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </ScrollArea>
        </Card>
    );
}
