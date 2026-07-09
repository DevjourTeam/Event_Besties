import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setProductMetafield } from "@/lib/shopify-admin";
import type { CanvasConfig } from "@/lib/types";

export const runtime = "nodejs";

type SaveBody = {
  productId: string;
  config: CanvasConfig;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.productId || !body?.config) {
    return NextResponse.json(
      { error: "Missing productId or config" },
      { status: 400 }
    );
  }
  if (body.config.type !== "canvas") {
    return NextResponse.json(
      { error: "config.type must be 'canvas'" },
      { status: 400 }
    );
  }

  try {
    await setProductMetafield(body.productId, "custom", "canvas_config", body.config);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
