import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnLogin = nextUrl.pathname.startsWith("/login")

            if (isLoggedIn) {
                if (isOnLogin) return Response.redirect(new URL("/", nextUrl))
                return true
            }

            return false // Redirect to login if not logged in
        },
    },
    providers: [], // Add providers with window-level Node.js APIs in auth.ts
} satisfies NextAuthConfig
