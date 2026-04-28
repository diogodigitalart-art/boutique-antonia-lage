import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/admin_/encomendas")({
  head: () => ({ meta: [{ title: "Encomendas | Admin" }] }),
  component: () => (
    <AdminLayout>
      <ComingSoon title="Encomendas" icon={ShoppingBag} />
    </AdminLayout>
  ),
});

function ComingSoon({ title, icon: Icon }: { title: string; icon: typeof ShoppingBag }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">{title}</h1>
      </header>
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 font-display text-xl italic text-foreground">Em breve</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Esta secção está em desenvolvimento.
        </p>
      </div>
    </div>
  );
}