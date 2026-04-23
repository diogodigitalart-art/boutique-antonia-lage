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
  reservations: Array<{
    id: string;
    item_name: string;
    item_type: string;
    product_name: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    preferred_date: string;
    reservation_date: string;
    message: string | null;
    status: string;
    created_at: string;
  }>;
  wishlist: Array<{ id: string; product_id: string; created_at: string }>;
  quiz: { answers: JsonValue; profile_description: string; created_at: string } | null;
  contactMessages: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
  }>;
};

export type AdminPayload = {
  users: AdminUser[];
  stats: {
    totalUsers: number;
    totalReservations: number;
    totalContactMessages: number;
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

    const [profilesRes, reservationsRes, wishlistRes, quizRes, contactsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("reservations").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("wishlists").select("id, user_id, product_id, created_at"),
      supabaseAdmin.from("quiz_results").select("user_id, answers, profile_description, created_at"),
      supabaseAdmin.from("contact_messages").select("*").order("created_at", { ascending: false }),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (reservationsRes.error) throw new Error(reservationsRes.error.message);
    if (wishlistRes.error) throw new Error(wishlistRes.error.message);
    if (quizRes.error) throw new Error(quizRes.error.message);
    if (contactsRes.error) throw new Error(contactsRes.error.message);

    const profiles = profilesRes.data ?? [];
    const reservations = reservationsRes.data ?? [];
    const wishlist = wishlistRes.data ?? [];
    const quiz = quizRes.data ?? [];
    const contacts = contactsRes.data ?? [];

    const users: AdminUser[] = profiles.map((p) => {
      const userReservations = reservations
        .filter((r) => r.user_id === p.id)
        .map((r) => ({
          id: r.id,
          item_name: r.item_name,
          item_type: r.item_type,
          product_name: r.product_name,
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
        .map((w) => ({ id: w.id, product_id: w.product_id, created_at: w.created_at }));
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
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        created_at: p.created_at,
        reservations: userReservations,
        wishlist: userWishlist,
        quiz: userQuiz
          ? {
              answers: (userQuiz.answers as JsonValue) ?? {},
              profile_description: userQuiz.profile_description || "",
              created_at: userQuiz.created_at,
            }
          : null,
        contactMessages: userContacts,
      };
    });

    return {
      users,
      stats: {
        totalUsers: profiles.length,
        totalReservations: reservations.length,
        totalContactMessages: contacts.length,
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
    const allowed = ["Confirmada", "Em visita", "Cancelada"];
    if (!allowed.includes(i.status as string)) throw new Error("Invalid status");
    return {
      token: i.token,
      reservationId: i.reservationId,
      status: i.status as "Confirmada" | "Em visita" | "Cancelada",
    };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("reservations")
      .update({ status: data.status })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });