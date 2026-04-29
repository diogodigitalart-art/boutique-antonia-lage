
REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid, text, integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid, text, integer, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid, text, integer, boolean) FROM authenticated;
