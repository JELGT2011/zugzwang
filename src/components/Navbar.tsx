"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { SignIn } from "./AuthButtons";
import { Logo } from "./Logo";
import { UserNav } from "./UserNav";

export function Navbar() {
    const { user, loading } = useAuth();

    return (
        <header className="bg-card/50 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Logo size={32} />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">Zugzwang</h1>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        <Link
                            href="/play"
                            className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            Play
                        </Link>
                        <Link
                            href="/puzzles"
                            className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            Puzzles
                        </Link>
                        <Link
                            href="/openings"
                            className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            Openings
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {loading ? (
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                    ) : user ? (
                        <UserNav />
                    ) : (
                        <SignIn />
                    )}
                </div>
            </div>
        </header>
    );
}
