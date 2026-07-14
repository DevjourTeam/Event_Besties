"use client";

import { useEffect, useState } from "react";
import type { AnyConfig } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

// The custom canvas editor's design system. Imported here so the template editor
// wears the same skin — same stage, topbar, canvas card and bottom bar — instead
// of a second look for what the customer experiences as one product.
import "@/components/editor/canvas/styles/tokens.css";
import "@/components/editor/canvas/styles/nxicons.css";
import "@/components/editor/canvas/styles/shell.css";

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
 * The shell shared by both editor modes, in the custom editor's visual language:
 *
 *   ┌─ ps-stage ─────────────────────────────────────┐
 *   │ ps-sidebar │ ps-topbar                          │
 *   │  (tools)   ├────────────────────────────────────┤
 *   │            │ ps-canvas-wrap                     │
 *   │            ├────────────────────────────────────┤
 *   │            │ ps-bottombar (thumb · price · CTA) │
 *   └────────────┴────────────────────────────────────┘
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
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (tooSmall) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream text-[#1b2333] px-6 text-center">
        <div className="max-w-xs">
          <div className="font-serif-display italic text-[24px]">Event Besties</div>
          <p className="mt-4 text-[13px] text-text-muted leading-relaxed">
            This editor works best on desktop or tablet. Please reopen on a larger
            screen to customize your design.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-editor">
      <div className="ps-stage">
        <aside className="ps-sidebar">{leftPanel}</aside>

        <section className="ps-main">
          <header className="ps-topbar">
            <span className="ps-topbar__title">{config.productName}</span>
            <span className="ps-topbar__info" title="About this product">
              <i className="nxi nxi-info" aria-hidden="true" />
            </span>
            <div className="ps-topbar__spacer" />
            {topRightActions}
          </header>

          <div className="ps-canvas-wrap ps-tpl-canvas">
            {canvasArea}

            {processing && (
              <div className="ps-bgloader" role="status" aria-live="polite">
                <div className="ps-bgloader__card">
                  <span className="ps-bgloader__ring" aria-hidden="true" />
                  <span className="ps-bgloader__txt">
                    Generating your high-resolution print file…
                  </span>
                </div>
              </div>
            )}
          </div>

          <footer className="ps-bottombar">
            <div>
              <div className="ps-thumb" title={config.productName}>
                <span className="ps-thumb__dot" />
              </div>
              <div className="ps-thumb__label">{config.productName}</div>
            </div>
            <div className="ps-bottombar__spacer" />
            <div className="ps-price">{config.price}</div>
            <button
              type="button"
              className="ps-btn ps-btn--gold"
              onClick={onProcess}
              disabled={processing || !onProcess}
            >
              {processing && <Spinner size={14} />}
              {processing ? "Processing…" : "Process"}
            </button>
          </footer>
        </section>

        {rightPanelVisible && rightPanel && (
          <aside className="ps-sidebar ps-sidebar--right">{rightPanel}</aside>
        )}
      </div>
    </div>
  );
}
