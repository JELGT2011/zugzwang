"use client";

import AudioDeviceModal from "@/components/AudioDeviceModal";
import { TranscriptView } from "@/components/TranscriptView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCoachController, useCoachSession } from "@/hooks";
import { Loader2, Mic, MicOff, Settings, Square } from "lucide-react";
import { useCallback, useEffect } from "react";

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
        isMicMuted,
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
        toggleMic,
    } = useCoachController();

    // Coach session - ONLY called here (handles move-watching and cleanup)
    useCoachSession();

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

    return (
        <Card className="flex flex-col flex-1 h-full min-h-0 bg-card border-border overflow-hidden gap-0 py-0">
            <CardHeader className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 grid-cols-none shrink-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    AI Coach
                </CardTitle>
                <div className="flex items-center gap-2">
                    {/* Connect/Disconnect Button */}
                    {!isConnected ? (
                        <Button
                            variant="default"
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
                            ) : (
                                <>
                                    <Mic className="w-3 h-3" />
                                    Connect
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] uppercase tracking-wider px-2 gap-1.5 text-destructive hover:text-destructive"
                            onClick={cleanupSession}
                        >
                            <MicOff className="w-3 h-3" />
                            Disconnect
                        </Button>
                    )}

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

            <div className="relative flex-1 min-h-0">
                <CardContent className="h-full p-4 pb-16 font-sans text-sm leading-relaxed">
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
                        <TranscriptView
                            transcriptHistory={transcriptHistory}
                            transcript={transcript}
                            emptyMessage={isMicMuted 
                                ? "Connected. Make a move or tap the mic to speak."
                                : "Listening... (speak or make a move)"}
                            className="h-full"
                        />
                    )}
                </CardContent>

                {/* Floating Transcribe/Stop Button */}
                {isConnected && (
                    <Button
                        variant={isMicMuted ? "default" : "secondary"}
                        size="icon"
                        className={`absolute bottom-3 right-3 h-10 w-10 rounded-full shadow-lg transition-all ${
                            !isMicMuted ? "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse" : ""
                        }`}
                        onClick={toggleMic}
                        title={isMicMuted ? "Start transcribing" : "Stop transcribing"}
                    >
                        {isMicMuted ? (
                            <Mic className="w-4 h-4" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                    </Button>
                )}
            </div>

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
