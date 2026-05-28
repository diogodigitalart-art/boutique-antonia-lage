-- Prevent duplicate active waitlist entries per (email, product, size)
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_unique_active_entry
ON public.waitlist (lower(email), product_id, size)
WHERE notified_at IS NULL;