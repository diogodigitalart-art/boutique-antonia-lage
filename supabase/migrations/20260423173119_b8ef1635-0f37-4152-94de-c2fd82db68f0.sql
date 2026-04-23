-- Style profile: one row per user with quiz answers as JSON
CREATE TABLE public.style_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own style profile"
  ON public.style_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own style profile"
  ON public.style_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own style profile"
  ON public.style_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own style profile"
  ON public.style_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_style_profiles_updated_at
  BEFORE UPDATE ON public.style_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Wishlist: one row per (user, product)
CREATE TABLE public.wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_wishlist_items_user ON public.wishlist_items(user_id);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist"
  ON public.wishlist_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist items"
  ON public.wishlist_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items"
  ON public.wishlist_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);