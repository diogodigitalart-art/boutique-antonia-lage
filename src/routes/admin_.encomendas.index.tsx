import { createFileRoute } from "@tanstack/react-router";
import { AdminOrders } from "@/components/AdminOrders";

export const Route = createFileRoute("/admin_/encomendas/")({
  head: () => ({ meta: [{ title: "Encomendas activas | Admin" }] }),
  component: () => <AdminOrders mode="active" />,
});