"use client";

import { useEffect, useState } from "react";
import type { AnyConfig } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

type Step = "design" | "printing";

type EditorShellProps = {
  config: AnyConfig;
  leftPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelVisible?: boolean;
  canvasArea: React.ReactNode;
  topRightActions?: React.ReactNode;
  onProcess?: () => void;
  processing?: boolean;
};

/**
 * Fixed-viewport layout shared by both editor modes.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ TOP BAR (52px)                               │
 *   ├────────┬───────────────────────┬─────────────┤
 *   │ LEFT   │      CANVAS AREA      │   RIGHT     │
 *   │ 260px  │       flex 1          │   210px     │
 *   │        │                       │ (hidden     │
 *   │        │                       │  until sel) │
 *   ├────────┴───────────────────────┴─────────────┤
 *   │ BOTTOM BAR (70px)                            │
 *   └──────────────────────────────────────────────┘
 */
export function EditorShell({
  config,
  leftPanel,
  rightPanel,
  rightPanelVisible = false,
  canvasArea,
  topRightActions,
  onProcess,
  processing = false,
}: EditorShellProps) {
  const [step] = useState<Step>("design");
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (tooSmall) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream text-[#1a1a1a] px-6 text-center">
        <div className="max-w-xs">
          <div className="font-serif-display italic text-[24px]">Event Besties</div>
          <p className="mt-4 text-[13px] text-text-muted leading-relaxed">
            This editor works best on desktop or tablet. Please reopen on a
            larger screen to customize your design.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-cream text-[#1a1a1a]">
      {/* TOP BAR */}
      <header className="h-[52px] shrink-0 bg-white border-b border-card-border flex items-center px-6">
        <div className="w-[260px] text-[15px] font-semibold tracking-[0.01em]">
          Create Your Design
        </div>
        <div className="flex-1 flex items-center justify-center gap-3 text-[12px] text-text-muted">
          <StepDot active={step === "design"} label="Create Your Design" />
          <span className="w-8 h-px bg-card-border" />
          <StepDot active={false} label="Printing" />
        </div>
        <div className="w-[260px] flex items-center justify-end">
          {topRightActions}
        </div>
      </header>

      {/* MAIN ROW */}
      <div className="flex-1 min-h-0 flex relative">
        <aside className="w-[260px] shrink-0 bg-white border-r border-card-border overflow-y-auto">
          {leftPanel}
        </aside>

        <section className="flex-1 min-w-0 flex items-center justify-center overflow-auto p-8">
          {canvasArea}
        </section>

        {rightPanelVisible && rightPanel && (
          <aside className="w-[210px] shrink-0 bg-white border-l border-card-border overflow-y-auto">
            {rightPanel}
          </aside>
        )}

        {processing && (
          <div className="absolute inset-0 z-40 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-card shadow-xl px-6 py-5 flex items-center gap-4">
              <span className="text-[#1a1a1a]">
                <Spinner size={22} />
              </span>
              <div>
                <div className="text-[13px] font-medium">
                  Generating high-res file…
                </div>
                <div className="text-[11px] text-text-muted">
                  This may take a few seconds
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR */}
      <footer className="h-[70px] shrink-0 bg-white border-t border-card-border flex items-center px-6 gap-4">
        <div className="w-9 h-9 rounded-lg bg-form-surface border border-card-border flex items-center justify-center relative">
          <div className="w-5 h-6 bg-white border border-card-border rounded-sm" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold" />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-medium truncate max-w-[260px]">
            {config.productName}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-[0.08em]">
            {config.type === "template" ? "Premade Template" : "Custom Canvas"}
          </div>
        </div>
        <div className="flex-1" />
        <div className="font-serif-display text-[20px] font-bold text-[#1a1a1a]">
          {config.price}
        </div>
        <button
          type="button"
          onClick={onProcess}
          disabled={processing || !onProcess}
          className="h-10 px-6 rounded-lg bg-gold hover:bg-gold-hover text-white text-[14px] font-bold tracking-[0.02em] disabled:opacity-60 inline-flex items-center gap-2"
        >
          {processing && <Spinner size={14} />}
          {processing ? "Processing…" : "Process"}
        </button>
      </footer>
    </div>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          active ? "bg-[#1a1a1a]" : "border border-text-muted"
        }`}
      />
      <span className={active ? "text-[#1a1a1a]" : ""}>{label}</span>
    </span>
  );
}
