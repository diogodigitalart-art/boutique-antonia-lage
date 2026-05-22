-- Remove broad public SELECT policy on storage.objects (prevents listing)
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product-images" ON storage.objects;

-- Revoke anon EXECUTE on stock/reservation helper SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.adjust_product_reservation(uuid, text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_product_stock(uuid, text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid, text, integer, boolean) FROM anon, public;

-- Keep authenticated grants (needed for cart/checkout flows)
GRANT EXECUTE ON FUNCTION public.adjust_product_reservation(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, text, integer, boolean) TO authenticated;