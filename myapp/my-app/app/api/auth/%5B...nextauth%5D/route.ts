import { auth, handlers } from "@/auth"

// @ts-expect-error - Next.js 16 / Auth.js v5 type mismatch
export const GET = handlers.GET
// @ts-expect-error - Next.js 16 / Auth.js v5 type mismatch
export const POST = handlers.POST
