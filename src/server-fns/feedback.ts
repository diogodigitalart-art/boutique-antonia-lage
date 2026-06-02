import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function isStr(v: unknown, max = 4096): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.reservationId)) throw new Error("Missing reservationId");
    if (typeof i.rating !== "number" || i.rating < 1 || i.rating > 5) {
      throw new Error("Invalid rating");
    }
    if (i.pieceMatch !== "yes" && i.pieceMatch !== "no" && i.pieceMatch !== "better") {
      throw new Error("Invalid pieceMatch");
    }
    if (i.returnIntent !== "yes" && i.returnIntent !== "maybe" && i.returnIntent !== "no") {
      throw new Error("Invalid returnIntent");
    }
    if (
      i.wishListText !== undefined &&
      (typeof i.wishListText !== "string" || i.wishListText.length > 2000)
    ) {
      throw new Error("Invalid wishListText");
    }
    return {
      token: i.token,
      reservationId: i.reservationId,
      rating: i.rating,
      pieceMatch: i.pieceMatch as "yes" | "no" | "better",
      returnIntent: i.returnIntent as "yes" | "maybe" | "no",
      wishListText:
        typeof i.wishListText === "string" && i.wishListText.length > 0
          ? i.wishListText
          : undefined,
    };
  })
  .handler(async ({ data }) => {
    // Validate the token
    const { data: auth, error: authErr } = await supabaseAdmin.auth.getUser(data.token);
    if (authErr || !auth?.user) throw new Error("Unauthorized");
    const userId = auth.user.id;

    // Confirm the reservation belongs to this user
    const { data: reservation, error: rErr } = await supabaseAdmin
      .from("reservations")
      .select("id, user_id")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!reservation || reservation.user_id !== userId) {
      throw new Error("Reservation not found");
    }

    const { error } = await supabaseAdmin.from("feedback").upsert(
      {
        user_id: userId,
        reservation_id: data.reservationId,
        rating: data.rating,
        piece_match: data.pieceMatch,
        return_intent: data.returnIntent,
        wish_list_text: data.wishListText ?? null,
      },
      { onConflict: "reservation_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
