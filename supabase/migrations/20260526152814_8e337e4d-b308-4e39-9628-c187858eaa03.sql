
-- Limit waitlist entries: max 3 per (product_id, email) before notification
CREATE OR REPLACE FUNCTION public.enforce_waitlist_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.waitlist
  WHERE product_id = NEW.product_id
    AND lower(email) = lower(NEW.email)
    AND notified_at IS NULL;
  IF cnt >= 3 THEN
    RAISE EXCEPTION 'waitlist limit reached for this product/email';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS waitlist_limit_trigger ON public.waitlist;
CREATE TRIGGER waitlist_limit_trigger
BEFORE INSERT ON public.waitlist
FOR EACH ROW EXECUTE FUNCTION public.enforce_waitlist_limit();

-- Allow public read of active wishlist_shares (needed for shared link page)
GRANT SELECT ON public.wishlist_shares TO anon;

CREATE POLICY "Anyone can view active shares"
ON public.wishlist_shares
FOR SELECT
TO anon, authenticated
USING (is_active = true);
