import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length < 200;
}

async function assertAdmin(token: string): Promise<string> {
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized");
  if ((data.user.email || "").toLowerCase() !== ADMIN_EMAIL) throw new Error("Forbidden");
  return data.user.id;
}

export type BookedSlot = {
  preferred_date: string;
  reservation_time: string;
  item_type: string;
  item_name: string;
  product_id: string | null;
  product_size: string | null;
  booking_count: number;
};

export type ExperienceCapacityRow = {
  id: string;
  experience_name: string;
  max_capacity_per_slot: number;
};

/**
 * Public: get all booked slots in a date range. Returns only aggregate counts,
 * never customer PII. Used by the booking form to grey out unavailable slots.
 */
export const getBookedSlots = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.fromDate) || !isStr(i.toDate)) throw new Error("Missing dates");
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(i.fromDate as string) || !re.test(i.toDate as string)) {
      throw new Error("Invalid date format");
    }
    return { fromDate: i.fromDate as string, toDate: i.toDate as string };
  })
  .handler(async ({ data }): Promise<{ slots: BookedSlot[] }> => {
    const { data: rows, error } = await supabaseAdmin.rpc("get_booked_slots", {
      _from_date: data.fromDate,
      _to_date: data.toDate,
    });
    if (error) throw new Error(error.message);
    const slots: BookedSlot[] = ((rows as unknown[]) ?? []).map((r) => {
      const o = r as Record<string, unknown>;
      return {
        preferred_date: String(o.preferred_date ?? ""),
        reservation_time: String(o.reservation_time ?? ""),
        item_type: String(o.item_type ?? ""),
        item_name: String(o.item_name ?? ""),
        product_id: (o.product_id as string | null) ?? null,
        product_size: (o.product_size as string | null) ?? null,
        booking_count: Number(o.booking_count ?? 0),
      };
    });
    return { slots };
  });

/** Public: list experience capacity (so the form knows max per slot). */
export const listExperienceCapacity = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ rows: ExperienceCapacityRow[] }> => {
    const { data, error } = await supabaseAdmin
      .from("experience_capacity")
      .select("id, experience_name, max_capacity_per_slot")
      .order("experience_name", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as ExperienceCapacityRow[] };
  },
);

/** Admin: upsert experience capacity. */
export const adminSetExperienceCapacity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.experienceName)) throw new Error("Missing experienceName");
    const cap = Number(i.maxCapacity);
    if (!Number.isFinite(cap) || cap < 1 || cap > 50) throw new Error("Invalid capacity");
    return {
      token: i.token as string,
      experienceName: (i.experienceName as string).slice(0, 200),
      maxCapacity: Math.round(cap),
    };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("experience_capacity")
      .upsert(
        {
          experience_name: data.experienceName,
          max_capacity_per_slot: data.maxCapacity,
        },
        { onConflict: "experience_name" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
