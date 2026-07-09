"use client";

import { useEffect } from "react";
import type { DashboardItem } from "@/lib/types";
import { CopyIcon, DownloadIcon, XIcon } from "./Icons";
import { useRouter } from "next/navigation";

type PreviewModalProps = {
  item: DashboardItem | null;
  onClose: () => void;
};

function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 40) % 360;
  return `linear-gradient(135deg, hsl(${a} 35% 78%) 0%, hsl(${b} 30% 62%) 100%)`;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function PreviewModal({ item, onClose }: PreviewModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;

  const { config } = item;
  const isTemplate = config.type === "template";
  const svgUrl = isTemplate ? config.svgUrl : "";
  const canvasSize = isTemplate
    ? `${config.canvasWidth} × ${config.canvasHeight} px`
    : `${config.displayW} × ${config.displayH} px (display) · ${config.printWidthCm} × ${config.printHeightCm} cm (print)`;
  const elementCount = isTemplate ? Object.keys(config.permissions).length : 0;
  const editableFields = isTemplate
    ? Object.values(config.permissions)
        .filter((p) => !p.locked)
        .map((p) => p.label)
        .join(", ") || "—"
    : "Free canvas";

  const json = JSON.stringify(config, null, 2);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      /* ignore */
    }
  };

  const downloadJson = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.templateId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reupload = () => {
    const tab = isTemplate ? "svg" : "canvas";
    router.push(`/admin/builder?tab=${tab}&load=${item.productId}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-card shadow-2xl flex overflow-hidden"
        style={{ width: "880px", maxWidth: "calc(100vw - 32px)", height: "82vh" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-form-surface text-[#1a1a1a]"
        >
          <XIcon size={18} />
        </button>

        {/* Left preview panel — 42% */}
        <div className="basis-[42%] shrink-0 bg-form-surface flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex items-center justify-center p-8 overflow-hidden">
            {svgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={svgUrl}
                alt={config.productName}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div
                className="w-full h-full rounded-lg flex items-center justify-center"
                style={{ background: gradientFor(config.productName) }}
              >
                <div className="text-white font-serif-display text-[64px] tracking-wider">
                  {initialsOf(config.productName)}
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-card-border px-6 py-4 text-center">
            <div className="text-[11px] tracking-[0.18em] uppercase text-text-muted font-serif-display">
              {config.productName}
            </div>
          </div>
        </div>

        {/* Right detail panel — 58% */}
        <div className="basis-[58%] flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-7 pt-7 pb-4">
            <h2 className="font-serif-display text-[22px] tracking-[0.04em] uppercase text-[#1a1a1a]">
              {config.productName}
            </h2>

            <div className="mt-6 space-y-5">
              <DetailRow label="Canvas size" value={canvasSize} />
              <DetailRow label="Elements" value={String(elementCount)} />
              <DetailRow label="Editable fields" value={editableFields} />
              <DetailRow
                label="Category"
                value={isTemplate ? "Premade Template" : "Custom Canvas"}
              />
              <DetailRow
                label="Status"
                value={
                  <span className="inline-flex items-center gap-1.5 text-[12px]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        config.status === "published"
                          ? "bg-[#2a7a3c]"
                          : "bg-[#8a8070]"
                      }`}
                    />
                    {config.status === "published" ? "Published" : "Draft"}
                  </span>
                }
              />
              <DetailRow label="Created" value={config.createdAt} />

              <div>
                <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
                  Template JSON
                </div>
                <pre className="bg-code-bg text-code-text text-[11px] font-mono leading-relaxed rounded-lg p-4 max-h-[160px] overflow-auto">
                  {json}
                </pre>
              </div>
            </div>
          </div>

          <div className="border-t border-card-border px-7 py-4 flex items-center gap-2">
            <button
              type="button"
              onClick={copyJson}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-card-border text-[12px] hover:bg-form-surface"
            >
              <CopyIcon size={14} /> Copy JSON
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-card-border text-[12px] hover:bg-form-surface"
            >
              <DownloadIcon size={14} /> Download JSON
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={reupload}
              className="inline-flex items-center h-9 px-5 rounded-lg bg-[#1a1a1a] text-white text-[12px] hover:bg-black"
            >
              Re-upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[#1a1a1a]">{value}</div>
    </div>
  );
}
