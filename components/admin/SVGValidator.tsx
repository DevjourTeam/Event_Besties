"use client";

import type { SvgValidation } from "@/lib/svg-parser";

type Props = {
  fileName: string;
  validation: SvgValidation;
};

export function SVGValidator({ fileName, validation }: Props) {
  if (!validation.valid) {
    return (
      <div className="bg-white border border-[#f1cccc] rounded-card p-4">
        <Row tone="error" label="SVG parse error" detail={validation.parseError ?? ""} />
        <Row tone="ok" label="File size" detail={`${validation.fileSizeKB} KB`} />
      </div>
    );
  }

  const namedTone = validation.elementCount === 0 ? "warn" : "ok";
  const namedDetail =
    validation.elementCount === 0
      ? "0 — no elements have id attributes. Customer cannot edit anything."
      : `${validation.elementCount} named element${validation.elementCount === 1 ? "" : "s"}`;

  return (
    <div className="bg-white border border-card-border rounded-card p-4 space-y-2">
      <div className="text-[11px] tracking-[0.16em] uppercase text-text-muted mb-1">
        {fileName}
      </div>
      <Row tone="ok" label="Valid SVG structure" />
      <Row tone={namedTone} label="Named elements" detail={namedDetail} />
      <Row
        tone="ok"
        label="Text elements"
        detail={`${validation.textElementCount} found`}
      />
      <Row tone="ok" label="File size" detail={`${validation.fileSizeKB} KB`} />
      <Row
        tone="ok"
        label="Canvas size"
        detail={`${Math.round(validation.width)} × ${Math.round(validation.height)} px`}
      />
    </div>
  );
}

function Row({
  tone,
  label,
  detail,
}: {
  tone: "ok" | "warn" | "error";
  label: string;
  detail?: string;
}) {
  const colors = {
    ok: { dot: "bg-[#2a7a3c]", text: "text-[#1a1a1a]" },
    warn: { dot: "bg-[#a06b1c]", text: "text-[#a06b1c]" },
    error: { dot: "bg-[#a83232]", text: "text-[#a83232]" },
  }[tone];
  const symbol = tone === "ok" ? "✓" : tone === "warn" ? "!" : "✕";
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span
        className={`mt-[2px] inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-bold ${colors.dot}`}
      >
        {symbol}
      </span>
      <div className={`flex-1 ${colors.text}`}>
        <div className="font-medium">{label}</div>
        {detail && <div className="text-text-muted text-[11px] mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}
