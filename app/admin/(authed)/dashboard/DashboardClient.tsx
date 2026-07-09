"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardItem } from "@/lib/types";
import { TemplateCard } from "@/components/admin/TemplateCard";
import { PreviewModal } from "@/components/admin/PreviewModal";
import { StatCard } from "@/components/admin/StatCard";
import { ChevronDownIcon, PlusIcon, SearchIcon } from "@/components/admin/Icons";

type Tab = "templates" | "canvases";
type StatusFilter = "all" | "published" | "draft";

type Props = {
  items: DashboardItem[];
  source: "shopify" | "empty";
};

export function DashboardClient({ items, source }: Props) {
  const [tab, setTab] = useState<Tab>("templates");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [previewing, setPreviewing] = useState<DashboardItem | null>(null);

  const stats = useMemo(() => {
    const templates = items.filter((i) => i.config.type === "template");
    const canvases = items.filter((i) => i.config.type === "canvas");
    const published = items.filter((i) => i.config.status === "published");
    const lastUpdated = items
      .map((i) => i.config.createdAt)
      .sort()
      .pop();
    return {
      templates: templates.length,
      canvases: canvases.length,
      published: published.length,
      lastUpdated: lastUpdated ?? "—",
    };
  }, [items]);

  const visible = useMemo(() => {
    const wanted = tab === "templates" ? "template" : "canvas";
    return items.filter((i) => {
      if (i.config.type !== wanted) return false;
      if (statusFilter !== "all" && i.config.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!i.config.productName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, tab, statusFilter, search]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16 max-w-[1500px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div>
          <h1 className="font-serif-display text-[26px] sm:text-[30px] lg:text-[34px] leading-tight text-[#1a1a1a]">
            Templates &amp; Canvases
          </h1>
          <p className="mt-1 text-[13px] text-text-muted">
            Manage your premade templates and custom canvas designs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/builder?tab=svg"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-card-border bg-white text-[13px] hover:bg-form-surface"
          >
            <PlusIcon size={15} /> New Template
          </Link>
          <Link
            href="/admin/builder?tab=canvas"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#1a1a1a] text-white text-[13px] hover:bg-black"
          >
            <PlusIcon size={15} /> New Canvas
          </Link>
        </div>
      </div>

      {source === "empty" && items.length === 0 && (
        <div className="mt-5 inline-flex items-center gap-2 text-[12px] text-text-muted bg-form-surface border border-card-border rounded-md px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
          Could not reach Shopify — check env vars or try again.
        </div>
      )}

      {/* Stats */}
      <div className="mt-7 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Templates" value={stats.templates} />
        <StatCard label="Custom Canvases" value={stats.canvases} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Last Updated" value={stats.lastUpdated} />
      </div>

      {/* Tabs */}
      <div className="mt-9 border-b border-card-border flex items-center gap-5 sm:gap-7 overflow-x-auto">
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")}>
          Premade Templates
        </TabButton>
        <TabButton active={tab === "canvases"} onClick={() => setTab("canvases")}>
          Custom Canvases
        </TabButton>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-card-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="appearance-none h-10 pl-4 pr-9 rounded-lg border border-card-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            <ChevronDownIcon size={14} />
          </span>
        </div>
      </div>

      {/* Cards grid: auto-fill keeps cards at a comfortable size on huge screens */}
      <div className="mt-6 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        {visible.length === 0 && (
          <div className="col-span-full bg-white border border-dashed border-card-border rounded-card px-8 py-14 text-center text-[13px] text-text-muted">
            {items.length === 0 ? (
              <>
                No {tab === "templates" ? "templates" : "canvases"} yet — create one from the{" "}
                <Link
                  href={tab === "templates" ? "/admin/builder?tab=svg" : "/admin/builder?tab=canvas"}
                  className="underline hover:text-[#1a1a1a]"
                >
                  builder
                </Link>
                .
              </>
            ) : (
              <>No {tab === "templates" ? "templates" : "canvases"} match your filters.</>
            )}
          </div>
        )}
        {visible.map((item) => (
          <TemplateCard key={item.config.templateId} item={item} onPreview={setPreviewing} />
        ))}
      </div>

      <PreviewModal item={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}

function TabButton({
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
      className={`relative pb-3 text-[13px] tracking-[0.02em] transition-colors ${
        active ? "text-[#1a1a1a]" : "text-text-muted hover:text-[#1a1a1a]"
      }`}
    >
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#1a1a1a]" />
      )}
    </button>
  );
}
