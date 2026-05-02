import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminListBrands,
  adminAddBrand,
  adminDeleteBrand,
  adminListSeasons,
  adminAddSeason,
  adminDeleteSeason,
} from "@/server/products";
import {
  listExperienceCapacity,
  adminSetExperienceCapacity,
  type ExperienceCapacityRow,
} from "@/server/slots";

export const Route = createFileRoute("/admin_/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações | Admin" }] }),
  component: () => (
    <AdminLayout>
      <Content />
    </AdminLayout>
  ),
});

type Row = { id: string; name: string };

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada");
  return token;
}

function Content() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Configurações</h1>
      </header>

      <div className="space-y-8">
        <ManagedList
          title="Marcas"
          placeholder="Nova marca…"
          listFn={adminListBrands}
          addFn={adminAddBrand}
          delFn={adminDeleteBrand}
        />
        <ManagedList
          title="Seasons"
          placeholder="Nova season (ex: AW25)…"
          listFn={adminListSeasons}
          addFn={adminAddSeason}
          delFn={adminDeleteSeason}
        />
        <ExperienceCapacitySection />
      </div>
    </div>
  );
}

function ExperienceCapacitySection() {
  const list = useServerFn(listExperienceCapacity);
  const set = useServerFn(adminSetExperienceCapacity);
  const [rows, setRows] = useState<ExperienceCapacityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyName, setBusyName] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await list();
      setRows(r.rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleChange = async (experienceName: string, value: number) => {
    if (!Number.isFinite(value) || value < 1) return;
    setBusyName(experienceName);
    try {
      const token = await getToken();
      await set({ data: { token, experienceName, maxCapacity: value } });
      toast.success("Capacidade actualizada");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusyName(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl italic mb-1">Capacidade por experiência</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Número máximo de reservas aceites por horário para cada experiência.
        As reservas de produtos (provas) não têm limite a este nível — controlam-se
        por peça e tamanho automaticamente.
      </p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem experiências configuradas.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{r.experience_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Reservas máximas por slot
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={r.max_capacity_per_slot}
                  disabled={busyName === r.experience_name}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (n !== r.max_capacity_per_slot) {
                      void handleChange(r.experience_name, n);
                    }
                  }}
                  className="h-10 w-20 rounded-md border border-border bg-card px-3 text-center text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ManagedList({
  title,
  placeholder,
  listFn,
  addFn,
  delFn,
}: {
  title: string;
  placeholder: string;
  listFn: typeof adminListBrands;
  addFn: typeof adminAddBrand;
  delFn: typeof adminDeleteBrand;
}) {
  const list = useServerFn(listFn);
  const add = useServerFn(addFn);
  const del = useServerFn(delFn);
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const r = await list({ data: { token } });
      setRows((r.rows as unknown) as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onAdd = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const token = await getToken();
      await add({ data: { token, name: name.trim() } });
      setName("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const onDel = async (id: string) => {
    try {
      const token = await getToken();
      await del({ data: { token, id } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl italic mb-4">{title}</h2>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
        />
        <button
          onClick={onAdd}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>
      <div className="mt-5">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum item.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs"
              >
                {r.name}
                <button
                  onClick={() => onDel(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remover ${r.name}`}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}