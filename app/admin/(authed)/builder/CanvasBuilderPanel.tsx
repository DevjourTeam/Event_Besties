"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { CopyIcon } from "@/components/admin/Icons";
import {
  CreateProductModal,
  type CreateProductSuccess,
} from "@/components/admin/CreateProductModal";
import type { CanvasConfig, CanvasShape, CanvasSizeVariant } from "@/lib/types";
import { buildShapePath } from "@/components/editor/canvas/editor/shapes";

const SHAPE_OPTIONS: { value: CanvasShape; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "rounded", label: "Rounded rectangle" },
  { value: "arch", label: "Arch (sailboard)" },
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "custom", label: "Custom SVG path" },
];

/** A size the admin is still editing — no Shopify variant id yet. */
type DraftSize = Omit<CanvasSizeVariant, "variantId">;

// The arched sailboard sizes, prefilled because they are the common case.
const DEFAULT_SIZES: DraftSize[] = [
  { label: "5ft (150 x 74cm)", printWidthCm: 74, printHeightCm: 150, priceGbp: 69.99 },
  { label: "6ft (180 x 90cm)", printWidthCm: 90, printHeightCm: 180, priceGbp: 89.99 },
  { label: "7ft (210 x 105cm)", printWidthCm: 105, printHeightCm: 210, priceGbp: 109.99 },
];

const money = (n: number) => `£${n.toFixed(2)}`;

export function CanvasBuilderPanel() {
  const toast = useToast();
  const router = useRouter();

  const [sizes, setSizes] = useState<DraftSize[]>(DEFAULT_SIZES);
  const [bleedPx, setBleedPx] = useState(10);
  const [safePx, setSafePx] = useState(22);

  const [displayW, setDisplayW] = useState(380);
  const [displayH, setDisplayH] = useState(500);

  const [shape, setShape] = useState<CanvasShape>("rect");
  const [shapePath, setShapePath] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Shown on the product page: a single price, or the range across sizes.
  const priceLabel = useMemo(() => {
    if (!sizes.length) return "£0.00";
    const lo = Math.min(...sizes.map((s) => s.priceGbp));
    const hi = Math.max(...sizes.map((s) => s.priceGbp));
    return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;
  }, [sizes]);

  const buildConfig = (productName: string): CanvasConfig => ({
    type: "canvas",
    templateId: `cnv_${Date.now().toString(36)}`,
    productName,
    shape,
    ...(shape === "custom" && shapePath.trim() ? { shapePath: shapePath.trim() } : {}),
    displayW,
    displayH,
    // Mirror the first size. Single-size products, and anything created before
    // sizes existed, are read from these — they are the editor's fallback.
    printWidthCm: sizes[0]?.printWidthCm ?? 100,
    printHeightCm: sizes[0]?.printHeightCm ?? 150,
    bleedPx,
    safePx,
    price: priceLabel,
    status: "published",
    createdAt: new Date().toISOString().slice(0, 10),
    // variantId is filled in by the create-product route once Shopify has made
    // the variants — the admin cannot know the ids in advance.
    variants: sizes.map((s) => ({ ...s, variantId: "" })),
  });

  const config: CanvasConfig = useMemo(
    () => buildConfig("Untitled Canvas"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayW, displayH, sizes, bleedPx, safePx, shape, shapePath, priceLabel]
  );

  const patchSize = (i: number, patch: Partial<DraftSize>) =>
    setSizes((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addSize = () =>
    setSizes((prev) => [
      ...prev,
      { label: `Size ${prev.length + 1}`, printWidthCm: 100, printHeightCm: 150, priceGbp: 0 },
    ]);
  const removeSize = (i: number) =>
    setSizes((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  const sizesValid =
    sizes.length > 0 &&
    sizes.every(
      (s) => s.label.trim() && s.printWidthCm > 0 && s.printHeightCm > 0
    ) &&
    new Set(sizes.map((s) => s.label.trim())).size === sizes.length;

  const json = JSON.stringify(config, null, 2);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      toast.show("Canvas JSON copied");
    } catch {
      toast.show("Copy failed");
    }
  };

  const previewInEditor = () => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    window.open(`/editor/preview?config=${encoded}`, "_blank");
  };

  const handleCreate = async (fields: {
    title: string;
    description: string;
    priceGbp: number;
    imageDataUrl: string | null;
  }): Promise<CreateProductSuccess | { error: string }> => {
    setPublishing(true);
    try {
      const finalConfig = buildConfig(fields.title);
      const createRes = await fetch("/api/admin/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "canvas",
          title: fields.title,
          description: fields.description,
          // Each size carries its own price; this is only the fallback used if
          // the product somehow ends up with no sizes.
          priceGbp: sizes[0]?.priceGbp ?? 0,
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

  return (
    <div className="flex min-h-[calc(100vh-180px)]">
      {/* LEFT — 360px form column */}
      <div className="w-[360px] shrink-0 bg-white border-r border-card-border overflow-y-auto p-6 space-y-6">
        <Card title="Sizes">
          <div className="space-y-3">
            {sizes.map((s, i) => (
              <div key={i} className="rounded-lg border border-card-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={s.label}
                    onChange={(e) => patchSize(i, { label: e.target.value })}
                    placeholder="6ft (180 x 90cm)"
                    className="flex-1 h-9 px-3 rounded-lg border border-card-border bg-form-surface text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeSize(i)}
                    disabled={sizes.length <= 1}
                    title={sizes.length <= 1 ? "A product needs at least one size" : "Remove size"}
                    className="h-9 w-9 shrink-0 rounded-lg border border-card-border text-[13px] text-text-muted hover:bg-form-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumberField
                    label="W (cm)"
                    value={s.printWidthCm}
                    onChange={(v) => patchSize(i, { printWidthCm: v })}
                    min={1}
                  />
                  <NumberField
                    label="H (cm)"
                    value={s.printHeightCm}
                    onChange={(v) => patchSize(i, { printHeightCm: v })}
                    min={1}
                  />
                  <NumberField
                    label="Price (£)"
                    value={s.priceGbp}
                    onChange={(v) => patchSize(i, { priceGbp: v })}
                    min={0}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSize}
            className="mt-3 w-full h-9 rounded-lg border border-dashed border-card-border text-[12px] text-text-muted hover:bg-form-surface"
          >
            + Add another size
          </button>

          {!sizesValid && (
            <p className="text-[10px] text-red-600 mt-2 leading-relaxed">
              Every size needs a unique name and a width and height above zero.
            </p>
          )}
          <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
            Each size becomes a Shopify variant under a <strong>Size</strong> option, priced
            separately. The customer must pick one before the editor will open, and it is what sets
            their canvas dimensions. Sizes are fixed once the product is created.
          </p>
        </Card>

        <Card title="Bleed & safe zone">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Bleed (px)" value={bleedPx} onChange={setBleedPx} min={0} />
            <NumberField label="Safe zone (px)" value={safePx} onChange={setSafePx} min={0} />
          </div>
          <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
            Red line marks the bleed area, green line marks the safe zone — both for editor reference only,
            never exported to print.
          </p>
        </Card>

        <Card title="Editor display size">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Display W (px)" value={displayW} onChange={setDisplayW} min={100} />
            <NumberField label="Display H (px)" value={displayH} onChange={setDisplayH} min={100} />
          </div>
          <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
            These are display pixels in the customer editor. Print output is always rendered at high resolution regardless.
          </p>
        </Card>

        <Card title="Product shape">
          <label className="block">
            <div className="text-[11px] text-text-muted mb-1">Cut shape</div>
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value as CanvasShape)}
              className="w-full h-10 px-3 rounded-lg border border-card-border bg-form-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {SHAPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          {shape === "custom" && (
            <label className="block">
              <div className="text-[11px] text-text-muted mb-1">SVG path (d attribute)</div>
              <textarea
                value={shapePath}
                onChange={(e) => setShapePath(e.target.value)}
                placeholder="M 0 0 L 100 0 L 100 100 L 0 100 Z"
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-card-border bg-form-surface text-[11px] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-gold/40 resize-y"
              />
              <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                Paste the path from an SVG cutout. It is auto-scaled to the print box.
              </p>
            </label>
          )}
          <p className="text-[10px] text-text-muted leading-relaxed">
            The shape is the printable area. Everything the customer designs is clipped to it.
          </p>
        </Card>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={publishing || !sizesValid}
          className="w-full h-11 rounded-lg bg-gold hover:bg-gold-hover text-white text-[13px] font-semibold tracking-[0.02em] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {publishing && <Spinner size={14} />}
          {publishing ? "Creating…" : "Create Shopify product"}
        </button>
        <p className="text-[10px] text-text-muted leading-relaxed text-center -mt-2">
          Creates {sizes.length} {sizes.length === 1 ? "variant" : "variants"} · {priceLabel}
        </p>
      </div>

      {/* RIGHT — preview + JSON */}
      <div className="flex-1 min-w-0 overflow-y-auto p-8 space-y-6">
        <div>
          <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
            Live preview
          </div>
          <div className="bg-white border border-card-border rounded-card p-8 flex items-center justify-center min-h-[400px]">
            <CanvasPreview
              displayW={displayW}
              displayH={displayH}
              bleedPx={bleedPx}
              safePx={safePx}
              shape={shape}
              shapePath={shapePath}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted">
              Canvas JSON
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyJson}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-card-border bg-white text-[11px] hover:bg-form-surface"
              >
                <CopyIcon size={13} /> Copy
              </button>
              <button
                type="button"
                onClick={previewInEditor}
                className="inline-flex items-center h-8 px-3 rounded-md bg-[#1b2333] text-white text-[11px] hover:bg-[#10151f]"
              >
                Preview in Editor
              </button>
            </div>
          </div>
          <pre className="bg-code-bg text-code-text text-[11px] font-mono leading-relaxed rounded-lg p-4 max-h-[420px] overflow-auto">
            {json}
          </pre>
        </div>
      </div>

      <CreateProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        priceNote={`${sizes.length} ${sizes.length === 1 ? "size" : "sizes"} · ${priceLabel} — each size is priced on the Sizes panel.`}
      />
    </div>
  );
}

function CanvasPreview({
  displayW,
  displayH,
  bleedPx,
  safePx,
  shape,
  shapePath,
}: {
  displayW: number;
  displayH: number;
  bleedPx: number;
  safePx: number;
  shape: CanvasShape;
  shapePath: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Render at 55% of the configured display size so it always fits.
  const scale = 0.55;
  const w = Math.max(50, Math.round(displayW * scale));
  const h = Math.max(50, Math.round(displayH * scale));

  // The product cut outline (same geometry the editor clips to).
  const shapeD = useMemo(() => {
    try {
      const s = shape === "custom" ? { type: "custom", svgPath: shapePath } : { type: shape };
      return buildShapePath(s, w, h);
    } catch {
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    }
  }, [shape, shapePath, w, h]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#e2e2e6";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [w, h]);

  // Overlay positions in the SCALED preview.
  const bleedScaled = bleedPx * scale;
  const safeScaled = (bleedPx + safePx) * scale;

  return (
    <div className="relative" style={{ width: w, height: h }}>
      <canvas ref={canvasRef} className="block" />
      <svg
        className="absolute inset-0 pointer-events-none"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
      >
        {/* product cut outline */}
        <path d={shapeD} fill="rgba(169,139,82,0.06)" stroke="#a98b52" strokeWidth="1.6" />
        <rect
          x={bleedScaled}
          y={bleedScaled}
          width={w - bleedScaled * 2}
          height={h - bleedScaled * 2}
          fill="none"
          stroke="#d8534f"
          strokeWidth="1.4"
          strokeDasharray="4 3"
        />
        <rect
          x={safeScaled}
          y={safeScaled}
          width={w - safeScaled * 2}
          height={h - safeScaled * 2}
          fill="none"
          stroke="#3aa05c"
          strokeWidth="1.4"
          strokeDasharray="4 3"
        />
      </svg>
      <div className="absolute -bottom-7 left-0 right-0 text-center text-[10px] text-text-muted tracking-[0.06em]">
        {displayW} × {displayH} px display · scaled to 55%
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <label className="block">
      <div className="text-[11px] text-text-muted mb-1">{label}</div>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, n));
        }}
        className="w-full h-10 px-3 rounded-lg border border-card-border bg-form-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
    </label>
  );
}
