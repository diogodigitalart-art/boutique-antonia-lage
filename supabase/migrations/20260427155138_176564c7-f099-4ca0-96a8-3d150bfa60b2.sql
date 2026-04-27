ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS experience_details JSONB NOT NULL DEFAULT '{}'::jsonb;