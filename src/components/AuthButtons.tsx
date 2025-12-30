"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";

export function SignIn() {
    const { signInWithGoogle } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            await signInWithGoogle();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to sign in with Google");
        }
    };

    return (
        <Dialog defaultOpen>
            <DialogTrigger asChild>
                <Button variant="outline">Sign In</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[360px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">
                        Welcome
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Sign in to continue.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 h-11"
                        onClick={handleGoogleSignIn}
                    >
                        <FcGoogle className="h-5 w-5" />
                        Continue with Google
                    </Button>

                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}
                </div>

                <div className="text-center text-xs text-muted-foreground px-4">
                    By signing in, you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-primary transition-colors">
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline hover:text-primary transition-colors">
                        Privacy Policy
                    </Link>
                    .
                </div>
            </DialogContent>
        </Dialog>
    );
}
