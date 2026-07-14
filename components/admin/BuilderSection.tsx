"use client";

/**
 * One titled block in a builder's form column.
 *
 * Both builders stack the same way — sizes first, then the product-specific
 * settings — so they share this rather than each inventing a card style.
 */
export function BuilderSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-card-border bg-white p-4">
      <h3 className="text-[10px] tracking-[0.16em] uppercase text-text-muted mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}
