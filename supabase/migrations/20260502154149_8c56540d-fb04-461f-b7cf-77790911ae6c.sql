
-- 1. Add per-experience capacity (experiences are stored statically in code, so we use a name-keyed table)
CREATE TABLE IF NOT EXISTS public.experience_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_name TEXT NOT NULL UNIQUE,
  max_capacity_per_slot INTEGER NOT NULL DEFAULT 1 CHECK (max_capacity_per_slot >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.experience_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view experience capacity"
  ON public.experience_capacity FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin can insert experience capacity"
  ON public.experience_capacity FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can update experience capacity"
  ON public.experience_capacity FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete experience capacity"
  ON public.experience_capacity FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE TRIGGER trg_experience_capacity_updated_at
  BEFORE UPDATE ON public.experience_capacity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed defaults for known experiences
INSERT INTO public.experience_capacity (experience_name, max_capacity_per_slot) VALUES
  ('Boutique Privada', 1),
  ('Personal Styling', 1)
ON CONFLICT (experience_name) DO NOTHING;

-- 2. Helper function: count active reservations for an experience+date+time
CREATE OR REPLACE FUNCTION public.count_experience_bookings(_experience_name TEXT, _date TEXT, _time TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.reservations
  WHERE item_type = 'experiencia'
    AND item_name = _experience_name
    AND preferred_date = _date
    AND reservation_date = (_date || ' ' || _time)
    AND status <> 'Cancelada';
$$;

-- 3. Helper function: check if a product+size+date+time slot is taken
CREATE OR REPLACE FUNCTION public.is_product_slot_taken(_product_id UUID, _size TEXT, _date TEXT, _time TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reservations
    WHERE item_type = 'produto'
      AND product_id = _product_id
      AND product_size = _size
      AND preferred_date = _date
      AND reservation_date = (_date || ' ' || _time)
      AND status <> 'Cancelada'
  );
$$;

-- 4. Public RPC: get all booked slots for a date range (used by reservation form)
CREATE OR REPLACE FUNCTION public.get_booked_slots(_from_date TEXT, _to_date TEXT)
RETURNS TABLE (
  preferred_date TEXT,
  reservation_time TEXT,
  item_type TEXT,
  item_name TEXT,
  product_id UUID,
  product_size TEXT,
  booking_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.preferred_date,
    -- Extract time portion from reservation_date "YYYY-MM-DD HH:MM"
    CASE WHEN r.reservation_date LIKE (r.preferred_date || ' %')
      THEN substring(r.reservation_date FROM length(r.preferred_date) + 2)
      ELSE r.reservation_date
    END AS reservation_time,
    r.item_type,
    r.item_name,
    r.product_id,
    r.product_size,
    COUNT(*) AS booking_count
  FROM public.reservations r
  WHERE r.preferred_date >= _from_date
    AND r.preferred_date <= _to_date
    AND r.status <> 'Cancelada'
  GROUP BY r.preferred_date, r.item_type, r.item_name, r.product_id, r.product_size,
    CASE WHEN r.reservation_date LIKE (r.preferred_date || ' %')
      THEN substring(r.reservation_date FROM length(r.preferred_date) + 2)
      ELSE r.reservation_date
    END;
$$;

GRANT EXECUTE ON FUNCTION public.count_experience_bookings(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_product_slot_taken(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(TEXT, TEXT) TO anon, authenticated;
