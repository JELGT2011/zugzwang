"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
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
    return (
        <Dialog defaultOpen>
            <DialogTrigger asChild>
                <Button variant="outline">Sign In</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[360px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Welcome Back</DialogTitle>
                    <DialogDescription className="text-center">
                        Choose your preferred sign-in method to continue.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 h-11"
                        onClick={() => signIn("google")}
                    >
                        <FcGoogle className="h-5 w-5" />
                        Continue with Google
                    </Button>
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
