
-- Lock down products table: only service role (admin server code) can read.
-- All product queries in this app go through server functions using supabaseAdmin,
-- so revoking SELECT from anon/authenticated does not break the app and fully
-- protects cost_price, barcode column, and per-size barcodes nested in sizes JSONB.
REVOKE SELECT ON public.products FROM anon, authenticated;
REVOKE SELECT (cost_price, barcode) ON public.products FROM anon, authenticated;
GRANT SELECT ON public.products TO service_role;
