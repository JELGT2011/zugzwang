"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBoardController, useCoachController } from "@/hooks";
import { Loader2, Mic, MicOff, Settings } from "lucide-react";
import { useCallback, useEffect } from "react";

// CoachPanel is now a smart component that gets its data from the controllers
export default function CoachPanel() {
    const { getFen, getLastMove, getMoveHistory } = useBoardController();
    const {
        isConnected,
        isConnecting,
        devices,
        selectedDeviceId,
        isTestingAudio,
        transcript,
        analysis,
        connect,
        testAudio,
        refreshDevices,
        setSelectedDeviceId,
        sendMessage,
        updateLastProcessedMove,
        getLastProcessedMove,
    } = useCoachController();

    const fen = getFen();
    const moveHistory = getMoveHistory().join(" ");
    const lastMove = getLastMove();

    useEffect(() => {
        refreshDevices();
        navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
        };
    }, [refreshDevices]);

    const handleConnect = useCallback(() => {
        connect(fen, moveHistory);
    }, [connect, fen, moveHistory]);

    // Update context when moves are made
    useEffect(() => {
        if (isConnected && lastMove && lastMove !== getLastProcessedMove()) {
            updateLastProcessedMove(lastMove);
            const updateMsg = `New move played: ${lastMove}. Current FEN: ${fen}. History: ${moveHistory}. Briefly explain the implications of this move.`;
            sendMessage(updateMsg);
        }
    }, [lastMove, fen, moveHistory, isConnected, sendMessage, updateLastProcessedMove, getLastProcessedMove]);

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
                                onClick={handleConnect}
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
                                    onClick={handleConnect}
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
