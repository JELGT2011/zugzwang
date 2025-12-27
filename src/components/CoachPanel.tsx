"use client";

import AudioDeviceModal from "@/components/AudioDeviceModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCoachController, useCoachSession } from "@/hooks";
import { Loader2, Mic, MicOff, Settings } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

// CoachPanel handles the coach UI and session lifecycle
export default function CoachPanel() {
    const {
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
        initiateConnection,
        confirmDeviceSelection,
        cleanupSession,
        testAudio,
        refreshDevices,
        setSelectedInputDeviceId,
        setSelectedOutputDeviceId,
        setShowDeviceModal,
    } = useCoachController();

    // Coach session - ONLY called here (handles move-watching and cleanup)
    useCoachSession();

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refreshDevices();
        navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
        };
    }, [refreshDevices]);

    const handleConnect = useCallback(() => {
        if (isConnected) {
            cleanupSession();
        } else {
            // initiateConnection will get current fen/moveHistory from board controller internally
            initiateConnection();
        }
    }, [isConnected, cleanupSession, initiateConnection]);

    // Auto-scroll to bottom whenever messages change
    useEffect(() => {
        if (scrollBottomRef.current) {
            // Use setTimeout to ensure DOM has fully updated
            setTimeout(() => {
                scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 0);
        }
    }, [transcriptHistory, transcript]);

    return (
        <Card className="flex flex-col flex-1 h-full min-h-0 bg-card border-border overflow-hidden gap-0 py-0">
            <CardHeader className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 grid-cols-none shrink-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    AI Coach
                </CardTitle>
                <div className="flex items-center gap-2">
                    {/* Connect/Disconnect Button */}
                    <Button
                        variant={isConnected ? "destructive" : "default"}
                        size="sm"
                        className="h-7 text-[10px] uppercase tracking-wider px-2 gap-1.5"
                        onClick={handleConnect}
                        disabled={isConnecting}
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Connecting
                            </>
                        ) : isConnected ? (
                            <>
                                <MicOff className="w-3 h-3" />
                                Disconnect
                            </>
                        ) : (
                            <>
                                <Mic className="w-3 h-3" />
                                Connect
                            </>
                        )}
                    </Button>

                    {/* Settings Dropdown */}
                    {!isConnecting && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    title="Audio settings"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={testAudio} disabled={isTestingAudio} className="text-sm">
                                    {isTestingAudio ? "Testing Audio..." : "Test Audio Output"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>

            <ScrollArea className="flex-1 overflow-hidden" ref={scrollAreaRef}>
                <CardContent className="p-4 font-sans text-sm leading-relaxed">
                    {!isConnected && !isConnecting ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <p className="text-muted-foreground italic text-center text-sm">
                                Click Connect to start the AI coach.
                            </p>
                        </div>
                    ) : isConnecting ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground italic text-center text-sm">
                                Connecting to coach...
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Transcript History */}
                            {transcriptHistory.length === 0 && !transcript ? (
                                <div className="text-muted-foreground italic text-sm py-4">
                                    Listening... (make a move or ask a question)
                                </div>
                            ) : (
                                <>
                                    {transcriptHistory.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`${msg.role === "user" ? "text-muted-foreground" : "text-foreground"}`}
                                        >
                                            <span className={`mr-2 font-bold ${msg.role === "user" ? "text-foreground" : "text-primary"}`}>
                                                {msg.role === "user" ? "You:" : "Zuggy:"}
                                            </span>
                                            {msg.content}
                                        </div>
                                    ))}

                                    {/* Current active transcript (being spoken now) */}
                                    {transcript && (
                                        <div className="text-foreground">
                                            <span className="text-primary mr-2 font-bold">Zuggy:</span>
                                            {transcript}
                                        </div>
                                    )}
                                </>
                            )}
                            {/* Invisible element to scroll to */}
                            <div ref={scrollBottomRef} />
                        </div>
                    )}
                </CardContent>
            </ScrollArea>

            {/* Audio Device Selection Modal */}
            <AudioDeviceModal
                isOpen={showDeviceModal}
                onClose={() => setShowDeviceModal(false)}
                onConfirm={confirmDeviceSelection}
                inputDevices={inputDevices}
                outputDevices={outputDevices}
                selectedInputDeviceId={selectedInputDeviceId}
                selectedOutputDeviceId={selectedOutputDeviceId}
                onInputDeviceChange={setSelectedInputDeviceId}
                onOutputDeviceChange={setSelectedOutputDeviceId}
            />
        </Card>
    );
}
