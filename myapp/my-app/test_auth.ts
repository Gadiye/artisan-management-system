import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
const result = NextAuth({ ...authConfig, providers: [] })
console.log("KEYS:", Object.keys(result))
console.log("HANDLERS:", result.handlers)
