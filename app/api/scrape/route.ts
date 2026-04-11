import { NextResponse } from "next/server"

/**
 * Server-side proxy to the FastAPI scrape service.
 * - Production (Vercel): set SCRAPE_BACKEND_URL to your public API base, e.g. https://api.myapp.com
 * - Local: defaults to http://127.0.0.1:8000 so `next dev` forwards to a local FastAPI process.
 */
function upstreamScrapeUrl(): string {
  const base = (process.env.SCRAPE_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "")
  return `${base}/api/scrape`
}

/** Allow long-running maps + deep scrape on Vercel (requires plan that supports it). */
export const maxDuration = 300

export async function POST(request: Request) {
  let body: string
  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 })
  }

  try {
    const res = await fetch(upstreamScrapeUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    })
    const text = await res.text()
    const contentType = res.headers.get("content-type") ?? "application/json"
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": contentType },
    })
  } catch {
    return NextResponse.json(
      {
        detail:
          "Could not reach the scrape backend. On Vercel, set SCRAPE_BACKEND_URL to your deployed FastAPI URL.",
      },
      { status: 502 },
    )
  }
}
