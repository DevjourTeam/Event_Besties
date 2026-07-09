import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { AnyConfig } from "@/lib/types";
import { EditorRouter } from "@/components/editor/EditorRouter";

export const dynamic = "force-dynamic";

async function fetchConfig(templateId: string): Promise<AnyConfig | null> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const url = `${proto}://${host}/api/editor/config/${encodeURIComponent(templateId)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as AnyConfig;
  } catch {
    return null;
  }
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const config = await fetchConfig(templateId);
  if (!config) notFound();
  return <EditorRouter config={config} />;
}
