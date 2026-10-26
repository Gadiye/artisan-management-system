import { NextResponse } from "next/server"
import { spawn } from "child_process"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, printer = "POS-80" } = body

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing or invalid receipt text" }, { status: 400 })
    }

    return new Promise<NextResponse>((resolve) => {
      const lp = spawn("lp", ["-d", printer])

      let stderr = ""

      lp.stdin.write(text)
      lp.stdin.end()

      lp.stderr.on("data", (data) => {
        stderr += data.toString()
      })

      lp.on("close", (code) => {
        if (code === 0) {
          resolve(NextResponse.json({ success: true, message: "Print job queued successfully" }))
        } else {
          resolve(
            NextResponse.json(
              { error: `Printing failed with exit code ${code}: ${stderr}` },
              { status: 500 }
            )
          )
        }
      })

      lp.on("error", (err) => {
        resolve(NextResponse.json({ error: `Process error: ${err.message}` }, { status: 500 }))
      })
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
