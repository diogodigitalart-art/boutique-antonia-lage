import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminOrders } from "@/components/AdminOrders";

export const Route = createFileRoute("/admin_/encomendas/canceladas")({
  head: () => ({ meta: [{ title: "Canceladas | Admin" }] }),
  component: () => (
    <AdminLayout>
      <AdminOrders mode="cancelled" />
    </AdminLayout>
  ),
});
