import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface TranscriptMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

interface CoachState {
    isOutputMuted: boolean;
    transcriptHistory: TranscriptMessage[];

    setIsOutputMuted: (muted: boolean) => void;
    addToHistory: (message: TranscriptMessage) => void;
    clearHistory: () => void;
    reset: () => void;
}

const initialState = {
    isOutputMuted: false,
    transcriptHistory: [],
};

export const useCoachStore = create<CoachState>()(
    devtools(
        (set) => ({
            ...initialState,

            setIsOutputMuted: (muted) => set({ isOutputMuted: muted }, false, "setIsOutputMuted"),

            addToHistory: (message) =>
                set((state) => ({
                    transcriptHistory: [...state.transcriptHistory, message],
                }), false, "addToHistory"),
            clearHistory: () => set({ transcriptHistory: [] }, false, "clearHistory"),

            reset: () => set(initialState, false, "reset"),
        }),
        { name: "CoachStore" }
    )
);
