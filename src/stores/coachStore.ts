import { create } from "zustand";

export type ConnectionState = "disconnected" | "connecting" | "connected";

interface CoachState {
    // Connection state
    connectionState: ConnectionState;

    // Audio devices
    devices: MediaDeviceInfo[];
    selectedDeviceId: string;
    isTestingAudio: boolean;

    // Coach output
    transcript: string;
    analysis: string;

    // Actions
    setConnectionState: (state: ConnectionState) => void;
    setDevices: (devices: MediaDeviceInfo[]) => void;
    setSelectedDeviceId: (deviceId: string) => void;
    setIsTestingAudio: (testing: boolean) => void;
    setTranscript: (transcript: string | ((prev: string) => string)) => void;
    setAnalysis: (analysis: string) => void;
    reset: () => void;
}

const initialState = {
    connectionState: "disconnected" as ConnectionState,
    devices: [],
    selectedDeviceId: "",
    isTestingAudio: false,
    transcript: "",
    analysis: "",
};

export const useCoachStore = create<CoachState>((set) => ({
    ...initialState,

    // Setters
    setConnectionState: (connectionState) => set({ connectionState }),
    setDevices: (devices) => set({ devices }),
    setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
    setIsTestingAudio: (testing) => set({ isTestingAudio: testing }),
    setTranscript: (transcript) =>
        set((state) => ({
            transcript: typeof transcript === "function" ? transcript(state.transcript) : transcript,
        })),
    setAnalysis: (analysis) => set({ analysis }),

    // Reset to initial state
    reset: () => set(initialState),
}));
