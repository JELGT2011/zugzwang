"use client";

import { signIn } from "next-auth/react";
import { Button } from "./ui/button";

export function SignIn() {
    return (
        <Button
            variant="outline"
            onClick={() => signIn("google")}
        >
            Sign In
        </Button>
    );
}
