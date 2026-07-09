// ZOOM_FEATURE — revert with: bash scripts/revert-zoom-feature.sh
"use client";

import { useEffect, useRef, useState } from "react";

type ZoomControlsProps = {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onSetZoom: (pct: number) => void;
};

const PRESETS = [50, 75, 100, 125, 150, 200];

export function ZoomControls({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onReset,
  onSetZoom,
}: ZoomControlsProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const minusDisabled = zoomPercent <= 50;
  const plusDisabled = zoomPercent >= 200;

  return (
    <div ref={wrapRef} className="relative inline-flex items-center gap-1">
      <IconButton
        onClick={onZoomOut}
        disabled={minusDisabled}
        label="Zoom out"
      >
        <MinusIcon />
      </IconButton>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-w-[52px] h-7 px-1 text-center text-[12px] font-medium rounded-md hover:bg-black/5"
      >
        {zoomPercent}%
      </button>

      <IconButton
        onClick={onZoomIn}
        disabled={plusDisabled}
        label="Zoom in"
      >
        <PlusIcon />
      </IconButton>

      <span className="mx-1 w-px h-5 bg-card-border" />

      <IconButton onClick={onReset} label="Fit to screen">
        <FitIcon />
      </IconButton>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
          {PRESETS.map((p) => {
            const active = p === zoomPercent;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onSetZoom(p);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-1.5 text-[12px] hover:bg-gray-50"
              >
                <span>
                  {p}%{p === 100 ? " (Fit)" : ""}
                </span>
                {active && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-7 h-7 inline-flex items-center justify-center rounded-md text-[#1a1a1a] ${
        disabled
          ? "opacity-40 cursor-not-allowed pointer-events-none"
          : "hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

function MinusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function FitIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
