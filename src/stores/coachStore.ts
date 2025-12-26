import { create } from "zustand";

interface CoachState {
    // Connection state
    isConnected: boolean;
    isConnecting: boolean;

    // Audio devices
    devices: MediaDeviceInfo[];
    selectedDeviceId: string;
    isTestingAudio: boolean;

    // Coach output
    transcript: string;
    analysis: string;

    // Actions
    setIsConnected: (connected: boolean) => void;
    setIsConnecting: (connecting: boolean) => void;
    setDevices: (devices: MediaDeviceInfo[]) => void;
    setSelectedDeviceId: (deviceId: string) => void;
    setIsTestingAudio: (testing: boolean) => void;
    setTranscript: (transcript: string | ((prev: string) => string)) => void;
    setAnalysis: (analysis: string) => void;
    reset: () => void;
}

const initialState = {
    isConnected: false,
    isConnecting: false,
    devices: [],
    selectedDeviceId: "",
    isTestingAudio: false,
    transcript: "",
    analysis: "",
};

export const useCoachStore = create<CoachState>((set) => ({
    ...initialState,

    // Setters
    setIsConnected: (connected) => set({ isConnected: connected }),
    setIsConnecting: (connecting) => set({ isConnecting: connecting }),
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
