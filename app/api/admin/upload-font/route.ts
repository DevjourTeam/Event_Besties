import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFont } from "@/lib/cloudinary";
import { FONT_FORMATS, isSupportedFontExt } from "@/lib/custom-fonts";

export const runtime = "nodejs";

/** Comfortably above any real webfont; a .otf with full hinting rarely passes 2 MB. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * POST /api/admin/upload-font   (admin only)
 *
 * Hosts a webfont for artwork set in a face Google doesn't carry. The family
 * name is read from the file by the caller (opentype.js) and passed in, so the
 * @font-face we later emit always matches the name the text field asks for.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const family = String(formData.get("family") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!family) {
    return NextResponse.json({ error: "Missing font family name" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!isSupportedFontExt(ext)) {
    return NextResponse.json(
      { error: `Unsupported font type ".${ext}" — use .woff2, .woff, .ttf or .otf` },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Font file is too large (max 5 MB)" }, { status: 400 });
  }

  const publicId = `font_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const result = await uploadFont(Buffer.from(bytes), publicId, ext);
    return NextResponse.json({
      family,
      url: result.secure_url,
      format: FONT_FORMATS[ext],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Font upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
