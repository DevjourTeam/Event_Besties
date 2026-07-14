"use client";

/**
 * The size list shared by both builders.
 *
 * Each row becomes a Shopify variant under a "Size" option, priced separately.
 * The customer must pick one before the editor will open.
 *
 * A CANVAS size also sets the print dimensions — that is what the customer
 * designs on. A TEMPLATE size does not: the artwork is fixed, so the size only
 * changes the price. `withDimensions` is what tells the two apart.
 */
export type DraftSize = {
  label: string;
  priceGbp: number;
  printWidthCm?: number;
  printHeightCm?: number;
};

/**
 * The sailboard sizes the store actually sells. Defined ONCE so the canvas and
 * template builders cannot drift apart — a template must offer the same sizes at
 * the same prices as the canvas, or the storefront contradicts itself.
 */
export const DEFAULT_CANVAS_SIZES: DraftSize[] = [
  { label: "5ft (150 x 74cm)", printWidthCm: 74, printHeightCm: 150, priceGbp: 69.99 },
  { label: "6ft (180 x 90cm)", printWidthCm: 90, printHeightCm: 180, priceGbp: 89.99 },
  { label: "7ft (210 x 105cm)", printWidthCm: 105, printHeightCm: 210, priceGbp: 109.99 },
];

/** Same sizes, minus the dimensions — a template's artwork is fixed. */
export const DEFAULT_TEMPLATE_SIZES: DraftSize[] = DEFAULT_CANVAS_SIZES.map(
  ({ label, priceGbp }) => ({ label, priceGbp })
);

export const money = (n: number) => `£${n.toFixed(2)}`;

/** A single price, or the range across sizes — what the product page shows. */
export function priceLabelFor(sizes: DraftSize[]): string {
  if (!sizes.length) return money(0);
  const lo = Math.min(...sizes.map((s) => s.priceGbp));
  const hi = Math.max(...sizes.map((s) => s.priceGbp));
  return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;
}

/** Every size needs a unique name, a price, and (for canvas) real dimensions. */
export function sizesValid(sizes: DraftSize[], withDimensions: boolean): boolean {
  if (!sizes.length) return false;
  const named = sizes.every((s) => s.label.trim().length > 0);
  const unique = new Set(sizes.map((s) => s.label.trim())).size === sizes.length;
  const sized =
    !withDimensions ||
    sizes.every((s) => (s.printWidthCm ?? 0) > 0 && (s.printHeightCm ?? 0) > 0);
  return named && unique && sized;
}

export function SizesPanel({
  sizes,
  onChange,
  withDimensions = false,
}: {
  sizes: DraftSize[];
  onChange: (next: DraftSize[]) => void;
  withDimensions?: boolean;
}) {
  const patch = (i: number, p: Partial<DraftSize>) =>
    onChange(sizes.map((s, j) => (j === i ? { ...s, ...p } : s)));

  const add = () =>
    onChange([
      ...sizes,
      {
        label: `Size ${sizes.length + 1}`,
        priceGbp: 0,
        ...(withDimensions ? { printWidthCm: 100, printHeightCm: 150 } : {}),
      },
    ]);

  // A product with no sizes has nothing to sell — always keep one.
  const remove = (i: number) =>
    sizes.length > 1 && onChange(sizes.filter((_, j) => j !== i));

  return (
    <>
      <div className="space-y-3">
        {sizes.map((s, i) => (
          <div key={i} className="rounded-lg border border-card-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={s.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                placeholder="6ft (180 x 90cm)"
                className="flex-1 h-9 px-3 rounded-lg border border-card-border bg-form-surface text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={sizes.length <= 1}
                title={sizes.length <= 1 ? "A product needs at least one size" : "Remove size"}
                className="h-9 w-9 shrink-0 rounded-lg border border-card-border text-[13px] text-text-muted hover:bg-form-surface disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>

            <div className={`grid gap-2 ${withDimensions ? "grid-cols-3" : "grid-cols-1"}`}>
              {withDimensions && (
                <>
                  <Num
                    label="W (cm)"
                    value={s.printWidthCm ?? 0}
                    onChange={(v) => patch(i, { printWidthCm: v })}
                  />
                  <Num
                    label="H (cm)"
                    value={s.printHeightCm ?? 0}
                    onChange={(v) => patch(i, { printHeightCm: v })}
                  />
                </>
              )}
              <Num
                label="Price (£)"
                value={s.priceGbp}
                onChange={(v) => patch(i, { priceGbp: v })}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 w-full h-9 rounded-lg border border-dashed border-card-border text-[12px] text-text-muted hover:bg-form-surface"
      >
        + Add another size
      </button>

      {!sizesValid(sizes, withDimensions) && (
        <p className="text-[10px] text-red-600 mt-2 leading-relaxed">
          {withDimensions
            ? "Every size needs a unique name and a width and height above zero."
            : "Every size needs a unique name."}
        </p>
      )}

      <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
        Each size becomes a Shopify variant under a <strong>Size</strong> option, priced
        separately. The customer must pick one before the editor will open.{" "}
        {withDimensions
          ? "The chosen size sets their canvas dimensions."
          : "The artwork is the same for every size — only the price changes."}{" "}
        Sizes are fixed once the product is created.
      </p>
    </>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="text-[11px] text-text-muted mb-1">{label}</div>
      <input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-9 px-3 rounded-lg border border-card-border bg-form-surface text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
    </label>
  );
}
