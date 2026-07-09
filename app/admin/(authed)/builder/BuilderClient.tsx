"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SvgBuilderPanel } from "./SvgBuilderPanel";
import { CanvasBuilderPanel } from "./CanvasBuilderPanel";

type Tab = "svg" | "canvas";

export function BuilderClient() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "canvas" ? "canvas" : "svg";

  const setTab = (next: Tab) => {
    const sp = new URLSearchParams(Array.from(params.entries()));
    sp.set("tab", next);
    router.replace(`/admin/builder?${sp.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-10 pt-8 pb-4 bg-cream">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-card-border bg-white hover:bg-form-surface text-[#1a1a1a]"
            aria-label="Back to dashboard"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <h1 className="font-serif-display text-[28px] leading-tight text-[#1a1a1a]">
              Template Builder
            </h1>
            <p className="text-[12px] text-text-muted">
              Upload an SVG and configure customer permissions, or build a free canvas product.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex items-center gap-2">
          <TabPill active={tab === "svg"} onClick={() => setTab("svg")}>
            <span className="font-mono text-[11px] mr-1">1</span> SVG Template — Upload &amp; Permissions
          </TabPill>
          <TabPill active={tab === "canvas"} onClick={() => setTab("canvas")}>
            <span className="font-mono text-[11px] mr-1">2</span> Canvas Config — Free Design Editor
          </TabPill>
        </div>
      </div>

      {/* Body */}
      {tab === "svg" ? <SvgBuilderPanel /> : <CanvasBuilderPanel />}
    </div>
  );
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-4 rounded-lg text-[12px] border transition-colors ${
        active
          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
          : "bg-white text-[#1a1a1a] border-card-border hover:bg-form-surface"
      }`}
    >
      {children}
    </button>
  );
}
