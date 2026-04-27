
-- Add season column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS season text;

-- Brands table for custom brand entries
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brands"
  ON public.brands FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can insert brands"
  ON public.brands FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT email FROM auth.users WHERE id = auth.uid()))::text = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete brands"
  ON public.brands FOR DELETE
  TO authenticated
  USING (((SELECT email FROM auth.users WHERE id = auth.uid()))::text = 'diogodigitalart@gmail.com');
