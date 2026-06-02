import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  adminListGiftCards,
  adminExpireGiftCard,
  adminResendGiftCard,
  type AdminGiftCardRow,
} from "@/server-fns/giftCards";

export const Route = createFileRoute("/admin_/cartoes-oferta")({
  head: () => ({ meta: [{ title: "Cartões Oferta | Admin" }] }),
  component: () => (
    <AdminLayout>
      <Content />
    </AdminLayout>
  ),
});

function Content() {
  const list = useServerFn(adminListGiftCards);
  const expire = useServerFn(adminExpireGiftCard);
  const resend = useServerFn(adminResendGiftCard);
  const [rows, setRows] = useState<AdminGiftCardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sessão expirada");
      const r = await list({ data: { token } });
      setRows(r.rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const action = async (fn: typeof expire, id: string, label: string) => {
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sessão expirada");
      await fn({ data: { token, id } });
      toast.success(label);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Cartões Oferta</h1>
      </header>
      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem cartões emitidos.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Valor</th>
                <th className="p-3">De</th>
                <th className="p-3">Para</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Envio</th>
                <th className="p-3">Acções</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{r.code}</td>
                  <td className="p-3">€{Number(r.amount).toFixed(2)}</td>
                  <td className="p-3">
                    <div>{r.sender_name}</div>
                    <div className="text-xs text-muted-foreground">{r.sender_email}</div>
                  </td>
                  <td className="p-3">
                    <div>{r.recipient_name}</div>
                    <div className="text-xs text-muted-foreground">{r.recipient_email}</div>
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span>
                  </td>
                  <td className="p-3 text-xs">{r.send_date}{r.sent_at ? " ✓" : ""}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {r.status !== "redeemed" && r.status !== "expired" && (
                        <button
                          onClick={() => void action(expire, r.id, "Cartão expirado")}
                          className="text-xs underline text-muted-foreground hover:text-foreground"
                        >
                          Expirar
                        </button>
                      )}
                      {r.status !== "redeemed" && (
                        <button
                          onClick={() => void action(resend, r.id, "Email reenviado")}
                          className="text-xs underline text-muted-foreground hover:text-foreground"
                        >
                          Reenviar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}