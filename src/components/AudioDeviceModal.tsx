"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Mic, Volume2 } from "lucide-react";

interface AudioDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    inputDevices: MediaDeviceInfo[];
    outputDevices: MediaDeviceInfo[];
    selectedInputDeviceId: string;
    selectedOutputDeviceId: string;
    onInputDeviceChange: (deviceId: string) => void;
    onOutputDeviceChange: (deviceId: string) => void;
}

export default function AudioDeviceModal({
    isOpen,
    onClose,
    onConfirm,
    inputDevices,
    outputDevices,
    selectedInputDeviceId,
    selectedOutputDeviceId,
    onInputDeviceChange,
    onOutputDeviceChange,
}: AudioDeviceModalProps) {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Audio Device Setup</DialogTitle>
                    <DialogDescription>
                        Select your microphone and speaker/headphones
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Input Device Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Mic className="w-4 h-4" />
                            Microphone (Input)
                        </div>
                        <div className="space-y-2">
                            {inputDevices.map((device) => (
                                <button
                                    key={device.deviceId}
                                    onClick={() => onInputDeviceChange(device.deviceId)}
                                    className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${selectedInputDeviceId === device.deviceId
                                            ? "border-primary bg-primary/10 text-foreground"
                                            : "border-border hover:bg-muted"
                                        }`}
                                >
                                    <div className="font-medium truncate">
                                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Output Device Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Volume2 className="w-4 h-4" />
                            Speaker/Headphones (Output)
                        </div>
                        <div className="space-y-2">
                            {outputDevices.map((device) => (
                                <button
                                    key={device.deviceId}
                                    onClick={() => onOutputDeviceChange(device.deviceId)}
                                    className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${selectedOutputDeviceId === device.deviceId
                                            ? "border-primary bg-primary/10 text-foreground"
                                            : "border-border hover:bg-muted"
                                        }`}
                                >
                                    <div className="font-medium truncate">
                                        {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Connect Button */}
                    <Button
                        onClick={handleConfirm}
                        className="w-full"
                        size="lg"
                    >
                        Connect with Selected Devices
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
