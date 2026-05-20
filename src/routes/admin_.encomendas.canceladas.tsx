import { createFileRoute } from "@tanstack/react-router";
import { AdminOrders } from "@/components/AdminOrders";

export const Route = createFileRoute("/admin_/encomendas/canceladas")({
  head: () => ({ meta: [{ title: "Canceladas | Admin" }] }),
  component: () => <AdminOrders mode="cancelled" />,
});
