import { createServerFn } from "@tanstack/react-start";

export const listPublicProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, brand, description, price, original_price, category, subcategory, images, reference, legacy_id, sizes, is_active, is_manually_reserved, season, discount_percent, color, composition, care_instructions, external_id, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const getPublicProductById = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    const id = typeof i.id === "string" ? i.id : "";
    if (!id) throw new Error("Missing id");
    return { id };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, brand, description, price, original_price, images, legacy_id, sizes, is_active, is_manually_reserved, season, discount_percent",
      )
      .or(`legacy_id.eq.${data.id},id.eq.${data.id}`)
      .maybeSingle();
    return { row: row ?? null };
  });
