ALTER TABLE public.products ADD COLUMN IF NOT EXISTS external_id text;
CREATE INDEX IF NOT EXISTS idx_products_external_id ON public.products(external_id) WHERE external_id IS NOT NULL;