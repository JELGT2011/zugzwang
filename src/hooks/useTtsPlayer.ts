import { useCoachStore } from "@/stores/coachStore";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Streams TTS audio from /api/tts/stream and plays it via HTMLAudioElement.
 *
 * A single audio element is reused for the lifetime of the hook. Calling
 * playText while audio is playing aborts the current request and replaces
 * the playback. Respects coachStore.isOutputMuted (text is dropped silently
 * when muted).
 */
export function useTtsPlayer() {
    const isOutputMuted = useCoachStore((s) => s.isOutputMuted);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const inflightRef = useRef<AbortController | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const audio = new Audio();
        audio.preload = "auto";
        audioRef.current = audio;

        const onEnded = () => setIsPlaying(false);
        const onError = () => setIsPlaying(false);
        const onPause = () => {
            if (audio.ended) setIsPlaying(false);
        };
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);
        audio.addEventListener("pause", onPause);

        return () => {
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
            audio.removeEventListener("pause", onPause);
            audio.pause();
            audio.src = "";
            audioRef.current = null;
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
            if (inflightRef.current) {
                inflightRef.current.abort();
                inflightRef.current = null;
            }
        };
    }, []);

    const stop = useCallback(() => {
        if (inflightRef.current) {
            inflightRef.current.abort();
            inflightRef.current = null;
        }
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
        setIsPlaying(false);
    }, []);

    const playText = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;
            if (useCoachStore.getState().isOutputMuted) return;

            if (inflightRef.current) {
                inflightRef.current.abort();
            }
            const controller = new AbortController();
            inflightRef.current = controller;

            try {
                const response = await fetch("/api/tts/stream", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({ text: trimmed }),
                });

                if (!response.ok) {
                    const errBody = (await response
                        .json()
                        .catch(() => ({}))) as { error?: string };
                    throw new Error(
                        errBody.error ?? `TTS request failed: ${response.status}`
                    );
                }

                const blob = await response.blob();
                if (controller.signal.aborted) return;

                const audio = audioRef.current;
                if (!audio) return;

                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                }
                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;

                audio.src = url;
                setIsPlaying(true);
                await audio.play();
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") return;
                console.error("[useTtsPlayer] playback error:", e);
                setIsPlaying(false);
            } finally {
                if (inflightRef.current === controller) {
                    inflightRef.current = null;
                }
            }
        },
        []
    );

    useEffect(() => {
        if (isOutputMuted) stop();
    }, [isOutputMuted, stop]);

    return { playText, stop, isPlaying, isMuted: isOutputMuted };
}
