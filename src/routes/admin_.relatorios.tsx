import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { ReportsDashboard } from "@/components/ReportsDashboard";

export const Route = createFileRoute("/admin_/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios | Admin" }] }),
  component: () => (
    <AdminLayout>
      <ReportsDashboard />
    </AdminLayout>
  ),
});