"use client";

import { TemplateEditor } from "./TemplateEditor";
import { TemplateEditorV2 } from "./TemplateEditorV2";
import { CustomCanvasEditor } from "./CustomCanvasEditor";
import { isTemplateV2, type AnyConfig, type WithProductImage } from "@/lib/types";

/**
 * Auto-detects the editor mode from a config object and renders the
 * correct editor. Used by both /editor/[templateId] and /editor/preview.
 *
 *   type === "template", version 2 → auto-extracted fields, server-composed print
 *   type === "template", v1        → original SVG DOM patch editor
 *   type === "canvas"              → our custom Photoshop-level free canvas editor
 *
 * Templates published before the v2 builder existed keep taking the original
 * path, byte for byte. There is no migration to run.
 */
export function EditorRouter({ config }: { config: WithProductImage<AnyConfig> }) {
  if (config.type === "template") {
    return isTemplateV2(config) ? (
      <TemplateEditorV2 config={config} />
    ) : (
      <TemplateEditor config={config} />
    );
  }
  return <CustomCanvasEditor config={config} />;
}
