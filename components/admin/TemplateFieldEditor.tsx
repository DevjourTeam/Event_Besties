"use client";

import { useId } from "react";
import type { TemplateTextField, TemplateColorSlot } from "@/lib/types";
import { isGoogleFont } from "@/lib/google-fonts";
import googleFontsList from "@/lib/google-fonts-list.json";

/**
 * The v2 builder surface. Replaces PermissionEditor for auto-extracted
 * templates.
 *
 * Two things it does that the old permission list could not:
 *
 *  1. Nothing here came from a layer name. Text fields are whatever <text>
 *     elements the artwork contains; colours are grouped by fill value. The
 *     admin never has to prepare the SVG a particular way.
 *
 *  2. It refuses to let an unrenderable font through. The customer editor can
 *     only draw Google Fonts, so every field must be mapped to one before the
 *     product can be created — the failure surfaces here, at upload, instead of
 *     silently at checkout.
 */

const FONT_LIST = googleFontsList as string[];

type Props = {
  textFields: TemplateTextField[];
  colorSlots: TemplateColorSlot[];
  onTextChange: (next: TemplateTextField[]) => void;
  onColorChange: (next: TemplateColorSlot[]) => void;
};

/** Fields still missing a Google font. Publish is blocked while this is non-empty. */
export function unmappedFonts(fields: TemplateTextField[]): TemplateTextField[] {
  return fields.filter((f) => f.editable && !isGoogleFont(f.fontFamily));
}

export function TemplateFieldEditor({
  textFields,
  colorSlots,
  onTextChange,
  onColorChange,
}: Props) {
  const listId = useId();

  const patchText = (i: number, patch: Partial<TemplateTextField>) => {
    const next = [...textFields];
    next[i] = { ...next[i], ...patch };
    onTextChange(next);
  };

  const patchColor = (i: number, patch: Partial<TemplateColorSlot>) => {
    const next = [...colorSlots];
    next[i] = { ...next[i], ...patch };
    onColorChange(next);
  };

  return (
    <div className="space-y-5">
      <datalist id={listId}>
        {FONT_LIST.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      {/* ---------------- text ---------------- */}
      <section>
        <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
          Text fields · {textFields.length} found
        </div>

        <div className="space-y-2">
          {textFields.map((f, i) => {
            const mapped = isGoogleFont(f.fontFamily);
            const originalIsGoogle = isGoogleFont(f.originalFont);

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
                    &ldquo;{f.value.slice(0, 30)}
                    {f.value.length > 30 ? "…" : ""}&rdquo;
                  </span>
                  <span className="ml-auto text-[10px] text-text-muted shrink-0">
                    {Math.round(f.fontSize)}px
                  </span>
                </div>

                <Field label="Label shown to customer">
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => patchText(i, { label: e.target.value })}
                    className="w-full h-8 px-2 rounded-md border border-card-border bg-form-surface text-[11px] focus:outline-none focus:ring-1 focus:ring-gold/50"
                  />
                </Field>

                <Field label="Font the editor will render">
                  <input
                    type="text"
                    list={listId}
                    value={f.fontFamily}
                    placeholder="Search Google Fonts…"
                    onChange={(e) => patchText(i, { fontFamily: e.target.value })}
                    className={`w-full h-8 px-2 rounded-md border bg-form-surface text-[11px] focus:outline-none focus:ring-1 ${
                      mapped
                        ? "border-[#c9e2cf] focus:ring-gold/50"
                        : "border-[#f1ddb3] bg-[#fdf3e1] focus:ring-[#a06b1c]/40"
                    }`}
                  />
                </Field>

                {!originalIsGoogle && f.originalFont && (
                  <p className="text-[10px] text-[#a06b1c] leading-relaxed">
                    Artwork uses <strong>{f.originalFont}</strong>, which isn&rsquo;t a
                    Google Font — the editor cannot render it. Pick a replacement above.
                  </p>
                )}

                <label className="flex items-center gap-2 text-[11px] text-[#1b2333] pt-0.5">
                  <input
                    type="checkbox"
                    checked={f.editable}
                    onChange={(e) => patchText(i, { editable: e.target.checked })}
                  />
                  Customer can edit this text
                </label>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- colour ---------------- */}
      <section>
        <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-2">
          Colours · {colorSlots.length} found
        </div>

        <div className="space-y-2">
          {colorSlots.map((c, i) => (
            <div
              key={c.nodeId}
              className="bg-white border border-card-border rounded-lg px-3 py-2.5 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded border border-card-border shrink-0"
                  style={{ backgroundColor: c.hex }}
                />
                <code className="text-[11px] font-mono text-[#1b2333]">{c.hex}</code>
                <span className="ml-auto text-[10px] text-text-muted">
                  used {c.count}×
                </span>
              </div>

              <label className="flex items-center gap-2 text-[11px] text-[#1b2333]">
                <input
                  type="checkbox"
                  checked={c.exposed}
                  onChange={(e) => patchColor(i, { exposed: e.target.checked })}
                />
                Customer can change this colour
              </label>

              {c.exposed && (
                <input
                  type="text"
                  value={c.label}
                  placeholder="Label, e.g. Strawberry"
                  onChange={(e) => patchColor(i, { label: e.target.value })}
                  className="w-full h-8 px-2 rounded-md border border-card-border bg-form-surface text-[11px] focus:outline-none focus:ring-1 focus:ring-gold/50"
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
          Colours are shared, not per-shape. Exposing one lets the customer
          recolour every element painted with it at once.
        </p>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] text-text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}
