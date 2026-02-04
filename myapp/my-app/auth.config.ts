import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

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
    providers: [
        Credentials({
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null

                const baseUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/"

                try {
                    const res = await fetch(`${baseUrl}login/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(credentials),
                    })

                    const user = await res.json()

                    if (res.ok && user) {
                        return {
                            id: String(user.id || user.user_id || Date.now()),
                            name: user.username || user.name || credentials.username,
                            email: user.email || "",
                            username: user.username || credentials.username,
                        }
                    }
                    return null
                } catch (error) {
                    console.error("Auth authorize error:", error)
                    return null
                }
            },
        }),
    ],
} satisfies NextAuthConfig
