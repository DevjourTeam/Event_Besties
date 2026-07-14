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
import { fitTextFields } from "@/lib/svg-fit";
import { googleFontsHrefFor, isGoogleFont } from "@/lib/google-fonts";
import { fontFaceCss } from "@/lib/custom-fonts";
import type { TemplateConfig, TemplateTextField, CustomFont } from "@/lib/types";
import { CopyIcon } from "@/components/admin/Icons";
import {
  SizesPanel,
  priceLabelFor,
  sizesValid,
  DEFAULT_TEMPLATE_SIZES,
  type DraftSize,
} from "@/components/admin/SizesPanel";
import { BuilderSection } from "@/components/admin/BuilderSection";

/** The live preview; fitTextFields addresses it by id. */
const PREVIEW_ID = "eb-builder-preview";

/**
 * Template builder — v2. Text only.
 *
 * The admin uploads whatever Illustrator gave them. We read the <text> elements
 * out of it, so there is nothing to name and no export setting to get right.
 * Two rules remain, and both are enforced here rather than discovered later:
 *
 *   - the type must be live, not outlined (outlines are paths; nothing recovers them)
 *   - every field needs a font we can actually fetch — Google, or one uploaded here
 */
export function SvgBuilderPanel() {
  const toast = useToast();
  const router = useRouter();

  const [fileName, setFileName] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedTemplate | null>(null);
  const [textFields, setTextFields] = useState<TemplateTextField[]>([]);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);

  const [sizes, setSizes] = useState<DraftSize[]>(DEFAULT_TEMPLATE_SIZES);
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
    setCustomFonts([]);
    // Where the artwork already uses a Google font, there is nothing to decide —
    // prefill it so the admin only has to act on the fonts that actually need it.
    setTextFields(
      result.textFields.map((f) => ({
        ...f,
        fontFamily: isGoogleFont(f.originalFont) ? f.originalFont : "",
      }))
    );
  };

  /** Faces the artwork asks for that Google can't serve — the upload candidates. */
  const unhostedFonts = useMemo(
    () =>
      [...new Set(prepared?.detectedFonts ?? [])].filter(
        (f) => f && !isGoogleFont(f)
      ),
    [prepared]
  );

  const missing = useMemo(
    () => unmappedFonts(textFields, customFonts),
    [textFields, customFonts]
  );
  const ready = !!prepared && !prepared.fatal && missing.length === 0;

  const googleFamilies = useMemo(
    () => [...new Set(textFields.map((f) => f.fontFamily).filter(isGoogleFont))],
    [textFields]
  );

  /* The preview has to tell the truth, so load exactly what the customer will
   * get: Google families via <link>, uploaded faces via @font-face. */
  useEffect(() => {
    const href = googleFontsHrefFor(googleFamilies);
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [googleFamilies]);

  useEffect(() => {
    const css = fontFaceCss(customFonts);
    if (!css) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, [customFonts]);

  const uploadFont = async (file: File, family: string): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("family", family);
      const res = await fetch("/api/admin/upload-font", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) return json.error ?? "Upload failed";

      const font: CustomFont = json;
      setCustomFonts((prev) => [...prev.filter((f) => f.family !== family), font]);
      // The whole point of hosting the original face is that the artwork renders
      // as drawn — so bind it straight to every field that asked for it.
      setTextFields((prev) =>
        prev.map((f) =>
          f.originalFont === family ? { ...f, fontFamily: family } : f
        )
      );
      toast.show(`${family} hosted`);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Upload failed";
    }
  };

  /* Same composeSvg the customer editor and the print renderer call. */
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
        colorValues: {},
      });
    } catch {
      return prepared.preparedSvg;
    }
  }, [prepared, textFields]);

  /* The preview must show what the CUSTOMER will get, which means the same
   * overflow fit the editor and the print renderer apply. Without this the admin
   * sees type bleeding off the artwork that would never actually print that way. */
  useEffect(() => {
    if (!previewSvg || !prepared?.preparedSvg) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      try {
        fitTextFields(
          `#${PREVIEW_ID}`,
          prepared.preparedSvg,
          textFields.map((f) => ({ nodeId: f.nodeId, fontSize: f.fontSize }))
        );
      } catch {
        /* an unrenderable preview is not worth breaking the builder over */
      }
    };
    // fonts first: metrics in a fallback face would fit against the wrong widths
    if (document.fonts?.ready) document.fonts.ready.then(run);
    else run();
    return () => {
      cancelled = true;
    };
  }, [previewSvg, prepared, textFields, customFonts, googleFamilies]);

  const buildConfig = (
    productName: string,
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
      colorSlots: [],
      customFonts,
      // Only the Google ones belong here: uploaded faces come from our own CDN
      // via @font-face, not from a fonts.googleapis.com <link>.
      requiredFonts: googleFamilies,
      price: priceLabelFor(sizes),
      status: "published",
      createdAt: new Date().toISOString().slice(0, 10),
      // A template's artwork is fixed, so a size only carries a price. Shopify's
      // real variant ids are stamped in by the create-product route.
      variants: sizes.map((s) => ({
        variantId: "",
        label: s.label,
        priceGbp: s.priceGbp,
      })),
    };
  };

  const configJson = useMemo(() => {
    const c = buildConfig("Untitled Template", "");
    return c ? JSON.stringify(c, null, 2) : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, textFields, customFonts, googleFamilies, sizes]);

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
        `Still needs a font: ${missing.map((f) => f.label).join(", ")}`
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
      // Upload the PREPARED svg — the one carrying the data-tf markers. This is
      // the pristine source the print renderer composes from, so it has to be
      // what we store, not the raw file the admin dropped in.
      const fd = new FormData();
      fd.append(
        "file",
        new File([prepared.preparedSvg], fileName ?? "template.svg", {
          type: "image/svg+xml",
        })
      );
      const upRes = await fetch("/api/admin/upload-svg", { method: "POST", body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok) return { error: upJson.error ?? "SVG upload failed" };

      const config = buildConfig(fields.title, upJson.svgUrl);
      if (!config) return { error: "Invalid template state" };

      const createRes = await fetch("/api/admin/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "template",
          title: fields.title,
          description: fields.description,
          // Each size carries its own price; this is only the fallback used if
          // the product somehow ends up with no sizes.
          priceGbp: sizes[0]?.priceGbp ?? 0,
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
    // Artwork | sizes | preview | config, side by side. Each panel keeps its own
    // column rather than stacking into one long scroll.
    <div className="flex min-h-[calc(100vh-180px)]">
      {/* COLUMN 1 — the artwork and the fields read out of it */}
      <div className="w-[320px] shrink-0 bg-white border-r border-card-border overflow-y-auto p-5 space-y-5">
        <BuilderSection title="Artwork">
          <SVGUploader onLoaded={handleLoaded} />

          {prepared?.fatal && (
            <div className="mt-3 border border-[#f1cccc] bg-[#fdf1f1] rounded-lg p-3">
              <div className="text-[10px] tracking-[0.14em] uppercase text-text-muted mb-1">
                {fileName}
              </div>
              <p className="text-[12px] text-[#a83232] leading-relaxed">
                {prepared.fatal}
              </p>
            </div>
          )}

          {prepared && !prepared.fatal && (
            <div className="mt-3 rounded-lg border border-card-border p-3 space-y-1.5">
              <div className="text-[10px] tracking-[0.14em] uppercase text-text-muted mb-1">
                {fileName}
              </div>
              <Stat label="Canvas" value={`${prepared.width} × ${prepared.height} px`} />
              <Stat label="Text fields" value={`${prepared.textFields.length}`} />
              <Stat label="File size" value={`${prepared.fileSizeKB} KB`} />
            </div>
          )}
        </BuilderSection>

        {prepared && !prepared.fatal && (
          <BuilderSection title="Text fields">
            <TemplateFieldEditor
              textFields={textFields}
              customFonts={customFonts}
              unhostedFonts={unhostedFonts}
              onTextChange={setTextFields}
              onUploadFont={uploadFont}
            />
          </BuilderSection>
        )}
      </div>

      {/* COLUMN 2 — sizes, then the CTA */}
      <div className="w-[320px] shrink-0 bg-white border-r border-card-border overflow-y-auto p-5 space-y-5">
        <BuilderSection title="Sizes & pricing">
          <SizesPanel sizes={sizes} onChange={setSizes} />
        </BuilderSection>

        <div className="space-y-3">
          {missing.length > 0 && (
            <p className="text-[11px] text-[#a06b1c] bg-[#fdf3e1] border border-[#f1ddb3] rounded-md px-2.5 py-2 leading-relaxed">
              <strong>{missing.map((f) => f.label).join(", ")}</strong> still needs a
              font the editor can fetch — upload the original, or pick a Google one.
            </p>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            disabled={publishing || !ready || !sizesValid(sizes, false)}
            className="w-full h-11 rounded-lg bg-gold hover:bg-gold-hover text-white text-[13px] font-semibold tracking-[0.02em] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {publishing && <Spinner size={14} />}
            {publishing ? "Creating…" : "Create Shopify product"}
          </button>
          <p className="text-[10px] text-text-muted leading-relaxed text-center">
            Creates {sizes.length} {sizes.length === 1 ? "variant" : "variants"} ·{" "}
            {priceLabelFor(sizes)}
          </p>
        </div>
      </div>

      {/* COLUMN 3 — preview */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
          Preview — as the customer will see it
        </div>
        <div className="bg-white border border-card-border rounded-card p-5 flex items-center justify-center min-h-[560px]">
          {previewSvg ? (
            <div
              id={PREVIEW_ID}
              className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-[520px] [&>svg]:h-auto [&>svg]:w-auto"
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

      {/* COLUMN 4 — the config, in its own column */}
      <div className="w-[340px] shrink-0 border-l border-card-border overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-[0.16em] uppercase text-text-muted">
            Template config
          </span>
          <button
            type="button"
            onClick={copyJson}
            disabled={!configJson}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-card-border bg-white text-[11px] hover:bg-form-surface disabled:opacity-50"
          >
            <CopyIcon size={12} /> Copy
          </button>
        </div>
        <pre className="bg-code-bg text-code-text text-[11px] font-mono leading-relaxed rounded-lg p-3 max-h-[calc(100vh-280px)] overflow-auto">
          {configJson || "// Upload an SVG to generate config"}
        </pre>
      </div>

      <CreateProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        priceNote={`${sizes.length} ${sizes.length === 1 ? "size" : "sizes"} · ${priceLabelFor(sizes)} — each size is priced on the Sizes panel.`}
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
