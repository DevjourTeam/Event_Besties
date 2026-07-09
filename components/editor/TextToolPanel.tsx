"use client";

import { useState } from "react";
import { ALL_EDITOR_FONTS } from "@/lib/google-fonts";

const PRESET_COLORS = [
  "#1a1a1a",
  "#ffffff",
  "#c8a96e",
  "#d8534f",
  "#3aa05c",
  "#2a5b94",
  "#5b3a8a",
  "#a06b1c",
];

export type TextStyle = "heading" | "subheading" | "body";

type Props = {
  open: boolean;
  onToggle: () => void;
  onAddText: (style: TextStyle, opts: {
    fontFamily: string;
    fontSize: number;
    fill: string;
    fontWeight: string;
  }) => void;
  /** Applies font/size/color/style to an active text object, if any. */
  onApplyToActive?: (patch: Partial<{
    fontFamily: string;
    fontSize: number;
    fill: string;
    fontWeight: string;
    fontStyle: string;
  }>) => void;
};

export function TextToolPanel({ open, onToggle, onAddText, onApplyToActive }: Props) {
  const [fontFamily, setFontFamily] = useState("Georgia");
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState("#1a1a1a");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  const apply = (patch: Parameters<NonNullable<Props["onApplyToActive"]>>[0]) => {
    onApplyToActive?.(patch);
  };

  const setFont = (f: string) => {
    setFontFamily(f);
    apply({ fontFamily: cssFamilyFor(f) });
  };
  const setSize = (n: number) => {
    const clamped = Math.max(8, Math.min(300, n));
    setFontSize(clamped);
    apply({ fontSize: clamped });
  };
  const setFill = (c: string) => {
    setColor(c);
    apply({ fill: c });
  };
  const toggleBold = () => {
    const next = !bold;
    setBold(next);
    apply({ fontWeight: next ? "bold" : "normal" });
  };
  const toggleItalic = () => {
    const next = !italic;
    setItalic(next);
    apply({ fontStyle: next ? "italic" : "normal" });
  };

  return (
    <div className="bg-form-surface border border-card-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#f3efe6]"
      >
        <div className="w-9 h-9 rounded-md bg-white border border-card-border flex items-center justify-center text-text-muted font-serif-display text-[16px]">
          T
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-[#1a1a1a]">Add Text</div>
          <div className="text-[10px] text-text-muted">Add your text here</div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-card-border bg-white">
          {/* Style buttons */}
          <div className="flex gap-2">
            <StyleBtn label="Heading" onClick={() => onAddText("heading", { fontFamily: cssFamilyFor(fontFamily), fontSize: 36, fill: color, fontWeight: "bold" })} />
            <StyleBtn label="Subheading" onClick={() => onAddText("subheading", { fontFamily: cssFamilyFor(fontFamily), fontSize: 22, fill: color, fontWeight: "600" })} />
            <StyleBtn label="Body" onClick={() => onAddText("body", { fontFamily: cssFamilyFor(fontFamily), fontSize: 15, fill: color, fontWeight: "normal" })} />
          </div>

          {/* Fonts dropdown */}
          <div>
            <div className="text-[10px] tracking-[0.12em] uppercase text-text-muted mb-1">Font</div>
            <select
              value={fontFamily}
              onChange={(e) => setFont(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-card-border bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {ALL_EDITOR_FONTS.map((f) => (
                <option key={f.name} value={f.name} style={{ fontFamily: f.cssFamily }}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Size */}
          <div>
            <div className="text-[10px] tracking-[0.12em] uppercase text-text-muted mb-1">Size</div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setSize(fontSize - 1)} className="w-7 h-8 rounded-md border border-card-border bg-white text-[14px]">−</button>
              <input
                type="number"
                value={fontSize}
                min={8}
                max={300}
                onChange={(e) => setSize(Number(e.target.value))}
                className="flex-1 h-8 px-2 rounded-md border border-card-border bg-form-surface text-[12px] text-center"
              />
              <button type="button" onClick={() => setSize(fontSize + 1)} className="w-7 h-8 rounded-md border border-card-border bg-white text-[14px]">+</button>
            </div>
          </div>

          {/* Bold / Italic */}
          <div className="flex items-center gap-1">
            <ToggleBtn active={bold} onClick={toggleBold} label="Bold">
              <span className="font-bold text-[13px]">B</span>
            </ToggleBtn>
            <ToggleBtn active={italic} onClick={toggleItalic} label="Italic">
              <span className="italic font-serif-display text-[13px]">I</span>
            </ToggleBtn>
          </div>

          {/* Color */}
          <div>
            <div className="text-[10px] tracking-[0.12em] uppercase text-text-muted mb-1">Color</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFill(c)}
                  className={`w-6 h-6 rounded-full border ${color === c ? "border-[#1a1a1a] ring-2 ring-gold" : "border-card-border"}`}
                  style={{ background: c }}
                  aria-label={`Set color ${c}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setFill(e.target.value)}
                className="w-7 h-7 p-0 border border-card-border rounded-md bg-white cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StyleBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 h-9 rounded-md border border-card-border bg-white text-[11px] hover:bg-form-surface"
    >
      {label}
    </button>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`w-8 h-8 rounded-md border ${
        active
          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
          : "bg-white text-[#1a1a1a] border-card-border hover:bg-form-surface"
      }`}
    >
      {children}
    </button>
  );
}

export function cssFamilyFor(name: string): string {
  const f = ALL_EDITOR_FONTS.find((x) => x.name === name);
  return f ? f.cssFamily : `'${name}', sans-serif`;
}
