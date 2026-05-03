ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS composition text,
ADD COLUMN IF NOT EXISTS care_instructions text;