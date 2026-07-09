"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";

const ACCEPT_IMAGE = "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml";

export type CreateProductSuccess = {
  productId: string;
  title: string;
  adminUrl: string;
  imageError: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: {
    title: string;
    description: string;
    priceGbp: number;
    imageDataUrl: string | null;
  }) => Promise<CreateProductSuccess | { error: string }>;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function CreateProductModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleFile = async (file: File | null) => {
    setImageFile(file);
    if (!file) {
      setImagePreview(null);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImagePreview(dataUrl);
    } catch {
      setImagePreview(null);
    }
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setPrice("0");
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Price must be a number ≥ 0");
      return;
    }
    let imageDataUrl: string | null = null;
    if (imageFile) {
      try {
        imageDataUrl = await fileToDataUrl(imageFile);
      } catch {
        setError("Could not read image file");
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priceGbp: priceNum,
        imageDataUrl,
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        reset();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-[520px] bg-white rounded-card shadow-2xl border border-card-border p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[16px] font-semibold text-[#1a1a1a]">
              Create Shopify product
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Creates a new product with inventory tracking disabled.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-md text-text-muted hover:bg-form-surface disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Title" required>
            <input
              ref={firstFieldRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Happy Birthday Princess"
              className="w-full h-10 px-3 rounded-lg border border-card-border bg-form-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="You can also add this later in Shopify admin"
              className="w-full px-3 py-2 rounded-lg border border-card-border bg-form-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
          </Field>

          <Field label="Price (GBP)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-card-border bg-form-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </Field>

          <Field label="Product image (optional)">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center h-9 px-3 rounded-md border border-card-border bg-form-surface text-[11px] cursor-pointer hover:bg-[#f3efe6]">
                {imageFile ? "Change file" : "Choose file"}
                <input
                  type="file"
                  accept={ACCEPT_IMAGE}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {imagePreview && (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-10 h-10 rounded border border-card-border object-cover"
                  />
                  <span className="text-[11px] text-text-muted truncate max-w-[180px]">
                    {imageFile?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFile(null)}
                    className="text-[11px] text-text-muted hover:text-[#1a1a1a]"
                  >
                    remove
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-1.5 leading-relaxed">
              PNG, JPG, WEBP, GIF, or SVG. Max 20 MB and 5000×5000 px (Shopify limit).
              Leave empty to add an image later in Shopify admin.
            </p>
          </Field>
        </div>

        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 px-4 rounded-lg border border-card-border bg-white text-[12px] text-[#1a1a1a] hover:bg-form-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="h-10 px-5 rounded-lg bg-gold hover:bg-gold-hover text-white text-[12px] font-semibold disabled:opacity-60 inline-flex items-center gap-2"
          >
            {submitting && <Spinner size={13} />}
            {submitting ? "Creating…" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] text-text-muted mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      {children}
    </label>
  );
}
