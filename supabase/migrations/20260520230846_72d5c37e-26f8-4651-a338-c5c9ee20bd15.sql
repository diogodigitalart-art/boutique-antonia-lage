
-- 1. Add stock_restored flag to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_restored boolean NOT NULL DEFAULT false;

-- 2. Helper RPC: increment_product_stock (adds to stock count for given size)
CREATE OR REPLACE FUNCTION public.increment_product_stock(_product_id uuid, _size text, _qty integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_sizes JSONB;
  updated_sizes JSONB := '[]'::jsonb;
  item JSONB;
  found BOOLEAN := false;
  cur_stock INT;
  cur_reserved INT;
BEGIN
  IF _qty <= 0 THEN RETURN; END IF;
  SELECT sizes INTO current_sizes FROM public.products WHERE id = _product_id FOR UPDATE;
  IF current_sizes IS NULL THEN RAISE EXCEPTION 'product not found'; END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(current_sizes) LOOP
    IF item->>'size' = _size THEN
      found := true;
      cur_stock := COALESCE((item->>'stock')::int, 0);
      cur_reserved := COALESCE((item->>'reserved')::int, 0);
      updated_sizes := updated_sizes || jsonb_build_object(
        'size', _size,
        'stock', cur_stock + _qty,
        'reserved', cur_reserved
      );
    ELSE
      updated_sizes := updated_sizes || item;
    END IF;
  END LOOP;

  IF NOT found THEN
    updated_sizes := updated_sizes || jsonb_build_object(
      'size', _size, 'stock', _qty, 'reserved', 0
    );
  END IF;

  UPDATE public.products SET sizes = updated_sizes, is_active = true WHERE id = _product_id;
END;
$$;

-- 3. Returns table
CREATE TABLE IF NOT EXISTS public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  customer_name text,
  customer_email text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text NOT NULL,
  method text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Aguarda recepção',
  stock_restored boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own returns"
  ON public.returns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own returns"
  ON public.returns FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all returns"
  ON public.returns FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can update returns"
  ON public.returns FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete returns"
  ON public.returns FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE TRIGGER returns_set_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS returns_user_id_idx ON public.returns(user_id);
CREATE INDEX IF NOT EXISTS returns_order_id_idx ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS returns_status_idx ON public.returns(status);
