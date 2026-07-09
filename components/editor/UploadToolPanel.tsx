"use client";

import { useRef } from "react";
import { UploadCloudIcon } from "@/components/admin/Icons";

type Props = {
  onFile: (dataUrl: string) => void;
};

export function UploadToolPanel({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") onFile(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="bg-form-surface border border-card-border rounded-lg p-4 cursor-pointer hover:bg-[#f3efe6]"
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-white border border-card-border flex items-center justify-center text-text-muted">
          <UploadCloudIcon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-[#1a1a1a]">Upload design</div>
          <div className="text-[10px] text-text-muted">Browse or import</div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handle(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
