import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type ConnectionState = "disconnected" | "connecting" | "connected";

export interface TranscriptMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

interface CoachState {
    // Connection state
    connectionState: ConnectionState;

    // Audio devices
    inputDevices: MediaDeviceInfo[];
    outputDevices: MediaDeviceInfo[];
    selectedInputDeviceId: string;
    selectedOutputDeviceId: string;
    isTestingAudio: boolean;

    // Microphone mute state - default to muted (not transcribing)
    isMicMuted: boolean;

    // Audio setup tracking - true once user has confirmed device selection this session
    audioSetupComplete: boolean;

    // Coach output - current active transcript (what's being spoken now)
    transcript: string;

    // Full transcript history
    transcriptHistory: TranscriptMessage[];

    // Actions
    setConnectionState: (state: ConnectionState) => void;
    setInputDevices: (devices: MediaDeviceInfo[]) => void;
    setOutputDevices: (devices: MediaDeviceInfo[]) => void;
    setSelectedInputDeviceId: (deviceId: string) => void;
    setSelectedOutputDeviceId: (deviceId: string) => void;
    setIsTestingAudio: (testing: boolean) => void;
    setIsMicMuted: (muted: boolean) => void;
    setAudioSetupComplete: (complete: boolean) => void;
    setTranscript: (transcript: string | ((prev: string) => string)) => void;
    addToHistory: (message: TranscriptMessage) => void;
    clearHistory: () => void;
    reset: () => void;
}

const initialState = {
    connectionState: "disconnected" as ConnectionState,
    inputDevices: [],
    outputDevices: [],
    selectedInputDeviceId: "",
    selectedOutputDeviceId: "",
    isTestingAudio: false,
    isMicMuted: true, // Default to muted (not transcribing)
    audioSetupComplete: false,
    transcript: "",
    transcriptHistory: [],
};

export const useCoachStore = create<CoachState>()(
    devtools(
        (set) => ({
            ...initialState,

            // Setters
            setConnectionState: (connectionState) => set({ connectionState }, false, "setConnectionState"),
            setInputDevices: (inputDevices) => set({ inputDevices }, false, "setInputDevices"),
            setOutputDevices: (outputDevices) => set({ outputDevices }, false, "setOutputDevices"),
            setSelectedInputDeviceId: (selectedInputDeviceId) => set({ selectedInputDeviceId }, false, "setSelectedInputDeviceId"),
            setSelectedOutputDeviceId: (selectedOutputDeviceId) => set({ selectedOutputDeviceId }, false, "setSelectedOutputDeviceId"),
            setIsTestingAudio: (testing) => set({ isTestingAudio: testing }, false, "setIsTestingAudio"),
            setIsMicMuted: (muted) => set({ isMicMuted: muted }, false, "setIsMicMuted"),
            setAudioSetupComplete: (complete) => set({ audioSetupComplete: complete }, false, "setAudioSetupComplete"),
            setTranscript: (transcript) =>
                set((state) => ({
                    transcript: typeof transcript === "function" ? transcript(state.transcript) : transcript,
                }), false, "setTranscript"),

            // Transcript history management
            addToHistory: (message) =>
                set((state) => ({
                    transcriptHistory: [...state.transcriptHistory, message],
                }), false, "addToHistory"),
            clearHistory: () => set({ transcriptHistory: [] }, false, "clearHistory"),

            // Reset to initial state
            reset: () => set(initialState, false, "reset"),
        }),
        { name: "CoachStore" }
    )
);
