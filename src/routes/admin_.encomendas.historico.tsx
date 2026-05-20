import { createFileRoute } from "@tanstack/react-router";
import { AdminOrders } from "@/components/AdminOrders";

export const Route = createFileRoute("/admin_/encomendas/historico")({
  head: () => ({ meta: [{ title: "Histórico | Admin" }] }),
  component: () => <AdminOrders mode="history" />,
});
