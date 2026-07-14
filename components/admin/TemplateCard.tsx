"use client";

import type { DashboardItem } from "@/lib/types";
import { EyeIcon } from "./Icons";
import { CanvasShapeThumb } from "./CanvasShapeThumb";

type TemplateCardProps = {
  item: DashboardItem;
  onPreview: (item: DashboardItem) => void;
};

export function TemplateCard({ item, onPreview }: TemplateCardProps) {
  const { config } = item;
  const isTemplate = config.type === "template";
  const svgUrl = isTemplate ? config.svgUrl : "";

  return (
    <div className="bg-white border border-card-border rounded-card overflow-hidden flex flex-col">
      <div
        className="h-[180px] flex items-center justify-center p-3"
        style={{
          background: svgUrl ? "#f6f6f8" : "#f4f5f7",
        }}
      >
        {isTemplate && svgUrl ? (
          // Raw <img> intentional: the file is on Cloudinary and is an SVG/raw asset.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={svgUrl}
            alt={config.productName}
            className="max-w-[80%] max-h-[150px] object-contain"
          />
        ) : !isTemplate ? (
          <CanvasShapeThumb config={config} maxW={220} maxH={150} />
        ) : (
          <div className="text-text-muted text-[11px]">No preview</div>
        )}
      </div>

      <div className="px-5 pt-4 pb-3 flex-1">
        <div
          className="text-[14px] font-medium text-[#1b2333] truncate"
          title={config.productName}
        >
          {config.productName}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge
            tone={isTemplate ? "amber" : "blue"}
            label={isTemplate ? "Template" : "Canvas"}
          />
          <Badge
            tone={config.status === "published" ? "green" : "gray"}
            label={config.status === "published" ? "Published" : "Draft"}
          />
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={() => onPreview(item)}
          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-card-border text-[13px] hover:bg-form-surface transition-colors"
        >
          <EyeIcon size={15} />
          Preview
        </button>
      </div>
    </div>
  );
}

function Badge({
  tone,
  label,
}: {
  tone: "amber" | "blue" | "green" | "gray";
  label: string;
}) {
  const tones: Record<string, string> = {
    // Type badges use the brand pair (gold = template, navy = canvas).
    amber: "bg-[#f3eddf] text-[#8a6f3f] border-[#e5d7ba]",
    blue: "bg-[#eceef3] text-[#3a4252] border-[#d7dae2]",
    // Status badges stay semantic.
    green: "bg-[#e8f4ea] text-[#2a7a3c] border-[#c9e2cf]",
    gray: "bg-[#f0f0f3] text-[#6b7385] border-[#dfe0e5]",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] tracking-[0.06em] uppercase px-2 py-[3px] rounded-md border ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
