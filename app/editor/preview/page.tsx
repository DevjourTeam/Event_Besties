import { notFound } from "next/navigation";
import type { AnyConfig } from "@/lib/types";
import { EditorRouter } from "@/components/editor/EditorRouter";

export const dynamic = "force-dynamic";

/**
 * Editor preview route. Used by the admin "Preview in Editor" buttons —
 * the config is base64-encoded and passed via ?config=... so admin can
 * test a draft template/canvas without writing it to Shopify first.
 */
export default async function EditorPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ config?: string }>;
}) {
  const params = await searchParams;
  const encoded = params.config;
  if (!encoded) notFound();

  let config: AnyConfig;
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    config = JSON.parse(decoded) as AnyConfig;
  } catch {
    notFound();
  }

  return <EditorRouter config={config} />;
}
