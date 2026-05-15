import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"

const result = NextAuth({
    ...authConfig,
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
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.username = (user as any).username
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).username = token.username;
            }
            return session
        }
    },
    session: { strategy: "jwt" },
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
})

export const { GET, POST, auth, signIn, signOut } = result
export const handlers = { GET, POST }
