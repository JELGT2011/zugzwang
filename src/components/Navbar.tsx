"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Menu, Gamepad2, Puzzle, BookOpen } from "lucide-react";
import { SignIn } from "./AuthButtons";
import { Logo } from "./Logo";
import { UserNav } from "./UserNav";
import { Button } from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Navbar() {
    const { user, loading } = useAuth();

    return (
        <header className="bg-card/50 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 md:gap-8">
                    {/* Mobile Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem asChild>
                                <Link href="/play" className="flex items-center gap-2 cursor-pointer">
                                    <Gamepad2 className="h-4 w-4" />
                                    Play
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/puzzles" className="flex items-center gap-2 cursor-pointer">
                                    <Puzzle className="h-4 w-4" />
                                    Puzzles
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/openings" className="flex items-center gap-2 cursor-pointer">
                                    <BookOpen className="h-4 w-4" />
                                    Openings
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Logo size={32} />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">Zugzwang</h1>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
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
