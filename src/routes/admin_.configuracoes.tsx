import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminListBrands,
  adminAddBrand,
  adminDeleteBrand,
  adminListSeasons,
  adminAddSeason,
  adminDeleteSeason,
} from "@/server/products";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

export const Route = createFileRoute("/admin_/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações | Admin" }] }),
  component: AdminSettingsPage,
});

type Row = { id: string; name: string };

function AdminSettingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, navigate]);
  if (loading || !user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <Layout>
      <Content />
    </Layout>
  );
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada");
  return token;
}

function Content() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
      <div className="mb-8">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Admin
        </Link>
        <h1 className="mt-2 font-display text-3xl italic md:text-4xl">Configurações</h1>
      </div>

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
      </div>
    </div>
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