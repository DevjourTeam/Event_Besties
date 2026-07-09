"use client";

import { TemplateEditor } from "./TemplateEditor";
import { FreeEditor } from "./FreeEditor";
import type { AnyConfig } from "@/lib/types";

/**
 * Auto-detects the editor mode from a config object and renders the
 * correct editor. Used by both /editor/[templateId] and /editor/preview.
 */
export function EditorRouter({ config }: { config: AnyConfig }) {
  if (config.type === "template") {
    return <TemplateEditor config={config} />;
  }
  return <FreeEditor config={config} />;
}
