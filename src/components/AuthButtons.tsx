"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

export function SignIn() {
    const pathname = usePathname();
    
    // Build the login URL with redirect back to current page
    const loginUrl = pathname && pathname !== "/login" 
        ? `/login?redirect=${encodeURIComponent(pathname)}`
        : "/login";

    return (
        <Button variant="outline" asChild>
            <Link href={loginUrl}>Sign In</Link>
        </Button>
    );
}
