"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SVGUploader } from "@/components/admin/SVGUploader";
import {
  TemplateFieldEditor,
  unmappedFonts,
} from "@/components/admin/TemplateFieldEditor";
import {
  CreateProductModal,
  type CreateProductSuccess,
} from "@/components/admin/CreateProductModal";
import { useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { prepareSvg, composeSvg, type PreparedTemplate } from "@/lib/svg-template";
import { googleFontsHrefFor } from "@/lib/google-fonts";
import type {
  TemplateConfig,
  TemplateTextField,
  TemplateColorSlot,
} from "@/lib/types";
import { CopyIcon } from "@/components/admin/Icons";

/**
 * Template builder — v2.
 *
 * The admin uploads whatever Illustrator gave them. We read the <text> elements
 * and fill colours out of it directly, so there is nothing to name and no export
 * setting to get right. The one thing the artwork must have is live type: text
 * converted to outlines is paths, and no amount of parsing brings it back — that
 * case is reported as fatal rather than shipped as a template nobody can edit.
 */
export function SvgBuilderPanel() {
  const toast = useToast();
  const router = useRouter();

  const [fileName, setFileName] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedTemplate | null>(null);
  const [textFields, setTextFields] = useState<TemplateTextField[]>([]);
  const [colorSlots, setColorSlots] = useState<TemplateColorSlot[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleLoaded = ({
    fileName,
    svgText,
  }: {
    fileName: string;
    svgText: string;
  }) => {
    const result = prepareSvg(svgText);
    setFileName(fileName);
    setPrepared(result);
    setTextFields(result.textFields);
    setColorSlots(result.colorSlots);
  };

  const missing = useMemo(() => unmappedFonts(textFields), [textFields]);
  const ready = !!prepared && !prepared.fatal && missing.length === 0;

  /* The preview must tell the truth, which means rendering in the fonts the
   * customer will actually get — not the ones Illustrator used. Load exactly the
   * families the admin has mapped so far, and nothing else. */
  const mappedFonts = useMemo(
    () => [...new Set(textFields.map((f) => f.fontFamily).filter(Boolean))],
    [textFields]
  );

  useEffect(() => {
    const href = googleFontsHrefFor(mappedFonts);
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [mappedFonts]);

  /* Live preview: the same composeSvg the customer editor and the print
   * renderer call, so what the admin sees here is what everyone downstream
   * gets. */
  const previewSvg = useMemo(() => {
    if (!prepared?.preparedSvg) return "";
    try {
      return composeSvg(prepared.preparedSvg, {
        textFields: textFields.map((f) => ({
          nodeId: f.nodeId,
          fontFamily: f.fontFamily,
          fontSize: f.fontSize,
          fill: f.fill,
        })),
        textValues: Object.fromEntries(textFields.map((f) => [f.nodeId, f.value])),
        colorValues: Object.fromEntries(
          colorSlots.filter((c) => c.exposed).map((c) => [c.nodeId, c.hex])
        ),
      });
    } catch {
      return prepared.preparedSvg;
    }
  }, [prepared, textFields, colorSlots]);

  const buildConfig = (
    productName: string,
    priceLabel: string,
    sourceSvgUrl: string
  ): TemplateConfig | null => {
    if (!prepared || prepared.fatal) return null;
    return {
      type: "template",
      version: 2,
      templateId: `tpl_${Date.now().toString(36)}`,
      productName,
      // v1 fields kept populated so anything still reading them keeps working.
      svgUrl: sourceSvgUrl,
      permissions: {},
      sourceSvgUrl,
      canvasWidth: prepared.width,
      canvasHeight: prepared.height,
      textFields,
      colorSlots,
      requiredFonts: mappedFonts,
      price: priceLabel,
      status: "published",
      createdAt: new Date().toISOString().slice(0, 10),
    };
  };

  const configJson = useMemo(() => {
    const c = buildConfig("Untitled Template", "£0", "");
    return c ? JSON.stringify(c, null, 2) : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, textFields, colorSlots, mappedFonts]);

  const copyJson = async () => {
    if (!configJson) return;
    try {
      await navigator.clipboard.writeText(configJson);
      toast.show("Config copied");
    } catch {
      toast.show("Copy failed");
    }
  };

  const openCreateModal = () => {
    if (!prepared) return toast.show("Upload an SVG first");
    if (prepared.fatal) return toast.show(prepared.fatal);
    if (missing.length) {
      return toast.show(
        `Map a Google Font for: ${missing.map((f) => f.label).join(", ")}`
      );
    }
    setModalOpen(true);
  };

  const handleCreate = async (fields: {
    title: string;
    description: string;
    priceGbp: number;
    imageDataUrl: string | null;
  }): Promise<CreateProductSuccess | { error: string }> => {
    if (!prepared) return { error: "No SVG loaded" };
    setPublishing(true);
    try {
      // Upload the PREPARED svg — the one carrying data-tf / data-cs markers.
      // This is the pristine source the print renderer composes from, so it has
      // to be what we store, not the raw file the admin dropped in.
      const fd = new FormData();
      fd.append(
        "file",
        new File([prepared.preparedSvg], fileName ?? "template.svg", {
          type: "image/svg+xml",
        })
      );
      const upRes = await fetch("/api/admin/upload-svg", {
        method: "POST",
        body: fd,
      });
      const upJson = await upRes.json();
      if (!upRes.ok) return { error: upJson.error ?? "SVG upload failed" };

      const config = buildConfig(
        fields.title,
        `£${fields.priceGbp.toFixed(2)}`,
        upJson.svgUrl
      );
      if (!config) return { error: "Invalid template state" };

      const createRes = await fetch("/api/admin/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "template",
          title: fields.title,
          description: fields.description,
          priceGbp: fields.priceGbp,
          imageDataUrl: fields.imageDataUrl,
          config,
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

      toast.show({
        message: success.imageError
          ? `Created "${success.title}" — image failed: ${success.imageError}`
          : `Created "${success.title}" in Shopify`,
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

  return (
    <div className="flex min-h-[calc(100vh-180px)]">
      {/* LEFT — form column */}
      <div className="w-[340px] shrink-0 bg-white border-r border-card-border overflow-y-auto p-6 space-y-5">
        <SVGUploader onLoaded={handleLoaded} />

        {prepared?.fatal && (
          <div className="bg-white border border-[#f1cccc] rounded-card p-4">
            <div className="text-[11px] tracking-[0.16em] uppercase text-text-muted mb-1">
              {fileName}
            </div>
            <p className="text-[12px] text-[#a83232] leading-relaxed">
              {prepared.fatal}
            </p>
          </div>
        )}

        {prepared && !prepared.fatal && (
          <div className="bg-white border border-card-border rounded-card p-4 space-y-1.5">
            <div className="text-[11px] tracking-[0.16em] uppercase text-text-muted mb-1">
              {fileName}
            </div>
            <Stat label="Canvas" value={`${prepared.width} × ${prepared.height} px`} />
            <Stat label="Text fields" value={`${prepared.textFields.length}`} />
            <Stat label="Colours" value={`${prepared.colorSlots.length}`} />
          </div>
        )}

        {prepared && !prepared.fatal && (
          <TemplateFieldEditor
            textFields={textFields}
            colorSlots={colorSlots}
            onTextChange={setTextFields}
            onColorChange={setColorSlots}
          />
        )}

        {prepared && !prepared.fatal && (
          <div className="border-t border-card-border pt-5 space-y-3">
            {missing.length > 0 && (
              <p className="text-[11px] text-[#a06b1c] bg-[#fdf3e1] border border-[#f1ddb3] rounded-md px-2.5 py-2 leading-relaxed">
                Pick a Google Font for{" "}
                <strong>{missing.map((f) => f.label).join(", ")}</strong> before
                creating the product — the editor can&rsquo;t render anything else.
              </p>
            )}
            <button
              type="button"
              onClick={openCreateModal}
              disabled={publishing || !ready}
              className="w-full h-11 rounded-lg bg-gold hover:bg-gold-hover text-white text-[13px] font-semibold tracking-[0.02em] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {publishing && <Spinner size={14} />}
              {publishing ? "Creating…" : "Create Shopify product"}
            </button>
          </div>
        )}
      </div>

      {/* RIGHT — preview + config */}
      <div className="flex-1 min-w-0 overflow-y-auto p-8 space-y-6">
        <div>
          <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
            Preview — as the customer will see it
          </div>
          <div className="bg-white border border-card-border rounded-card p-6 flex items-center justify-center min-h-[300px]">
            {previewSvg ? (
              <div
                className="[&>svg]:max-w-full [&>svg]:max-h-[420px] [&>svg]:h-auto [&>svg]:w-auto"
                // Safe: prepareSvg strips <script>, on* handlers and javascript: hrefs.
                dangerouslySetInnerHTML={{ __html: previewSvg }}
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
              Template config
            </div>
            <button
              type="button"
              onClick={copyJson}
              disabled={!configJson}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-card-border bg-white text-[11px] hover:bg-form-surface disabled:opacity-50"
            >
              <CopyIcon size={13} /> Copy
            </button>
          </div>
          <pre className="bg-code-bg text-code-text text-[11px] font-mono leading-relaxed rounded-lg p-4 max-h-[420px] overflow-auto">
            {configJson || "// Upload an SVG to generate config"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-text-muted">{label}</span>
      <span className="text-[#1b2333] font-medium">{value}</span>
    </div>
  );
}
