"use client";

import { useId, useRef, useState } from "react";
import type { TemplateTextField, CustomFont } from "@/lib/types";
import { isGoogleFont } from "@/lib/google-fonts";
import { isCustomFont } from "@/lib/custom-fonts";
import googleFontsList from "@/lib/google-fonts-list.json";
import { Spinner } from "@/components/Spinner";

/**
 * The v2 builder surface. Text only — colour swatches are extracted but not
 * exposed.
 *
 * Nothing here came from a layer name: the fields are whatever <text> elements
 * the artwork contains. The admin's only real job is fonts, because the editor
 * can draw a face only if it can fetch it. Two ways to satisfy that:
 *
 *   - map the field to a Google family, or
 *   - upload the original font file, which we host and inject as an @font-face
 *     under the exact name the SVG already uses — so the artwork renders as
 *     drawn, with no remapping at all.
 *
 * Until every field resolves one way or the other, publish stays blocked. The
 * failure belongs here, at upload, not silently at checkout.
 */

const FONT_LIST = googleFontsList as string[];

type Props = {
  textFields: TemplateTextField[];
  customFonts: CustomFont[];
  /** Detected in the SVG but not on Google — candidates for upload. */
  unhostedFonts: string[];
  onTextChange: (next: TemplateTextField[]) => void;
  onUploadFont: (file: File, family: string) => Promise<string | null>;
};

/** A field is satisfied by a Google family or by an uploaded face. */
export function fontResolved(f: TemplateTextField, customFonts: CustomFont[]): boolean {
  return isGoogleFont(f.fontFamily) || isCustomFont(f.fontFamily, customFonts);
}

/** Fields still without a renderable font. Publish is blocked while non-empty. */
export function unmappedFonts(
  fields: TemplateTextField[],
  customFonts: CustomFont[]
): TemplateTextField[] {
  return fields.filter((f) => f.editable && !fontResolved(f, customFonts));
}

export function TemplateFieldEditor({
  textFields,
  customFonts,
  unhostedFonts,
  onTextChange,
  onUploadFont,
}: Props) {
  const listId = useId();

  const patch = (i: number, p: Partial<TemplateTextField>) => {
    const next = [...textFields];
    next[i] = { ...next[i], ...p };
    onTextChange(next);
  };

  return (
    <div className="space-y-5">
      <datalist id={listId}>
        {customFonts.map((f) => (
          <option key={`c-${f.family}`} value={f.family} />
        ))}
        {FONT_LIST.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      {/* ---- fonts the artwork needs but Google doesn't host ---- */}
      {unhostedFonts.length > 0 && (
        <section>
          <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
            Fonts not on Google
          </div>
          <div className="space-y-2">
            {unhostedFonts.map((family) => (
              <FontUploadRow
                key={family}
                family={family}
                uploaded={isCustomFont(family, customFonts)}
                onUpload={(file) => onUploadFont(file, family)}
              />
            ))}
          </div>
          <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
            Upload the font file to keep the artwork&rsquo;s original typeface, or
            leave it and map each field to a Google font below. Uploading requires
            a licence that permits webfont embedding.
          </p>
        </section>
      )}

      {/* ---- text fields ---- */}
      <section>
        <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
          Text fields · {textFields.length} found
        </div>

        <div className="space-y-2">
          {textFields.map((f, i) => {
            const ok = fontResolved(f, customFonts);
            return (
              <div
                key={f.nodeId}
                className="bg-white border border-card-border rounded-lg px-3 py-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center text-[9px] tracking-[0.06em] uppercase px-1.5 py-[2px] rounded border bg-[#e8f1fb] text-[#2a5b94] border-[#cbdcef]">
                    text
                  </span>
                  <span className="text-[11px] text-text-muted truncate">
                    &ldquo;{f.value.slice(0, 28)}
                    {f.value.length > 28 ? "…" : ""}&rdquo;
                  </span>
                  <span className="ml-auto text-[10px] text-text-muted shrink-0">
                    {Math.round(f.fontSize)}px
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-text-muted mb-1">
                    Label shown to customer
                  </div>
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => patch(i, { label: e.target.value })}
                    className="w-full h-8 px-2 rounded-md border border-card-border bg-form-surface text-[11px] focus:outline-none focus:ring-1 focus:ring-gold/50"
                  />
                </div>

                <div>
                  <div className="text-[10px] text-text-muted mb-1">
                    Font the editor will render
                  </div>
                  <input
                    type="text"
                    list={listId}
                    value={f.fontFamily}
                    placeholder="Google font, or an uploaded font…"
                    onChange={(e) => patch(i, { fontFamily: e.target.value })}
                    className={`w-full h-8 px-2 rounded-md border text-[11px] focus:outline-none focus:ring-1 ${
                      ok
                        ? "border-[#c9e2cf] bg-form-surface focus:ring-gold/50"
                        : "border-[#f1ddb3] bg-[#fdf3e1] focus:ring-[#a06b1c]/40"
                    }`}
                  />
                  {!ok && f.originalFont && (
                    <p className="text-[10px] text-[#a06b1c] leading-relaxed mt-1">
                      Artwork uses <strong>{f.originalFont}</strong>. Upload that font
                      above, or pick a Google font here.
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-[11px] text-[#1b2333] pt-0.5">
                  <input
                    type="checkbox"
                    checked={f.editable}
                    onChange={(e) => patch(i, { editable: e.target.checked })}
                  />
                  Customer can edit this text
                </label>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function FontUploadRow({
  family,
  uploaded,
  onUpload,
}: {
  family: string;
  uploaded: boolean;
  onUpload: (file: File) => Promise<string | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const err = await onUpload(file);
    setError(err);
    setBusy(false);
  };

  return (
    <div
      className={`border rounded-lg px-3 py-2.5 ${
        uploaded
          ? "bg-[#e8f4ea] border-[#c9e2cf]"
          : "bg-[#fdf3e1] border-[#f1ddb3]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            uploaded ? "bg-[#2a7a3c]" : "bg-[#a06b1c]"
          }`}
        />
        <span
          className={`flex-1 truncate text-[12px] ${
            uploaded ? "text-[#2a7a3c]" : "text-[#a06b1c]"
          }`}
        >
          {family}
        </span>
        <span className="text-[9px] uppercase tracking-[0.06em] opacity-70 shrink-0">
          {uploaded ? "hosted" : "not on google"}
        </span>
      </div>

      {!uploaded && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="mt-2 w-full h-8 rounded-md border border-[#e0c98f] bg-white text-[11px] text-[#a06b1c] hover:bg-[#fffaf0] disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            {busy && <Spinner size={12} />}
            {busy ? "Uploading…" : "Upload font file (.woff2 .woff .ttf .otf)"}
          </button>
        </>
      )}

      {error && <p className="text-[10px] text-[#a83232] mt-1.5">{error}</p>}
    </div>
  );
}
