"use client";

import { useRef } from "react";
import { UploadCloudIcon } from "./Icons";
import { parseSvg, type SvgValidation } from "@/lib/svg-parser";

type Props = {
  onLoaded: (result: {
    fileName: string;
    svgText: string;
    validation: SvgValidation;
  }) => void;
};

export function SVGUploader({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const validation = parseSvg(text);
    onLoaded({ fileName: file.name, svgText: text, validation });
  };

  return (
    <div
      className="border-2 border-dashed border-card-border rounded-card bg-form-surface px-4 py-4 flex items-center gap-3 cursor-pointer hover:bg-[#f3efe6] transition-colors"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <div className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-card-border text-text-muted">
        <UploadCloudIcon size={16} />
      </div>
      <div className="min-w-0 text-left">
        <div className="text-[13px] font-medium text-[#1b2333]">Click to upload SVG</div>
        <div className="text-[10px] text-text-muted leading-snug">
          Export from Illustrator with named layers
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
