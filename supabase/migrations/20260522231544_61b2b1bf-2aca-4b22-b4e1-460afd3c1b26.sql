
-- 1) discount_codes: restrict SELECT to admin only
DROP POLICY IF EXISTS "Anyone can view discount codes" ON public.discount_codes;
CREATE POLICY "Admin can view discount codes"
ON public.discount_codes
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'diogodigitalart@gmail.com');

-- 2) contact_messages: add admin SELECT and DELETE
CREATE POLICY "Admin can view contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete contact messages"
ON public.contact_messages
FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'diogodigitalart@gmail.com');

-- 3) settings: restrict SELECT to admin only (server uses service role)
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
CREATE POLICY "Admin can view settings"
ON public.settings
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'diogodigitalart@gmail.com');

-- 4) products: hide cost_price column from anon/authenticated
REVOKE SELECT (cost_price) ON public.products FROM anon, authenticated;

-- 5) Stock RPCs: server-side only (called via service role)
REVOKE EXECUTE ON FUNCTION public.adjust_product_reservation(uuid, text, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid, text, integer, boolean) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_product_stock(uuid, text, integer) FROM anon, authenticated, PUBLIC;

-- 6) Storage: prevent enumerating product-images bucket via list endpoint
DROP POLICY IF EXISTS "Public can list product-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
