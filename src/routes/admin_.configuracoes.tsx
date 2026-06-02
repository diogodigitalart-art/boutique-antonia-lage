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
} from "@/server-fns/products";
import {
  listExperienceCapacity,
  adminSetExperienceCapacity,
  type ExperienceCapacityRow,
} from "@/server-fns/slots";
import { getSetting, adminSetSetting } from "@/server-fns/newsletter";

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
        <WhatsAppSettingSection />
        <SimpleSettingSection
          settingKey="experience_tailoring_price"
          title="Preço base — Arranjos e Costura"
          description="Preço base (€) para o serviço de arranjos. O valor final é confirmado após avaliação da peça."
          placeholder="15"
        />
        <SimpleSettingSection
          settingKey="google_review_url"
          title="URL para reviews no Google"
          description="Link enviado por email 24h após a entrega de encomendas ou conclusão de experiências."
          placeholder="https://g.page/r/…/review"
        />
        <SizeGuidesSection />
      </div>
    </div>
  );
}

function SimpleSettingSection({
  settingKey,
  title,
  description,
  placeholder,
}: {
  settingKey: string;
  title: string;
  description: string;
  placeholder?: string;
}) {
  const fetchSetting = useServerFn(getSetting);
  const setSetting = useServerFn(adminSetSetting);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSetting({ data: { key: settingKey } })
      .then((r) => setValue(r.value ?? ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchSetting, settingKey]);

  const save = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      await setSetting({ data: { token, key: settingKey, value: value.trim() } });
      toast.success("Actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl italic mb-1">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{description}</p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      )}
    </section>
  );
}

type GuideData = { headers: string[]; rows: string[][] };
type SizeGuideRow = { id: string; brand_name: string; guide_data: GuideData };

function SizeGuidesSection() {
  const [rows, setRows] = useState<SizeGuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SizeGuideRow | null>(null);
  const [draftText, setDraftText] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("size_guides" as never)
      .select("id, brand_name, guide_data")
      .order("brand_name");
    if (error) {
      toast.error(error.message);
    } else {
      setRows((data ?? []) as unknown as SizeGuideRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startEdit = (row: SizeGuideRow) => {
    setEditing(row);
    setDraftText(JSON.stringify(row.guide_data, null, 2));
  };

  const saveEdit = async () => {
    if (!editing) return;
    let parsed: GuideData;
    try {
      parsed = JSON.parse(draftText);
      if (!Array.isArray(parsed.headers) || !Array.isArray(parsed.rows)) {
        throw new Error("Formato inválido");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON inválido");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("size_guides" as never)
      .update({ guide_data: parsed } as never)
      .eq("id", editing.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Guia actualizada");
      setEditing(null);
      await refresh();
    }
  };

  const addBrand = async () => {
    const name = newBrand.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase
      .from("size_guides" as never)
      .insert({
        brand_name: name,
        guide_data: { headers: ["EU"], rows: [["36"], ["38"], ["40"]] },
      } as never);
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      setNewBrand("");
      await refresh();
    }
  };

  const removeBrand = async (id: string) => {
    if (!confirm("Remover esta guia?")) return;
    const { error } = await supabase.from("size_guides" as never).delete().eq("id", id);
    if (error) toast.error(error.message);
    else await refresh();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl italic mb-1">Guias de tamanho</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Tabelas de conversão de tamanhos mostradas no detalhe de cada produto, por marca.
        Editar como JSON: {`{ "headers": ["UK","EU"], "rows": [["6","34"], ...] }`}.
      </p>

      <div className="mb-5 flex gap-2">
        <input
          value={newBrand}
          onChange={(e) => setNewBrand(e.target.value)}
          placeholder="Nova marca…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          onKeyDown={(e) => e.key === "Enter" && addBrand()}
        />
        <button
          onClick={addBrand}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem guias.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{r.brand_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.guide_data.headers?.join(" / ")} · {r.guide_data.rows?.length ?? 0} linhas
                </p>
              </div>
              <button
                onClick={() => startEdit(r)}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
              >
                Editar
              </button>
              <button
                onClick={() => removeBrand(r.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remover"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg italic">{editing.brand_name}</h3>
              <button onClick={() => setEditing(null)} aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={14}
              className="w-full rounded-md border border-border bg-card p-3 font-mono text-xs"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-full border border-border px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={busy}
                className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function WhatsAppSettingSection() {
  const fetchSetting = useServerFn(getSetting);
  const setSetting = useServerFn(adminSetSetting);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSetting({ data: { key: "whatsapp_number" } })
      .then((r) => setValue(r.value ?? ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchSetting]);

  const save = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      await setSetting({ data: { token, key: "whatsapp_number", value: value.trim() } });
      toast.success("Número actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl italic mb-1">WhatsApp Business</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Número usado pelo botão flutuante e pelos pedidos no WhatsApp. Inclui código do país (ex.: +351932196049).
      </p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="+351932196049"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      )}
    </section>
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