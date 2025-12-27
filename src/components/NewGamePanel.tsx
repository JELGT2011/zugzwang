"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface NewGamePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onStartGame: (asWhite: boolean) => void;
}

export default function NewGamePanel({
    isOpen,
    onClose,
    onStartGame,
}: NewGamePanelProps) {
    const handleColorSelect = async (asWhite: boolean) => {
        onStartGame(asWhite);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Start New Game</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Color selection */}
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground text-center">Choose your color</p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => handleColorSelect(true)}
                                className="flex-1 h-auto py-6 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground"
                            >
                                <span className="text-4xl">♔</span>
                                <span className="font-semibold text-base">White</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleColorSelect(false)}
                                className="flex-1 h-auto py-6 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground"
                            >
                                <span className="text-4xl">♚</span>
                                <span className="font-semibold text-base">Black</span>
                            </Button>
                        </div>
                    </div>

                    {/* Placeholder for AI difficulty (to be implemented later) */}
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground text-center">AI Difficulty</p>
                        <div className="text-center text-xs text-muted-foreground">
                            Coming soon...
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

