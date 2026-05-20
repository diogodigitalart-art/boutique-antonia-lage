import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";

export const Route = createFileRoute("/admin_/encomendas")({
  head: () => ({ meta: [{ title: "Encomendas | Admin" }] }),
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});
