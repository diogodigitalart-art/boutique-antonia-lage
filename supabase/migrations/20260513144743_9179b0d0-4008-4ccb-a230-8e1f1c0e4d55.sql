
-- discount_codes table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'activo',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view discount codes"
  ON public.discount_codes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can insert discount codes"
  ON public.discount_codes FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can update discount codes"
  ON public.discount_codes FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete discount codes"
  ON public.discount_codes FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill existing newsletter subscribers as discount codes
INSERT INTO public.discount_codes (code, discount_percent, email, status, created_at)
SELECT discount_code, 10, email, 'activo', created_at
FROM public.newsletter_subscribers
ON CONFLICT (code) DO NOTHING;

-- Add discount columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;

-- Default whatsapp number setting
INSERT INTO public.settings (key, value)
VALUES ('whatsapp_number', '+351932196049')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
