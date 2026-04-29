import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

async function assertAdmin(token: string): Promise<string> {
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized");
  if ((data.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Forbidden");
  }
  return data.user.id;
}

function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length < 4096;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  phone: string | null;
  profile_details: JsonValue;
  reservations: Array<{
    id: string;
    item_name: string;
    item_type: string;
    product_name: string;
    product_id: string | null;
    product_size: string | null;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    preferred_date: string;
    reservation_date: string;
    message: string | null;
    status: string;
    created_at: string;
  }>;
  wishlist: Array<{
    id: string;
    product_id: string;
    product_label: string;
    product_image: string | null;
    created_at: string;
  }>;
  quiz: { answers: JsonValue; profile_description: string; created_at: string } | null;
  feedback: Array<{
    id: string;
    reservation_id: string;
    rating: number;
    piece_match: string;
    return_intent: string;
    wish_list_text: string | null;
    created_at: string;
  }>;
  contactMessages: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
  }>;
  cart: Array<{
    id: string;
    product_id: string;
    product_uuid: string | null;
    product_label: string;
    product_image: string | null;
    product_price: number;
    size: string;
    quantity: number;
    line_total: number;
    added_at: string;
  }>;
};

export type AdminPayload = {
  users: AdminUser[];
  blockedSlots: Array<{
    id: string;
    blocked_date: string;
    blocked_time: string | null;
    reason: string | null;
    created_at: string;
  }>;
  stats: {
    totalUsers: number;
    totalReservations: number;
    totalContactMessages: number;
    totalOrders: number;
    revenueMonth: number;
  };
};

export const getAdminData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    return { token: i.token };
  })
  .handler(async ({ data }): Promise<AdminPayload> => {
    await assertAdmin(data.token);

    const [profilesRes, reservationsRes, wishlistRes, quizRes, contactsRes, blockedRes, feedbackRes, ordersRes, cartRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone, profile_details, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("reservations").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("wishlists").select("id, user_id, product_id, created_at"),
      supabaseAdmin.from("quiz_results").select("user_id, answers, profile_description, created_at"),
      supabaseAdmin.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabaseAdmin
        .from("blocked_slots")
        .select("id, blocked_date, blocked_time, reason, created_at")
        .order("blocked_date", { ascending: true }),
      supabaseAdmin
        .from("feedback")
        .select("id, user_id, reservation_id, rating, piece_match, return_intent, wish_list_text, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("orders")
        .select("id, total, created_at, status"),
      supabaseAdmin
        .from("cart_items")
        .select("id, user_id, product_id, product_uuid, size, quantity, added_at")
        .order("added_at", { ascending: false }),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (reservationsRes.error) throw new Error(reservationsRes.error.message);
    if (wishlistRes.error) throw new Error(wishlistRes.error.message);
    if (quizRes.error) throw new Error(quizRes.error.message);
    if (contactsRes.error) throw new Error(contactsRes.error.message);
    if (blockedRes.error) throw new Error(blockedRes.error.message);
    if (feedbackRes.error) throw new Error(feedbackRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);
    if (cartRes.error) throw new Error(cartRes.error.message);

    const profiles = profilesRes.data ?? [];
    const reservations = reservationsRes.data ?? [];
    const wishlist = wishlistRes.data ?? [];
    const quiz = quizRes.data ?? [];
    const contacts = contactsRes.data ?? [];
    const blockedSlots = blockedRes.data ?? [];
    const feedback = feedbackRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const cartItems = cartRes.data ?? [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueMonth = orders
      .filter((o) => {
        if (o.status === "Cancelada") return false;
        const d = new Date(o.created_at);
        return d >= monthStart;
      })
      .reduce((s, o) => s + Number(o.total ?? 0), 0);

    // Build a product lookup so wishlist UUIDs / legacy IDs resolve to labels.
    const { data: productsData } = await supabaseAdmin
      .from("products")
      .select("id, legacy_id, brand, name, price, images");
    const productMap = new Map<string, string>();
    type ProductMeta = { label: string; image: string | null; price: number };
    const productMeta = new Map<string, ProductMeta>();
    (productsData ?? []).forEach((p) => {
      const label = `${p.brand} — ${p.name}`;
      const meta: ProductMeta = {
        label,
        image: Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : null,
        price: Number(p.price ?? 0),
      };
      if (p.id) {
        productMap.set(p.id, label);
        productMeta.set(p.id, meta);
      }
      if (p.legacy_id) {
        productMap.set(p.legacy_id, label);
        productMeta.set(p.legacy_id, meta);
      }
    });

    const users: AdminUser[] = profiles.map((p) => {
      const userReservations = reservations
        .filter((r) => r.user_id === p.id)
        .map((r) => ({
          id: r.id,
          item_name: r.item_name,
          item_type: r.item_type,
          product_name: r.product_name,
          product_id: (r as { product_id?: string | null }).product_id ?? null,
          product_size: (r as { product_size?: string | null }).product_size ?? null,
          customer_name: r.customer_name,
          customer_email: r.customer_email,
          customer_phone: r.customer_phone,
          preferred_date: r.preferred_date,
          reservation_date: r.reservation_date,
          message: r.message,
          status: r.status,
          created_at: r.created_at,
        }));
      const userWishlist = wishlist
        .filter((w) => w.user_id === p.id)
        .map((w) => {
          const meta = productMeta.get(w.product_id) || null;
          return {
            id: w.id,
            product_id: w.product_id,
            product_label: meta?.label || productMap.get(w.product_id) || w.product_id,
            product_image: meta?.image || null,
            created_at: w.created_at,
          };
        });
      const userQuiz = quiz.find((q) => q.user_id === p.id);
      const userContacts = contacts
        .filter((c) => p.email && c.email.toLowerCase() === (p.email || "").toLowerCase())
        .map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          subject: c.subject,
          message: c.message,
          created_at: c.created_at,
        }));
      const userFeedback = feedback
        .filter((f) => f.user_id === p.id)
        .map((f) => ({
          id: f.id,
          reservation_id: f.reservation_id,
          rating: f.rating as number,
          piece_match: f.piece_match as string,
          return_intent: f.return_intent as string,
          wish_list_text: f.wish_list_text as string | null,
          created_at: f.created_at,
        }));
      const userCart = cartItems
        .filter((c) => c.user_id === p.id)
        .map((c) => {
          const meta =
            (c.product_uuid ? productMeta.get(c.product_uuid) : null) ||
            productMeta.get(c.product_id) ||
            null;
          const qty = Number(c.quantity ?? 1);
          const price = meta?.price ?? 0;
          return {
            id: c.id,
            product_id: c.product_id,
            product_uuid: c.product_uuid,
            product_label: meta?.label || c.product_id,
            product_image: meta?.image || null,
            product_price: price,
            size: c.size,
            quantity: qty,
            line_total: price * qty,
            added_at: c.added_at,
          };
        });
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        created_at: p.created_at,
        phone: (p as { phone?: string | null }).phone ?? null,
        profile_details: ((p as { profile_details?: JsonValue }).profile_details as JsonValue) ?? null,
        reservations: userReservations,
        wishlist: userWishlist,
        quiz: userQuiz
          ? {
              answers: (userQuiz.answers as JsonValue) ?? {},
              profile_description: userQuiz.profile_description || "",
              created_at: userQuiz.created_at,
            }
          : null,
        feedback: userFeedback,
        contactMessages: userContacts,
        cart: userCart,
      };
    });

    return {
      users,
      blockedSlots,
      stats: {
        totalUsers: profiles.length,
        totalReservations: reservations.length,
        totalContactMessages: contacts.length,
        totalOrders: orders.length,
        revenueMonth,
      },
    };
  });

