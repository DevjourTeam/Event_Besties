import { loadDashboardItems } from "@/lib/dashboard-data";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { items, source } = await loadDashboardItems();
  return <DashboardClient items={items} source={source} />;
}
