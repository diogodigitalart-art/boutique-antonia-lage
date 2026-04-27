
-- =========================================================
-- Products table
-- =========================================================
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(10,2),
  category TEXT NOT NULL DEFAULT 'colecção',
  images TEXT[] NOT NULL DEFAULT '{}'::text[],
  reference TEXT NOT NULL UNIQUE,
  legacy_id TEXT UNIQUE,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category_active ON public.products (category, is_active);
CREATE INDEX idx_products_legacy_id ON public.products (legacy_id);

-- Validate category via trigger (avoids immutability issues)
CREATE OR REPLACE FUNCTION public.validate_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category NOT IN ('colecção', 'arquivo') THEN
    RAISE EXCEPTION 'invalid category: %', NEW.category;
  END IF;
  IF NEW.price < 0 THEN
    RAISE EXCEPTION 'price must be >= 0';
  END IF;
  IF NEW.original_price IS NOT NULL AND NEW.original_price < 0 THEN
    RAISE EXCEPTION 'original_price must be >= 0';
  END IF;
  IF jsonb_typeof(NEW.sizes) <> 'array' THEN
    RAISE EXCEPTION 'sizes must be a JSON array';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_product
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product();

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products; admin sees all
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  OR (
    (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
      = 'diogodigitalart@gmail.com'
  )
);

CREATE POLICY "Admin can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    = 'diogodigitalart@gmail.com'
);

CREATE POLICY "Admin can update products"
ON public.products FOR UPDATE
TO authenticated
USING (
  (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    = 'diogodigitalart@gmail.com'
)
WITH CHECK (
  (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    = 'diogodigitalart@gmail.com'
);

CREATE POLICY "Admin can delete products"
ON public.products FOR DELETE
TO authenticated
USING (
  (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    = 'diogodigitalart@gmail.com'
);

-- =========================================================
-- Atomic stock adjuster (called by server functions)
-- =========================================================
CREATE OR REPLACE FUNCTION public.adjust_product_reservation(
  _product_id UUID,
  _size TEXT,
  _delta INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_sizes JSONB;
  updated_sizes JSONB := '[]'::jsonb;
  item JSONB;
  found BOOLEAN := false;
  new_reserved INT;
  new_stock INT;
BEGIN
  SELECT sizes INTO current_sizes FROM public.products WHERE id = _product_id FOR UPDATE;
  IF current_sizes IS NULL THEN
    RAISE EXCEPTION 'product not found';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(current_sizes) LOOP
    IF item->>'size' = _size THEN
      found := true;
      new_stock := COALESCE((item->>'stock')::int, 0);
      new_reserved := COALESCE((item->>'reserved')::int, 0) + _delta;
      IF new_reserved < 0 THEN new_reserved := 0; END IF;
      IF new_reserved > new_stock THEN
        RAISE EXCEPTION 'no stock available for size %', _size;
      END IF;
      updated_sizes := updated_sizes || jsonb_build_object(
        'size', _size,
        'stock', new_stock,
        'reserved', new_reserved
      );
    ELSE
      updated_sizes := updated_sizes || item;
    END IF;
  END LOOP;

  IF NOT found THEN
    RAISE EXCEPTION 'size % not available', _size;
  END IF;

  UPDATE public.products SET sizes = updated_sizes WHERE id = _product_id;
END;
$$;

-- =========================================================
-- Storage bucket for product images
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Admin can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    = 'diogodigitalart@gmail.com'
);

CREATE POLICY "Admin can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    = 'diogodigitalart@gmail.com'
);

CREATE POLICY "Admin can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    = 'diogodigitalart@gmail.com'
);

-- =========================================================
-- Seed existing hardcoded products (preserve legacy_id mapping)
-- =========================================================
INSERT INTO public.products (name, brand, description, price, original_price, category, images, reference, legacy_id, sizes, is_active)
VALUES
  ('Vestido seda bordado', 'Zadig & Voltaire',
   'Vestido em seda natural com bordado artesanal nas mangas. Caimento fluido, ideal para ocasiões especiais.',
   480, NULL, 'colecção',
   ARRAY['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-P1', 'p1',
   '[{"size":"XS","stock":1,"reserved":0},{"size":"S","stock":2,"reserved":0},{"size":"M","stock":2,"reserved":0},{"size":"L","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Blusa renda marfim', 'Self-Portrait',
   'Blusa em renda francesa cor marfim, com detalhes em guipura. Peça intemporal para o guarda-roupa.',
   320, NULL, 'colecção',
   ARRAY['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-P2', 'p2',
   '[{"size":"XS","stock":1,"reserved":0},{"size":"S","stock":2,"reserved":0},{"size":"M","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Casaco lã camel', 'BA&SH',
   'Casaco oversize em lã virgem, tom camel quente. Forro em cetim.',
   540, NULL, 'colecção',
   ARRAY['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-P3', 'p3',
   '[{"size":"S","stock":1,"reserved":0},{"size":"M","stock":2,"reserved":0},{"size":"L","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Saia plissada midi', 'Alberta Ferretti',
   'Saia plissada em chiffon italiano. Cintura subida, comprimento midi.',
   690, NULL, 'colecção',
   ARRAY['https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-P4', 'p4',
   '[{"size":"XS","stock":1,"reserved":0},{"size":"S","stock":1,"reserved":0},{"size":"M","stock":1,"reserved":0},{"size":"L","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Blazer alfaiataria', 'Anine Bing',
   'Blazer de inspiração masculina em lã fria, corte estruturado.',
   420, NULL, 'colecção',
   ARRAY['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-P5', 'p5',
   '[{"size":"S","stock":2,"reserved":0},{"size":"M","stock":2,"reserved":0},{"size":"L","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Vestido floral midi', 'Rixo',
   'Vestido em viscose com estampado floral exclusivo, mangas tufadas.',
   380, NULL, 'colecção',
   ARRAY['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-P6', 'p6',
   '[{"size":"XS","stock":1,"reserved":0},{"size":"S","stock":1,"reserved":0},{"size":"M","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Vestido envelope vintage', 'DVF',
   'Edição arquivo. Vestido envelope clássico em jersey de seda.',
   220, 590, 'arquivo',
   ARRAY['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-A1', 'a1',
   '[{"size":"S","stock":1,"reserved":0},{"size":"M","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Top renda preto', 'Alberta Ferretti',
   'Top em renda chantilly preta. Coleção FW18.',
   180, 480, 'arquivo',
   ARRAY['https://images.unsplash.com/photo-1485518882345-15568b007407?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-A2', 'a2',
   '[{"size":"XS","stock":1,"reserved":0},{"size":"S","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Vestido azul cobalto', 'Self-Portrait',
   'Vestido em crepe cobalto com detalhes em renda. Coleção SS19.',
   290, 650, 'arquivo',
   ARRAY['https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-A3', 'a3',
   '[{"size":"XS","stock":1,"reserved":0},{"size":"S","stock":1,"reserved":0},{"size":"M","stock":1,"reserved":0}]'::jsonb,
   true),
  ('Trench coat bege', 'BA&SH',
   'Trench coat clássico em algodão impermeabilizado.',
   240, 520, 'arquivo',
   ARRAY['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&h=1000&q=80'],
   'AL-A4', 'a4',
   '[{"size":"S","stock":1,"reserved":0},{"size":"M","stock":1,"reserved":0},{"size":"L","stock":1,"reserved":0}]'::jsonb,
   true);
