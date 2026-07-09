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
import type { CanvasConfig, CanvasShape } from "@/lib/types";
import { buildShapePath } from "@/components/editor/canvas/editor/shapes";

const SHAPE_OPTIONS: { value: CanvasShape; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "rounded", label: "Rounded rectangle" },
  { value: "arch", label: "Arch (sailboard)" },
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "custom", label: "Custom SVG path" },
];

export function CanvasBuilderPanel() {
  const toast = useToast();
  const router = useRouter();

  const [printWidthCm, setPrintWidthCm] = useState(100);
  const [printHeightCm, setPrintHeightCm] = useState(150);
  const [bleedPx, setBleedPx] = useState(10);
  const [safePx, setSafePx] = useState(22);

  const [displayW, setDisplayW] = useState(380);
  const [displayH, setDisplayH] = useState(500);

  const [shape, setShape] = useState<CanvasShape>("rect");
  const [shapePath, setShapePath] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const buildConfig = (productName: string, priceLabel: string): CanvasConfig => ({
    type: "canvas",
    templateId: `cnv_${Date.now().toString(36)}`,
    productName,
    shape,
    ...(shape === "custom" && shapePath.trim() ? { shapePath: shapePath.trim() } : {}),
    displayW,
    displayH,
    printWidthCm,
    printHeightCm,
    bleedPx,
    safePx,
    price: priceLabel,
    status: "published",
    createdAt: new Date().toISOString().slice(0, 10),
  });

  const config: CanvasConfig = useMemo(
    () => buildConfig("Untitled Canvas", "£0"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayW, displayH, printWidthCm, printHeightCm, bleedPx, safePx, shape, shapePath]
  );

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
      const finalConfig = buildConfig(fields.title, `£${fields.priceGbp.toFixed(2)}`);
      const createRes = await fetch("/api/admin/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "canvas",
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

  return (
    <div className="flex min-h-[calc(100vh-180px)]">
      {/* LEFT — 360px form column */}
      <div className="w-[360px] shrink-0 bg-white border-r border-card-border overflow-y-auto p-6 space-y-6">
        <Card title="Print dimensions">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Width (cm)" value={printWidthCm} onChange={setPrintWidthCm} min={1} />
            <NumberField label="Height (cm)" value={printHeightCm} onChange={setPrintHeightCm} min={1} />
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
          disabled={publishing}
          className="w-full h-11 rounded-lg bg-gold hover:bg-gold-hover text-white text-[13px] font-semibold tracking-[0.02em] disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {publishing && <Spinner size={14} />}
          {publishing ? "Creating…" : "Create Shopify product"}
        </button>
        <p className="text-[10px] text-text-muted leading-relaxed text-center -mt-2">
          Enter product details in the next step.
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
                className="inline-flex items-center h-8 px-3 rounded-md bg-[#1a1a1a] text-white text-[11px] hover:bg-black"
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
    ctx.strokeStyle = "#e5e0d8";
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
