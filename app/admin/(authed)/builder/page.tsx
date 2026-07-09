import { Suspense } from "react";
import { BuilderClient } from "./BuilderClient";

export const dynamic = "force-dynamic";

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="px-10 pt-10 text-text-muted">Loading…</div>}>
      <BuilderClient />
    </Suspense>
  );
}
