CREATE TABLE public.wishlist_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wishlist_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own share" ON public.wishlist_shares
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own share" ON public.wishlist_shares
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own share" ON public.wishlist_shares
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_wishlist_shares_updated_at
BEFORE UPDATE ON public.wishlist_shares
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_wishlist_shares_token ON public.wishlist_shares(token);