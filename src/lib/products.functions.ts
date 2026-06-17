import { createServerFn } from "@tanstack/react-start";

export const listPublicProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, brand, description, price, original_price, category, subcategory, images, reference, legacy_id, sizes, is_active, season, discount_percent, color, composition, care_instructions, external_id, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });
