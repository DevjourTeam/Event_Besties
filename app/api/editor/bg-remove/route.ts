import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy to the customer's Python background removal API.
 * Configured via BG_REMOVAL_API_URL.
 *
 * Body:    { imageDataUrl: string }
 * Returns: { resultDataUrl: string }
 */
export async function POST(req: Request) {
  let body: { imageDataUrl?: string };
  try {
    body = (await req.json()) as { imageDataUrl?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.imageDataUrl) {
    return NextResponse.json({ error: "Missing imageDataUrl" }, { status: 400 });
  }

  const url = process.env.BG_REMOVAL_API_URL;
  if (!url) {
    return NextResponse.json(
      { error: "BG_REMOVAL_API_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: body.imageDataUrl }),
    });
    if (!res.ok) {
      throw new Error(`Background removal API HTTP ${res.status}`);
    }
    const data = (await res.json()) as Record<string, unknown>;
    const result =
      (typeof data.resultDataUrl === "string" && data.resultDataUrl) ||
      (typeof data.image === "string" && data.image) ||
      (typeof data.result === "string" && data.result) ||
      null;
    if (!result) {
      throw new Error("Background removal API did not return an image");
    }
    return NextResponse.json({ resultDataUrl: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Background removal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
