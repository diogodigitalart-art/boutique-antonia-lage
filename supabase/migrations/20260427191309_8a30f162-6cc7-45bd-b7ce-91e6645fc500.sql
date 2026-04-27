-- Seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasons"
ON public.seasons FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin can insert seasons"
ON public.seasons FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete seasons"
ON public.seasons FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

-- Seed defaults (idempotent)
INSERT INTO public.seasons (name) VALUES
  ('AW25'), ('SS26'), ('AW26')
ON CONFLICT (name) DO NOTHING;

-- Ensure brands has unique name + seed defaults so they appear in admin settings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_name_unique'
  ) THEN
    ALTER TABLE public.brands ADD CONSTRAINT brands_name_unique UNIQUE (name);
  END IF;
END $$;

INSERT INTO public.brands (name) VALUES
  ('Zadig & Voltaire'),
  ('Self-Portrait'),
  ('BA&SH'),
  ('Alberta Ferretti'),
  ('Anine Bing'),
  ('DVF'),
  ('Rixo'),
  ('SARACO')
ON CONFLICT (name) DO NOTHING;