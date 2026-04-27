
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS product_size TEXT;

-- Allow authenticated users to call the stock adjuster (it's still SECURITY DEFINER and atomic).
GRANT EXECUTE ON FUNCTION public.adjust_product_reservation(UUID, TEXT, INT) TO authenticated;
