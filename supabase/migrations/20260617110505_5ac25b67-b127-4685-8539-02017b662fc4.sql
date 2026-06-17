-- 1) Re-apply column-level restriction on products.cost_price and products.barcode
REVOKE SELECT (cost_price, barcode) ON public.products FROM anon, authenticated;

-- 2) Remove customer self-update on reservations (admin-only via server functions)
DROP POLICY IF EXISTS "Users can update their own reservations" ON public.reservations;