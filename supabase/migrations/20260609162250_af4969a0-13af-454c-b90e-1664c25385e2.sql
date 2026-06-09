REVOKE SELECT (cost_price, barcode) ON public.products FROM anon;
REVOKE SELECT (cost_price, barcode) ON public.products FROM authenticated;
REVOKE INSERT (cost_price, barcode), UPDATE (cost_price, barcode) ON public.products FROM anon;
REVOKE INSERT (cost_price, barcode), UPDATE (cost_price, barcode) ON public.products FROM authenticated;
GRANT ALL ON public.products TO service_role;