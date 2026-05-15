"use client"

import { AlertCircle } from "lucide-react"

export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null

  return (
    <div className="bg-yellow-500 text-yellow-950 py-1 px-4 text-center text-xs font-bold flex items-center justify-center gap-2">
      <AlertCircle className="h-3 w-3" />
      <span>DEMO MODE: Using sandbox database. Changes will be reset periodically.</span>
    </div>
  )
}
