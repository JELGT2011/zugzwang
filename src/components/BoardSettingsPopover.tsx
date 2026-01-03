"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { MoveMethod } from "@/types/user";
import { Check, GripHorizontal, MousePointer2, Settings } from "lucide-react";
import { useState } from "react";

const MOVE_METHODS: { value: MoveMethod; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "drag",
    label: "Drag",
    description: "Drag pieces to move them",
    icon: <GripHorizontal className="h-5 w-5" />,
  },
  {
    value: "click",
    label: "Click",
    description: "Click piece, then click destination",
    icon: <MousePointer2 className="h-5 w-5" />,
  },
  {
    value: "both",
    label: "Both",
    description: "Use either drag or click to move",
    icon: (
      <div className="flex -space-x-1">
        <GripHorizontal className="h-4 w-4" />
        <MousePointer2 className="h-4 w-4" />
      </div>
    ),
  },
];

interface BoardSettingsPopoverProps {
  className?: string;
}

export default function BoardSettingsPopover({ className }: BoardSettingsPopoverProps) {
  const { moveMethod, setMoveMethod } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelect = async (method: MoveMethod) => {
    if (method === moveMethod) return;

    setIsUpdating(true);
    try {
      await setMoveMethod(method);
    } catch (error) {
      console.error("Failed to update move method:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={className}
        onClick={() => setIsOpen(true)}
        title="Board settings"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Board Settings</DialogTitle>
            <DialogDescription>
              Choose how you want to move pieces on the board.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            {MOVE_METHODS.map((method) => (
              <button
                key={method.value}
                onClick={() => handleSelect(method.value)}
                disabled={isUpdating}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  moveMethod === method.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                  {method.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{method.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {method.description}
                  </div>
                </div>
                {moveMethod === method.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
