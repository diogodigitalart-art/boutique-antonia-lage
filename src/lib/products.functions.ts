import { createServerFn } from "@tanstack/react-start";

export const listPublicProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, brand, description, price, original_price, category, subcategory, images, reference, legacy_id, sizes, is_active, is_manually_reserved, season, discount_percent, color, composition, care_instructions, external_id, created_at, updated_at, complete_the_look_ids",
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
    const cols =
      "id, name, brand, description, price, original_price, images, legacy_id, sizes, is_active, is_manually_reserved, season, discount_percent, complete_the_look_ids";
    let { data: row } = await supabaseAdmin
      .from("products")
      .select(cols)
      .eq("legacy_id", data.id)
      .maybeSingle();
    if (!row && /^[0-9a-f-]{36}$/i.test(data.id)) {
      const res = await supabaseAdmin
        .from("products")
        .select(cols)
        .eq("id", data.id)
        .maybeSingle();
      row = res.data ?? null;
    }
    return { row: row ?? null };
  });

export const getEditorialByProductUuid = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    const uuid = typeof i.uuid === "string" ? i.uuid : "";
    if (!uuid) throw new Error("Missing uuid");
    return { uuid };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: post } = await supabaseAdmin
      .from("editorial_posts")
      .select("id, title, cover_image, video_url, teaser_text, publish_date")
      .eq("is_published", true)
      .contains("featured_product_ids", [data.uuid])
      .order("publish_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { post: post ?? null };
  });
