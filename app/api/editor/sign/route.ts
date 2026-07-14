import { NextResponse } from "next/server";
import { signUpload } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/editor/sign
 *
 * Hands the browser a short-lived signature so it can upload the print file
 * directly to Cloudinary. Nothing but the signature crosses this function, so a
 * 30 MB print PNG is no longer squeezed through Vercel's 4.5 MB body limit.
 *
 * Public (no auth) for the same reason as /api/editor/export: the customer
 * editor is anonymous. The signature only permits an upload into the `print`
 * folder under a public_id we choose, and expires on Cloudinary's own clock.
 */
export async function POST(req: Request) {
  let templateId: string | undefined;
  try {
    ({ templateId } = (await req.json()) as { templateId?: string });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!templateId) {
    return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
  }

  // Never build a public_id out of raw client input. A templateId is our own
  // `cnv_…` / `tpl_…` / short handle — bound it to safe characters and a sane
  // length so the signed public_id can't be steered into path traversal or an
  // arbitrary Cloudinary object key.
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(templateId)) {
    return NextResponse.json({ error: "Invalid templateId" }, { status: 400 });
  }

  const folder = "print";
  const publicId = `${templateId}_${Date.now()}`;

  try {
    const { signature, timestamp, apiKey, cloudName } = signUpload({
      folder,
      public_id: publicId,
    });
    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not sign upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
