"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";

function LoginContent() {
    const { user, loading, signInWithGoogle } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect");

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            if (redirectTo) {
                // If we have an explicit redirect, use it
                router.push(redirectTo);
            } else {
                // Otherwise go back to previous page in history
                router.back();
            }
        }
    }, [user, loading, router, redirectTo]);

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            setIsSigningIn(true);
            await signInWithGoogle();
            // Redirect will happen via the useEffect above
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to sign in with Google");
            setIsSigningIn(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    // Don't show login form if already logged in (will redirect)
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Redirecting...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                {/* Logo and header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex justify-center mb-6">
                        <div className="p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                            <Logo size={48} />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Welcome to Zugzwang
                    </h1>
                    <p className="text-muted-foreground">
                        Sign in to track your progress and save your games
                    </p>
                </div>

                {/* Sign in card */}
                <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-3 h-12 text-base"
                        onClick={handleGoogleSignIn}
                        disabled={isSigningIn}
                    >
                        {isSigningIn ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FcGoogle className="h-5 w-5" />
                        )}
                        {isSigningIn ? "Signing in..." : "Continue with Google"}
                    </Button>

                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-sm text-destructive text-center">{error}</p>
                        </div>
                    )}
                </div>

                {/* Terms and privacy */}
                <p className="mt-6 text-center text-sm text-muted-foreground">
                    By signing in, you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-primary transition-colors">
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline hover:text-primary transition-colors">
                        Privacy Policy
                    </Link>
                </p>

                {/* Back link */}
                <div className="mt-8 text-center">
                    <Link
                        href="/"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
