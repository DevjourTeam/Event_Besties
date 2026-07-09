"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SVGUploader } from "@/components/admin/SVGUploader";
import { SVGValidator } from "@/components/admin/SVGValidator";
import { PermissionEditor } from "@/components/admin/PermissionEditor";
import {
  CreateProductModal,
  type CreateProductSuccess,
} from "@/components/admin/CreateProductModal";
import { useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import type { SvgValidation } from "@/lib/svg-parser";
import { deriveLabel } from "@/lib/svg-parser";
import { checkFonts } from "@/lib/google-fonts";
import type { ElementPermission, TemplateConfig } from "@/lib/types";
import { CopyIcon } from "@/components/admin/Icons";

type Permissions = Record<string, ElementPermission>;

function svgTextToDataUrl(svgText: string): string {
  try {
    const base64 = btoa(unescape(encodeURIComponent(svgText)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return "";
  }
}

export function SvgBuilderPanel() {
  const toast = useToast();
  const router = useRouter();

  const [fileName, setFileName] = useState<string | null>(null);
  const [svgText, setSvgText] = useState<string>("");
  const [validation, setValidation] = useState<SvgValidation | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleLoaded = ({
    fileName,
    svgText,
    validation,
  }: {
    fileName: string;
    svgText: string;
    validation: SvgValidation;
  }) => {
    setFileName(fileName);
    setSvgText(svgText);
    setValidation(validation);
    const initial: Permissions = {};
    for (const el of validation.elements) {
      initial[el.id] = {
        type: "locked",
        label: deriveLabel(el.id),
        locked: true,
      };
    }
    setPermissions(initial);
  };

  const buildConfig = (productName: string, priceLabel: string): TemplateConfig | null => {
    if (!validation?.valid) return null;
    return {
      type: "template",
      templateId: `tpl_${Date.now().toString(36)}`,
      productName,
      svgUrl: "",
      canvasWidth: Math.round(validation.width),
      canvasHeight: Math.round(validation.height),
      permissions,
      price: priceLabel,
      status: "published",
      createdAt: new Date().toISOString().slice(0, 10),
      requiredFonts: validation.fonts,
    };
  };

  const fontChecks = useMemo(
    () => (validation?.fonts ? checkFonts(validation.fonts) : []),
    [validation?.fonts]
  );
  const missingFonts = fontChecks.filter((c) => !c.available);

  const previewConfig = useMemo(
    () => buildConfig("Untitled Template", "£0"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validation, permissions]
  );
  const json = previewConfig ? JSON.stringify(previewConfig, null, 2) : "";

  const copyJson = async () => {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      toast.show("Permission JSON copied");
    } catch {
      toast.show("Copy failed");
    }
  };

  const previewInEditor = () => {
    if (!previewConfig) return;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(previewConfig))));
    window.open(`/editor/preview?config=${encoded}`, "_blank");
  };

  const openCreateModal = () => {
    if (!validation?.valid || !svgText) {
      toast.show("Upload a valid SVG first");
      return;
    }
    setModalOpen(true);
  };

  const handleCreate = async (fields: {
    title: string;
    description: string;
    priceGbp: number;
    imageDataUrl: string | null;
  }): Promise<CreateProductSuccess | { error: string }> => {
    setPublishing(true);
    try {
      // 1) upload SVG to Cloudinary
      const fd = new FormData();
      fd.append(
        "file",
        new File([svgText], fileName ?? "template.svg", { type: "image/svg+xml" })
      );
      const upRes = await fetch("/api/admin/upload-svg", { method: "POST", body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok) return { error: upJson.error ?? "SVG upload failed" };

      // 2) build config using modal fields
      const config = buildConfig(fields.title, `£${fields.priceGbp.toFixed(2)}`);
      if (!config) return { error: "Invalid SVG validation state" };
      const finalConfig: TemplateConfig = { ...config, svgUrl: upJson.svgUrl };

      // 3) create Shopify product + write metafield
      const createRes = await fetch("/api/admin/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "template",
          title: fields.title,
          description: fields.description,
          priceGbp: fields.priceGbp,
          imageDataUrl: fields.imageDataUrl,
          config: finalConfig,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        return { error: createJson.message ?? createJson.error ?? "Create failed" };
      }

      const success: CreateProductSuccess = {
        productId: createJson.productId,
        title: createJson.title,
        adminUrl: createJson.adminUrl,
        imageError: createJson.imageError ?? null,
      };

      const msg = success.imageError
        ? `Created "${success.title}" — image failed: ${success.imageError}`
        : `Created "${success.title}" in Shopify`;
      toast.show({
        message: msg,
        actions: [
          { label: "View in Shopify", href: success.adminUrl },
          { label: "Dashboard", onClick: () => router.push("/admin/dashboard") },
        ],
      });

      return success;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Create failed" };
    } finally {
      setPublishing(false);
    }
  };

  const svgDataUrl = svgText ? svgTextToDataUrl(svgText) : "";

  return (
    <div className="flex min-h-[calc(100vh-180px)]">
      {/* LEFT — 340px form column */}
      <div className="w-[340px] shrink-0 bg-white border-r border-card-border overflow-y-auto p-6 space-y-5">
        <SVGUploader onLoaded={handleLoaded} />

        {validation && fileName && (
          <SVGValidator fileName={fileName} validation={validation} />
        )}

        {validation?.valid && fontChecks.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
              Detected fonts
            </div>
            <div className="space-y-1.5">
              {fontChecks.map((c) => (
                <div
                  key={c.family}
                  className={`flex items-center gap-2 text-[12px] px-2.5 py-1.5 rounded-md border ${
                    c.available
                      ? "bg-[#e8f4ea] border-[#c9e2cf] text-[#2a7a3c]"
                      : "bg-[#fdf3e1] border-[#f1ddb3] text-[#a06b1c]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      c.available ? "bg-[#2a7a3c]" : "bg-[#a06b1c]"
                    }`}
                  />
                  <span className="flex-1 truncate">{c.family}</span>
                  <span className="text-[10px] uppercase tracking-[0.06em] opacity-70">
                    {c.available ? "Google Font" : "Not on Google"}
                  </span>
                </div>
              ))}
            </div>
            {missingFonts.length > 0 && (
              <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                Text using a non–Google Font will fall back to a default in
                the customer editor. Pick a Google Font in Illustrator
                (Pacifico, Bungee, Lobster…) or convert the text to outlines
                to make it non-editable but pixel-perfect.
              </p>
            )}
          </div>
        )}

        {validation?.valid && (
          <div>
            <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
              Element permissions
            </div>
            <PermissionEditor
              elements={validation.elements}
              permissions={permissions}
              onChange={setPermissions}
            />
          </div>
        )}

        {validation?.valid && (
          <div className="border-t border-card-border pt-5 space-y-3">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={publishing}
              className="w-full h-11 rounded-lg bg-gold hover:bg-gold-hover text-white text-[13px] font-semibold tracking-[0.02em] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {publishing && <Spinner size={14} />}
              {publishing ? "Creating…" : "Create Shopify product"}
            </button>
            <p className="text-[10px] text-text-muted leading-relaxed text-center">
              Enter product details in the next step.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT — preview + JSON */}
      <div className="flex-1 min-w-0 overflow-y-auto p-8 space-y-6">
        <div>
          <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
            SVG preview
          </div>
          <div className="bg-white border border-card-border rounded-card p-6 flex items-center justify-center min-h-[300px]">
            {svgDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={svgDataUrl}
                alt="uploaded SVG preview"
                className="max-w-full max-h-[380px] object-contain"
              />
            ) : (
              <div className="text-[12px] text-text-muted">
                Upload an SVG to preview it here
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted">
              Permission JSON
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyJson}
                disabled={!json}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-card-border bg-white text-[11px] hover:bg-form-surface disabled:opacity-50"
              >
                <CopyIcon size={13} /> Copy
              </button>
              <button
                type="button"
                onClick={previewInEditor}
                disabled={!previewConfig}
                className="inline-flex items-center h-8 px-3 rounded-md bg-[#1a1a1a] text-white text-[11px] hover:bg-black disabled:opacity-50"
              >
                Preview in Editor
              </button>
            </div>
          </div>
          <pre className="bg-code-bg text-code-text text-[11px] font-mono leading-relaxed rounded-lg p-4 max-h-[420px] overflow-auto">
            {json || "// Upload an SVG to generate config"}
          </pre>
        </div>
      </div>

      <CreateProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
