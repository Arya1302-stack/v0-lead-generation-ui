import { NextResponse } from "next/server"

/**
 * Resolve FastAPI base URL (no trailing slash).
 * Vercel: set SCRAPE_BACKEND_URL or NEXT_PUBLIC_SCRAPE_API_URL to your Railway/host URL.
 * Both names are accepted so one env works for the server proxy.
 */
function resolveBackendBase(): string {
  const raw =
    process.env.SCRAPE_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_SCRAPE_API_URL?.trim() ||
    ""
  if (!raw) {
    return "http://127.0.0.1:8000"
  }
  let base = raw.replace(/\/$/, "")
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base.replace(/^\/+/, "")}`
  }
  return base
}

/**
 * Server-side proxy to the FastAPI scrape service.
 * - Production (Vercel): set SCRAPE_BACKEND_URL or NEXT_PUBLIC_SCRAPE_API_URL
 * - Local: defaults to http://127.0.0.1:8000 so `next dev` forwards to a local FastAPI process.
 */
function upstreamScrapeUrl(): string {
  return `${resolveBackendBase()}/api/scrape`
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
          "Could not reach the scrape backend. On Vercel, set SCRAPE_BACKEND_URL or NEXT_PUBLIC_SCRAPE_API_URL to your deployed FastAPI base URL (e.g. https://your-app.up.railway.app).",
      },
      { status: 502 },
    )
  }
}
