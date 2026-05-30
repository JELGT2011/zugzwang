"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePushToTalkOptions {
    onTranscript: (text: string) => void;
    minDurationMs?: number;
}

interface UsePushToTalkReturn {
    isRecording: boolean;
    isTranscribing: boolean;
    error: string | null;
    start: () => Promise<void>;
    stop: () => void;
    cancel: () => void;
    clearError: () => void;
}

function pickMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
    ];
    for (const type of candidates) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return undefined;
}

export function usePushToTalk({
    onTranscript,
    minDurationMs = 400,
}: UsePushToTalkOptions): UsePushToTalkReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedAtRef = useRef<number>(0);
    const cancelledRef = useRef(false);
    const onTranscriptRef = useRef(onTranscript);

    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    const releaseStream = useCallback(() => {
        const stream = streamRef.current;
        if (stream) {
            for (const track of stream.getTracks()) track.stop();
            streamRef.current = null;
        }
        recorderRef.current = null;
    }, []);

    useEffect(() => {
        return () => {
            releaseStream();
        };
    }, [releaseStream]);

    const start = useCallback(async () => {
        if (recorderRef.current) return;
        setError(null);
        cancelledRef.current = false;
        chunksRef.current = [];

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            console.error("[usePushToTalk] getUserMedia error:", e);
            if (e instanceof DOMException && e.name === "NotAllowedError") {
                setError("Microphone permission denied.");
            } else if (e instanceof DOMException && e.name === "NotFoundError") {
                setError("No microphone found.");
            } else {
                setError(e instanceof Error ? e.message : "Could not start microphone.");
            }
            return;
        }

        streamRef.current = stream;
        const mimeType = pickMimeType();
        const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onerror = (event) => {
            console.error("[usePushToTalk] MediaRecorder error:", event);
            setError("Recording failed.");
            releaseStream();
            setIsRecording(false);
        };

        recorder.onstop = async () => {
            const duration = Date.now() - startedAtRef.current;
            const cancelled = cancelledRef.current;
            const blobType = recorder.mimeType || mimeType || "audio/webm";
            const blob = new Blob(chunksRef.current, { type: blobType });
            chunksRef.current = [];
            releaseStream();
            setIsRecording(false);

            if (cancelled) return;
            if (duration < minDurationMs || blob.size < 1000) {
                return;
            }

            setIsTranscribing(true);
            try {
                const form = new FormData();
                const extension = blobType.includes("mp4")
                    ? "mp4"
                    : blobType.includes("ogg")
                        ? "ogg"
                        : "webm";
                form.append("audio", blob, `recording.${extension}`);
                const response = await fetch("/api/stt", {
                    method: "POST",
                    body: form,
                });
                if (!response.ok) {
                    const errBody = (await response
                        .json()
                        .catch(() => ({}))) as { error?: string };
                    throw new Error(
                        errBody.error ?? `STT request failed: ${response.status}`
                    );
                }
                const data = (await response.json()) as { text: string };
                const transcript = data.text.trim();
                if (transcript) {
                    onTranscriptRef.current(transcript);
                }
            } catch (e) {
                console.error("[usePushToTalk] transcription error:", e);
                setError(e instanceof Error ? e.message : "Transcription failed.");
            } finally {
                setIsTranscribing(false);
            }
        };

        try {
            recorder.start();
            setIsRecording(true);
        } catch (e) {
            console.error("[usePushToTalk] recorder.start error:", e);
            setError("Could not start recording.");
            releaseStream();
            setIsRecording(false);
        }
    }, [minDurationMs, releaseStream]);

    const stop = useCallback(() => {
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            try {
                recorder.stop();
            } catch (e) {
                console.warn("[usePushToTalk] stop error:", e);
            }
        }
    }, []);

    const cancel = useCallback(() => {
        cancelledRef.current = true;
        stop();
    }, [stop]);

    const clearError = useCallback(() => setError(null), []);

    return {
        isRecording,
        isTranscribing,
        error,
        start,
        stop,
        cancel,
        clearError,
    };
}
