
-- Allow "Vendida" status for reservations
DROP TRIGGER IF EXISTS trg_validate_reservation_status ON public.reservations;

CREATE OR REPLACE FUNCTION public.validate_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('Confirmada', 'Em visita', 'Cancelada', 'Vendida') THEN
    RAISE EXCEPTION 'invalid reservation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_reservation_status
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.validate_reservation_status();

-- Decrement actual stock for a size; also clears the reservation that was held.
CREATE OR REPLACE FUNCTION public.decrement_product_stock(_product_id uuid, _size text, _qty integer DEFAULT 1, _from_reserved boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_sizes JSONB;
  updated_sizes JSONB := '[]'::jsonb;
  item JSONB;
  found BOOLEAN := false;
  cur_stock INT;
  cur_reserved INT;
  new_stock INT;
  new_reserved INT;
BEGIN
  IF _qty <= 0 THEN RETURN; END IF;
  SELECT sizes INTO current_sizes FROM public.products WHERE id = _product_id FOR UPDATE;
  IF current_sizes IS NULL THEN RAISE EXCEPTION 'product not found'; END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(current_sizes) LOOP
    IF item->>'size' = _size THEN
      found := true;
      cur_stock := COALESCE((item->>'stock')::int, 0);
      cur_reserved := COALESCE((item->>'reserved')::int, 0);
      IF cur_stock < _qty THEN
        RAISE EXCEPTION 'insufficient stock for size %', _size;
      END IF;
      new_stock := cur_stock - _qty;
      new_reserved := cur_reserved;
      IF _from_reserved THEN
        new_reserved := GREATEST(0, cur_reserved - _qty);
      END IF;
      IF new_reserved > new_stock THEN new_reserved := new_stock; END IF;
      updated_sizes := updated_sizes || jsonb_build_object(
        'size', _size, 'stock', new_stock, 'reserved', new_reserved
      );
    ELSE
      updated_sizes := updated_sizes || item;
    END IF;
  END LOOP;

  IF NOT found THEN RAISE EXCEPTION 'size % not found', _size; END IF;
  UPDATE public.products SET sizes = updated_sizes WHERE id = _product_id;
END;
$$;
