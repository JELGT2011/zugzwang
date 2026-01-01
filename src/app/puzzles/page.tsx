"use client";

import AudioDeviceModal from "@/components/AudioDeviceModal";
import PuzzleCard from "@/components/PuzzleCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useRandomPuzzle } from "@/hooks/useRandomPuzzle";
import { useUserProfile } from "@/hooks/useUserProfile";
import { fetchPuzzlesNearRating } from "@/lib/puzzles";
import { usePuzzleStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import {
    PUZZLE_THEMES,
    THEME_DISPLAY_NAMES,
    type PuzzleTheme,
} from "@/types/puzzle";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    Filter,
    Flame,
    LogIn,
    Play,
    Search,
    Sparkles,
    Star,
    TrendingUp,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// Popular themes to highlight
const POPULAR_THEMES: PuzzleTheme[] = [
    "fork",
    "pin",
    "discoveredAttack",
    "backRankMate",
    "sacrifice",
    "mateIn2",
    "deflection",
    "skewer",
];

export default function PuzzlesPage() {
    const { user, loading: authLoading, signInWithGoogle } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();
    const {
        puzzles,
        isLoading,
        error,
        filters,
        sortOption,
        updateFilter,
        clearFilters,
        setSortOption,
        setPuzzles,
        setLoading,
        setError,
        getFilteredPuzzles,
    } = usePuzzleStore();

    // Audio device setup state
    const audioSetupComplete = useCoachStore((state) => state.audioSetupComplete);
    const inputDevices = useCoachStore((state) => state.inputDevices);
    const outputDevices = useCoachStore((state) => state.outputDevices);
    const selectedInputDeviceId = useCoachStore((state) => state.selectedInputDeviceId);
    const selectedOutputDeviceId = useCoachStore((state) => state.selectedOutputDeviceId);
    const setInputDevices = useCoachStore((state) => state.setInputDevices);
    const setOutputDevices = useCoachStore((state) => state.setOutputDevices);
    const setSelectedInputDeviceId = useCoachStore((state) => state.setSelectedInputDeviceId);
    const setSelectedOutputDeviceId = useCoachStore((state) => state.setSelectedOutputDeviceId);
    const setAudioSetupComplete = useCoachStore((state) => state.setAudioSetupComplete);

    const [showFilters, setShowFilters] = useState(true);
    const [showAudioModal, setShowAudioModal] = useState(false);

    const puzzleElo = profile?.elos?.puzzle;

    // Random puzzle navigation
    const { goToRandomPuzzle, isLoading: loadingRandom } = useRandomPuzzle(puzzleElo);

    // Request microphone permission and enumerate devices on mount
    const initializeAudioDevices = useCallback(async () => {
        try {
            // Request permission first to get device labels
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());

            // Now enumerate devices
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = allDevices.filter((d) => d.kind === "audioinput" && d.deviceId);
            const audioOutputs = allDevices.filter((d) => d.kind === "audiooutput" && d.deviceId);

            setInputDevices(audioInputs);
            setOutputDevices(audioOutputs);

            // Set default selections if not already set
            if (!selectedInputDeviceId && audioInputs.length > 0) {
                setSelectedInputDeviceId(audioInputs[0].deviceId);
            }
            if (!selectedOutputDeviceId && audioOutputs.length > 0) {
                setSelectedOutputDeviceId(audioOutputs[0].deviceId);
            }

            // Show the modal for device selection
            setShowAudioModal(true);
        } catch (e) {
            console.error("Error initializing audio devices:", e);
            // If user denies permission, mark setup as complete anyway so we don't keep prompting
            setAudioSetupComplete(true);
        }
    }, [selectedInputDeviceId, selectedOutputDeviceId, setInputDevices, setOutputDevices, setSelectedInputDeviceId, setSelectedOutputDeviceId, setAudioSetupComplete]);

    // Show audio setup modal on mount if not already completed
    useEffect(() => {
        if (user && !authLoading && !profileLoading && !audioSetupComplete) {
            initializeAudioDevices();
        }
    }, [user, authLoading, profileLoading, audioSetupComplete, initializeAudioDevices]);

    const handleAudioSetupConfirm = useCallback(() => {
        setAudioSetupComplete(true);
        setShowAudioModal(false);
    }, [setAudioSetupComplete]);

    const handleAudioSetupClose = useCallback(() => {
        // If they close without confirming, still mark as complete so we don't keep prompting
        setAudioSetupComplete(true);
        setShowAudioModal(false);
    }, [setAudioSetupComplete]);

    // Load puzzles from Firestore near the player's puzzle ELO
    const loadPuzzles = useCallback(async () => {
        if (!user || !puzzleElo) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchPuzzlesNearRating(puzzleElo, {
                range: 100, // ±200 from player's ELO
                pageSize: 10,
            });
            setPuzzles(result.puzzles);
        } catch (err) {
            console.error("Failed to load puzzles from Firestore:", err);
            setError("Failed to load puzzles. Please try again.");
        }
    }, [user, puzzleElo, setPuzzles, setLoading, setError]);

    useEffect(() => {
        if (user && puzzleElo && puzzles.length === 0 && !isLoading) {
            loadPuzzles();
        }
    }, [user, puzzleElo, puzzles.length, isLoading, loadPuzzles]);


    // eslint-disable-next-line react-hooks/exhaustive-deps
    const filteredPuzzles = useMemo(() => getFilteredPuzzles(), [getFilteredPuzzles, filters, sortOption, puzzles]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.difficulty) count++;
        if (filters.themes && filters.themes.length > 0) count++;
        if (filters.minRating !== undefined || filters.maxRating !== undefined) count++;
        return count;
    }, [filters]);

    const toggleTheme = (theme: PuzzleTheme) => {
        const currentThemes = filters.themes || [];
        if (currentThemes.includes(theme)) {
            updateFilter(
                "themes",
                currentThemes.filter((t) => t !== theme)
            );
        } else {
            updateFilter("themes", [...currentThemes, theme]);
        }
    };

    // Show loading state while checking auth or loading profile
    if (authLoading || (user && profileLoading)) {
        return (
            <main className="py-8">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center space-y-4">
                            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                            <p className="text-muted-foreground">Loading...</p>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // Show sign-in prompt if not authenticated
    if (!user) {
        return (
            <main className="py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                            <LogIn className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-semibold">Sign In Required</h2>
                            <p className="text-muted-foreground max-w-md">
                                Sign in to access our collection of chess puzzles from the Lichess database.
                            </p>
                        </div>
                        <Button onClick={signInWithGoogle} size="lg" className="gap-2">
                            <LogIn className="w-4 h-4" />
                            Sign in with Google
                        </Button>
                    </div>
                </div>
            </main>
        );
    }

    if (isLoading) {
        return (
            <main className="py-8">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center space-y-4">
                            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                            <p className="text-muted-foreground">Loading puzzles...</p>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                            <X className="w-8 h-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-semibold">Error Loading Puzzles</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={loadPuzzles} variant="outline">
                            Try Again
                        </Button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="py-8 min-h-screen">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="mb-8 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1
                                className="text-4xl md:text-5xl font-bold"
                                style={{
                                    backgroundImage: "linear-gradient(to right, #458588, #d79921)",
                                    WebkitBackgroundClip: "text",
                                    backgroundClip: "text",
                                    color: "transparent",
                                }}
                            >
                                Chess Puzzles
                            </h1>
                            <p className="text-muted-foreground mt-2">
                                Sharpen your tactical vision with chess puzzles.
                            </p>
                        </div>
                        <Button
                            onClick={goToRandomPuzzle}
                            disabled={loadingRandom || !puzzleElo}
                            size="lg"
                            className="gap-2"
                        >
                            <Play className="w-4 h-4" />
                            {loadingRandom ? "Loading..." : "Random Puzzle"}
                        </Button>
                    </div>

                    {/* Quick stats */}
                    <div className="flex flex-wrap gap-3">
                        <Badge variant="outline" className="px-3 py-1">
                            <Sparkles className="w-3 h-3 mr-1.5" />
                            {filteredPuzzles.length} puzzles found
                        </Badge>
                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                                Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                                <X className="w-3 h-3 ml-1" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Filters Sidebar */}
                    <aside className={`lg:w-72 shrink-0 ${showFilters ? "" : "hidden lg:block"}`}>
                        <Card className="p-4 bg-card/50 backdrop-blur border-border/50 sticky top-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Filters
                                </h2>
                            </div>

                            <div className="space-y-6">

                                {/* Sort */}
                                <div>
                                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">Sort By</h3>
                                    <div className="space-y-1">
                                        {[
                                            { field: "rating" as const, label: "Rating", icon: Star },
                                            { field: "popularity" as const, label: "Popularity", icon: Flame },
                                            { field: "nbPlays" as const, label: "Most Played", icon: TrendingUp },
                                        ].map(({ field, label, icon: Icon }) => (
                                            <button
                                                key={field}
                                                onClick={() =>
                                                    setSortOption({
                                                        field,
                                                        direction:
                                                            sortOption.field === field
                                                                ? sortOption.direction === "asc"
                                                                    ? "desc"
                                                                    : "asc"
                                                                : "asc",
                                                    })
                                                }
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${sortOption.field === field
                                                    ? "bg-primary/10 text-primary"
                                                    : "hover:bg-muted/50 text-muted-foreground"
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Icon className="w-4 h-4" />
                                                    {label}
                                                </span>
                                                {sortOption.field === field && (
                                                    sortOption.direction === "asc" ? (
                                                        <ArrowUpAZ className="w-4 h-4" />
                                                    ) : (
                                                        <ArrowDownAZ className="w-4 h-4" />
                                                    )
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Popular Themes */}
                                <div>
                                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">Popular Themes</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {POPULAR_THEMES.map((theme) => (
                                            <button
                                                key={theme}
                                                onClick={() => toggleTheme(theme)}
                                                className={`px-2.5 py-1 rounded-md text-xs transition-all ${filters.themes?.includes(theme)
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    }`}
                                            >
                                                {THEME_DISPLAY_NAMES[theme]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* All Themes */}
                                <div>
                                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">All Themes</h3>
                                    <ScrollArea className="h-48">
                                        <div className="flex flex-wrap gap-1.5 pr-4">
                                            {PUZZLE_THEMES.filter((t) => !POPULAR_THEMES.includes(t)).map((theme) => (
                                                <button
                                                    key={theme}
                                                    onClick={() => toggleTheme(theme)}
                                                    className={`px-2 py-0.5 rounded text-[11px] transition-all ${filters.themes?.includes(theme)
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                        }`}
                                                >
                                                    {THEME_DISPLAY_NAMES[theme]}
                                                </button>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        </Card>
                    </aside>

                    {/* Mobile filter toggle */}
                    {!showFilters && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(true)}
                            className="lg:hidden fixed bottom-4 right-4 z-50 shadow-lg"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                            {activeFilterCount > 0 && (
                                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                    )}

                    {/* Puzzle Grid */}
                    <div className="flex-1 min-w-0">
                        {filteredPuzzles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                    <Search className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium mb-2">No puzzles found</h3>
                                <p className="text-muted-foreground text-sm mb-4">
                                    Try adjusting your filters or search query
                                </p>
                                <Button variant="outline" size="sm" onClick={clearFilters}>
                                    Clear all filters
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredPuzzles.map((puzzle) => (
                                    <PuzzleCard key={puzzle.id} puzzle={puzzle} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Audio Device Setup Modal - shown on first visit to puzzles */}
            <AudioDeviceModal
                isOpen={showAudioModal}
                onClose={handleAudioSetupClose}
                onConfirm={handleAudioSetupConfirm}
                inputDevices={inputDevices}
                outputDevices={outputDevices}
                selectedInputDeviceId={selectedInputDeviceId}
                selectedOutputDeviceId={selectedOutputDeviceId}
                onInputDeviceChange={setSelectedInputDeviceId}
                onOutputDeviceChange={setSelectedOutputDeviceId}
            />
        </main>
    );
}
