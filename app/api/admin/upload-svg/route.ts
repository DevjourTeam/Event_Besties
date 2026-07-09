import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadSVG } from "@/lib/cloudinary";

export const runtime = "nodejs";

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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".svg")) {
    return NextResponse.json({ error: "File must be an .svg" }, { status: 400 });
  }

  const text = await file.text();
  if (!text.includes("<svg")) {
    return NextResponse.json({ error: "File does not look like an SVG" }, { status: 400 });
  }

  const buffer = Buffer.from(text, "utf-8");
  const publicId = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const result = await uploadSVG(buffer, publicId);
    return NextResponse.json({ svgUrl: result.secure_url, publicId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
