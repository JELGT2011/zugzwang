"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import { Familiarity } from "@/types/user";
import { useState } from "react";

const FAMILIARITY_OPTIONS: {
  value: Familiarity;
  label: string;
  description: string;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: `New to chess or still learning the basics.`,
  },
  {
    value: "novice",
    label: "Novice",
    description: `Familiar with chess rules and basic strategies.`,
  },
  {
    value: "expert",
    label: "Expert",
    description: `Experienced player with advanced knowledge.`,
  },
];

export function FamiliarityModal() {
  const { setFamiliarity, needsFamiliaritySelection } = useUserProfile();
  const [savingValue, setSavingValue] = useState<Familiarity | null>(null);

  const handleSelect = async (familiarity: Familiarity) => {
    if (savingValue) return; // Prevent double-clicks
    setSavingValue(familiarity);
    try {
      await setFamiliarity(familiarity);
    } catch (error) {
      console.error("Failed to save familiarity:", error);
      setSavingValue(null);
    }
  };

  return (
    <Dialog open={needsFamiliaritySelection}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to Zugzwang!</DialogTitle>
          <DialogDescription>
            Tell us about your chess experience so we can personalize your
            training.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          {FAMILIARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={savingValue !== null}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
                savingValue === option.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-accent/50",
                savingValue !== null && savingValue !== option.value && "opacity-50"
              )}
            >
              <span className="font-medium">
                {savingValue === option.value ? "Saving..." : option.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
