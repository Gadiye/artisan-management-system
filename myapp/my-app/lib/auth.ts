import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null

                // Use INTERNAL_API_URL for server-side auth calls (container networking)
                const baseUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/"

                try {
                    console.log("Attempting login at:", `${baseUrl}login/`)
                    const res = await fetch(`${baseUrl}login/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(credentials),
                    })

                    const user = await res.json()
                    console.log("Login response status:", res.status)

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
            }
        })
    ],
    session: { strategy: "jwt" },
    pages: { signIn: '/login' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = (user as any).id
                token.username = (user as any).username
            }
            return token
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.id
                session.user.username = token.username
            }
            return session
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
}
