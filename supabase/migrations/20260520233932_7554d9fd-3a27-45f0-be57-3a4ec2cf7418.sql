ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_returns_archived ON public.returns (archived);