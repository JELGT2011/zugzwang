import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [Google],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isApiRoute = nextUrl.pathname.startsWith("/api");
            const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");

            // Protect all API routes except auth ones
            if (isApiRoute && !isAuthRoute) {
                if (isLoggedIn) return true;
                return Response.json(
                    { message: "Unauthorized" },
                    { status: 401 }
                );
            }

            return true;
        },
    },
});
