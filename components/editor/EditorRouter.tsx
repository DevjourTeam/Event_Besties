"use client";

import { TemplateEditor } from "./TemplateEditor";
import { CustomCanvasEditor } from "./CustomCanvasEditor";
import type { AnyConfig } from "@/lib/types";

/**
 * Auto-detects the editor mode from a config object and renders the
 * correct editor. Used by both /editor/[templateId] and /editor/preview.
 *
 *   type === "template"  → SVG DOM patch editor (locked, on-brand layouts)
 *   type === "canvas"    → our custom Photoshop-level free canvas editor
 */
export function EditorRouter({ config }: { config: AnyConfig }) {
  if (config.type === "template") {
    return <TemplateEditor config={config} />;
  }
  return <CustomCanvasEditor config={config} />;
}