export const updateReservationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.reservationId)) throw new Error("Missing reservationId");
    if (!isStr(i.status)) throw new Error("Missing status");
    const allowed = ["Confirmada", "Em visita", "Cancelada", "Vendida"];
    if (!allowed.includes(i.status as string)) throw new Error("Invalid status");
    return {
      token: i.token,
      reservationId: i.reservationId,
      status: i.status as "Confirmada" | "Em visita" | "Cancelada" | "Vendida",
    };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);

    // Fetch current reservation to detect status transition and capture product info
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("reservations")
      .select("status, product_id, product_size")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw new Error("Reservation not found");

    // "Vendida": permanently remove inventory (consumes one reserved unit + decrements stock)
    if (
      data.status === "Vendida" &&
      existing.status !== "Vendida" &&
      existing.product_id &&
      existing.product_size
    ) {
      const { error: sellErr } = await supabaseAdmin.rpc("decrement_product_stock", {
        _product_id: existing.product_id,
        _size: existing.product_size,
        _qty: 1,
        _from_reserved: true,
      });
      if (sellErr) throw new Error(sellErr.message);
    }

    const { error } = await supabaseAdmin
      .from("reservations")
      .update({ status: data.status })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);

    // Auto-release reserved stock when transitioning into "Cancelada"
    if (
      data.status === "Cancelada" &&
      existing.status !== "Cancelada" &&
      existing.status !== "Vendida" &&
      existing.product_id &&
      existing.product_size
    ) {
      const { error: rpcErr } = await supabaseAdmin.rpc("adjust_product_reservation", {
        _product_id: existing.product_id,
        _size: existing.product_size,
        _delta: -1,
      });
      if (rpcErr) {
        // Log but don't fail status update — stock can be adjusted manually
        console.error("Failed to release product reservation:", rpcErr.message);
      }
    }

    return { ok: true };
  });

export const addBlockedSlot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.date)) throw new Error("Missing date");
    const date = i.date as string;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
    const time =
      typeof i.time === "string" && i.time.length > 0 && i.time.length <= 10
        ? (i.time as string)
        : null;
    const reason =
      typeof i.reason === "string" && i.reason.length <= 500
        ? (i.reason as string)
        : null;
    return { token: i.token, date, time, reason };
  })
  .handler(async ({ data }) => {
    const userId = await assertAdmin(data.token);
    const { error } = await supabaseAdmin.from("blocked_slots").insert({
      blocked_date: data.date,
      blocked_time: data.time,
      reason: data.reason,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBlockedSlot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.id)) throw new Error("Missing id");
    return { token: i.token, id: i.id };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("blocked_slots")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });