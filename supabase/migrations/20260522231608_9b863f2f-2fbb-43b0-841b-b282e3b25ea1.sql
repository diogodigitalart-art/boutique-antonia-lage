
-- Authenticated users need these RPCs (called from the reservation modal & admin UI)
GRANT EXECUTE ON FUNCTION public.adjust_product_reservation(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, text, integer, boolean) TO authenticated;
