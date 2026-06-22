import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  adminUploadProductImage,
} from "@/server-fns/products";
import {
  listExperienceCapacity,
  adminSetExperienceCapacity,
  type ExperienceCapacityRow,
} from "@/server-fns/slots";
import { getSetting, adminSetSetting } from "@/server-fns/newsletter";
import { listPublicProducts } from "@/lib/products.functions";

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
  // Poll briefly: Supabase may emit INITIAL_SESSION before storage hydration
  // completes, so the very first getSession() right after mount can return null.
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return token;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("Sessão expirada");
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
        <HomepageFeaturedBrandsSection />
        <HomepageFeaturedProductsSection />
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

function HomepageFeaturedBrandsSection() {
  const listBrandsFn = useServerFn(adminListBrands);
  const fetchSetting = useServerFn(getSetting);
  const setSetting = useServerFn(adminSetSetting);
  const [brands, setBrands] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const [b, s] = await Promise.all([
          listBrandsFn({ data: { token } }),
          fetchSetting({ data: { key: "homepage_featured_brands" } }),
        ]);
        setBrands(((b.rows ?? []) as Row[]).map((r) => r.name));
        const raw = (s.value ?? "").split(",").map((x) => x.trim()).filter(Boolean);
        setSelected(raw.slice(0, 8));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro a carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [listBrandsFn, fetchSetting]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((b) => b !== name);
      if (prev.length >= 8) {
        toast.error("Máximo 8 marcas");
        return prev;
      }
      return [...prev, name];
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      await setSetting({
        data: { token, key: "homepage_featured_brands", value: selected.join(",") },
      });
      toast.success("Marcas em destaque actualizadas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Homepage</p>
      <h2 className="font-display text-xl italic mb-1">Marcas em destaque</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Selecciona até 8 marcas para mostrar na barra da homepage. Se nenhuma for
        seleccionada, são mostradas automaticamente as 8 marcas com mais produtos
        activos em stock.
      </p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : brands.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem marcas registadas.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {brands.map((b) => {
              const active = selected.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggle(b)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-foreground/40"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {selected.length}/8 seleccionadas
            </span>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Guardar
            </button>
          </div>
        </>
      )}
    </section>
  );
}

type PickerProduct = { uuid: string; name: string; brand: string; image?: string };

function HomepageFeaturedProductsSection() {
  const fetchSetting = useServerFn(getSetting);
  const setSetting = useServerFn(adminSetSetting);
  const listProducts = useServerFn(listPublicProducts);
  const [all, setAll] = useState<PickerProduct[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [selectedByTab, setSelectedByTab] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<string>("__all__");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          listProducts(),
          fetchSetting({ data: { key: "homepage_featured_products" } }),
        ]);
        const rows = (pRes.rows ?? []) as Array<{
          id: string;
          name: string;
          brand: string;
          images?: string[] | null;
          is_active?: boolean;
          sizes?: Array<{ stock?: number; reserved?: number }> | null;
        }>;
        const active = rows.filter((r) => r.is_active !== false);
        setAll(
          active.map((r) => ({
            uuid: r.id,
            name: r.name,
            brand: r.brand,
            image: Array.isArray(r.images) ? r.images[0] : undefined,
          })),
        );
        const sm: Record<string, number> = {};
        for (const r of active) {
          const total = Array.isArray(r.sizes)
            ? r.sizes.reduce(
                (s, x) => s + Math.max(0, Number(x.stock ?? 0) - Number(x.reserved ?? 0)),
                0,
              )
            : 0;
          sm[r.id] = total;
        }
        setStockMap(sm);
        const raw = (sRes.value ?? "").trim();
        let map: Record<string, string[]> = {};
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              for (const [k, v] of Object.entries(parsed)) {
                if (Array.isArray(v)) {
                  map[k] = (v as unknown[])
                    .filter((x): x is string => typeof x === "string")
                    .slice(0, 8);
                }
              }
            } else {
              throw new Error("not-object");
            }
          } catch {
            map = {
              __all__: raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
            };
          }
        }
        setSelectedByTab(map);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro a carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [listProducts, fetchSetting]);

  const byId = new Map(all.map((p) => [p.uuid, p]));

  // Brands that have ≥1 active product with stock > 0, sorted alphabetically.
  const brandTabs = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const p of all) {
      if (p.brand && (stockMap[p.uuid] ?? 0) > 0) set.add(p.brand);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt"));
  }, [all, stockMap]);

  const selected = selectedByTab[activeTab] ?? [];
  const setSelected = (updater: (prev: string[]) => string[]) => {
    setSelectedByTab((prev) => ({ ...prev, [activeTab]: updater(prev[activeTab] ?? []) }));
  };

  // Tab-scoped product pool: "__all__" shows everything, brand tabs only that brand.
  const pool = useMemo<PickerProduct[]>(() => {
    if (activeTab === "__all__") return all;
    return all.filter((p) => p.brand === activeTab);
  }, [all, activeTab]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? pool.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q),
      )
    : pool;

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 8) {
        toast.error("Máximo 8 produtos");
        return prev;
      }
      return [...prev, id];
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      // Prune empty tabs and tabs whose brand no longer has stock
      const validKeys = new Set<string>(["__all__", ...brandTabs]);
      const clean: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(selectedByTab)) {
        if (!validKeys.has(k)) continue;
        const arr = v.slice(0, 8);
        if (arr.length > 0) clean[k] = arr;
      }
      await setSetting({
        data: { token, key: "homepage_featured_products", value: JSON.stringify(clean) },
      });
      toast.success("Destaques actualizados");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Homepage</p>
      <h2 className="font-display text-xl italic mb-1">Destaques</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Selecciona até 8 produtos por separador. &ldquo;Todas&rdquo; é mostrado quando o cliente
        não filtra por marca; cada separador de marca é mostrado quando o cliente clica nessa
        marca. Se um separador não tiver selecção, mostram-se automaticamente os 8 produtos
        activos com stock mais recentes dessa marca.
      </p>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="mb-4 -mx-1 flex gap-1.5 overflow-x-auto pb-1">
            {[{ key: "__all__", label: "Todas" }, ...brandTabs.map((b) => ({ key: b, label: b }))].map(
              (tab) => {
                const active = activeTab === tab.key;
                const count = (selectedByTab[tab.key] ?? []).length;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setQuery("");
                    }}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span
                        className={`ml-1.5 rounded-full px-1.5 text-[10px] ${
                          active ? "bg-primary-foreground/20" : "bg-muted"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>

          {selected.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                Seleccionados ({selected.length}/8)
              </p>
              <ul className="space-y-1.5">
                {selected.map((id, i) => {
                  const p = byId.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5"
                    >
                      <span className="w-5 text-center text-[11px] text-muted-foreground">
                        {i + 1}
                      </span>
                      {p?.image ? (
                        <img
                          src={p.image}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted" />
                      )}
                      <div className="flex-1 truncate text-sm">
                        <span className="font-medium">{p?.brand ?? "—"}</span>{" "}
                        <span className="text-muted-foreground">{p?.name ?? id}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === selected.length - 1}
                        className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Descer"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remover"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome ou marca…"
            className="mb-3 w-full rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <div className="max-h-72 overflow-y-auto rounded-md border border-border">
            {filtered.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Sem resultados.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.slice(0, 100).map((p) => {
                  const active = selected.includes(p.uuid);
                  return (
                    <li key={p.uuid}>
                      <button
                        type="button"
                        onClick={() => toggle(p.uuid)}
                        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition ${
                          active ? "bg-primary-soft" : "hover:bg-muted"
                        }`}
                      >
                        {p.image ? (
                          <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted" />
                        )}
                        <div className="flex-1 truncate">
                          <span className="font-medium">{p.brand}</span>{" "}
                          <span className="text-muted-foreground">{p.name}</span>
                        </div>
                        {active && (
                          <span className="text-[10px] uppercase tracking-wider text-primary">
                            Seleccionado
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Guardar
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function ExperienceCapacitySection() {
  const list = useServerFn(listExperienceCapacity);
  const set = useServerFn(adminSetExperienceCapacity);
  const uploadFn = useServerFn(adminUploadProductImage);
  const [rows, setRows] = useState<ExperienceCapacityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ExperienceCapacityRow>>({});
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(!!data.session?.access_token);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session?.access_token);
      setSessionReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await list();
      setRows(r.rows);
      const d: Record<string, ExperienceCapacityRow> = {};
      r.rows.forEach((row) => { d[row.experience_name] = { ...row }; });
      setDrafts(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateDraft = (name: string, patch: Partial<ExperienceCapacityRow>) => {
    setDrafts((d) => ({ ...d, [name]: { ...d[name], ...patch } }));
  };

  const fileToBase64 = (file: File): Promise<{ base64: string; type: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ base64: result.split(",")[1] || "", type: file.type || "image/jpeg" });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (name: string, file: File | null) => {
    if (!file) return;
    if (!sessionReady || !hasSession) {
      toast.error("Sessão ainda a carregar — tenta novamente em segundos.");
      return;
    }
    setBusyName(name);
    try {
      const token = await getToken();
      const { base64, type } = await fileToBase64(file);
      const res = await uploadFn({
        data: { token, filename: file.name, contentType: type, dataBase64: base64 },
      });
      updateDraft(name, { image_url: (res as { url: string }).url });
      toast.success("Imagem carregada — clica em Guardar para confirmar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a carregar imagem");
    } finally {
      setBusyName(null);
    }
  };

  const handleSave = async (name: string) => {
    const draft = drafts[name];
    if (!draft) return;
    if (!sessionReady || !hasSession) {
      toast.error("Sessão ainda a carregar — tenta novamente em segundos.");
      return;
    }
    setBusyName(name);
    try {
      const token = await getToken();
      await set({
        data: {
          token,
          experienceName: name,
          maxCapacity: draft.max_capacity_per_slot,
          price: draft.price,
          duration: draft.duration,
          description: draft.description,
          imageUrl: draft.image_url,
        },
      });
      toast.success("Experiência actualizada");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusyName(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl italic mb-1">Experiências</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Edita imagem, preço, duração, descrição e capacidade de cada experiência.
        Estes valores aparecem na página pública /experiencias.
      </p>
      {loading || !sessionReady ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem experiências configuradas.</p>
      ) : (
        <div className="space-y-6">
          {rows.map((r) => {
            const d = drafts[r.experience_name] ?? r;
            const busy = busyName === r.experience_name;
            return (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-background p-4 md:p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg italic">{r.experience_name}</h3>
                  {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Imagem de capa
                    </label>
                    <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
                      {d.image_url ? (
                        <img src={d.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-center text-xs hover:bg-accent">
                        Carregar
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={busy}
                          onChange={(e) => void handleImageUpload(r.experience_name, e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {d.image_url && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateDraft(r.experience_name, { image_url: null })}
                          className="rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-destructive/10"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Preço (€)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={d.price}
                          disabled={busy}
                          onChange={(e) => updateDraft(r.experience_name, { price: Number(e.target.value) })}
                          className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Duração</label>
                        <input
                          type="text"
                          value={d.duration}
                          disabled={busy}
                          placeholder="ex: 2 horas"
                          onChange={(e) => updateDraft(r.experience_name, { duration: e.target.value })}
                          className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Cap./slot</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={d.max_capacity_per_slot}
                          disabled={busy}
                          onChange={(e) => updateDraft(r.experience_name, { max_capacity_per_slot: Number(e.target.value) })}
                          className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Descrição</label>
                      <textarea
                        rows={3}
                        value={d.description}
                        disabled={busy}
                        onChange={(e) => updateDraft(r.experience_name, { description: e.target.value })}
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSave(r.experience_name)}
                        className="h-10 rounded-full bg-primary px-5 text-xs uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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