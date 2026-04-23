CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT wishlists_user_product_unique UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wishlists' AND policyname = 'Users can view their own wishlists'
  ) THEN
    CREATE POLICY "Users can view their own wishlists"
    ON public.wishlists
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wishlists' AND policyname = 'Users can create their own wishlists'
  ) THEN
    CREATE POLICY "Users can create their own wishlists"
    ON public.wishlists
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wishlists' AND policyname = 'Users can update their own wishlists'
  ) THEN
    CREATE POLICY "Users can update their own wishlists"
    ON public.wishlists
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wishlists' AND policyname = 'Users can delete their own wishlists'
  ) THEN
    CREATE POLICY "Users can delete their own wishlists"
    ON public.wishlists
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile_description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT quiz_results_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quiz_results' AND policyname = 'Users can view their own quiz results'
  ) THEN
    CREATE POLICY "Users can view their own quiz results"
    ON public.quiz_results
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quiz_results' AND policyname = 'Users can create their own quiz results'
  ) THEN
    CREATE POLICY "Users can create their own quiz results"
    ON public.quiz_results
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quiz_results' AND policyname = 'Users can update their own quiz results'
  ) THEN
    CREATE POLICY "Users can update their own quiz results"
    ON public.quiz_results
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quiz_results' AND policyname = 'Users can delete their own quiz results'
  ) THEN
    CREATE POLICY "Users can delete their own quiz results"
    ON public.quiz_results
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END
$$;

INSERT INTO public.wishlists (user_id, product_id, created_at)
SELECT wi.user_id, wi.product_id, wi.created_at
FROM public.wishlist_items wi
JOIN public.profiles p ON p.id = wi.user_id
ON CONFLICT (user_id, product_id) DO NOTHING;

INSERT INTO public.quiz_results (user_id, answers, profile_description, created_at)
SELECT sp.user_id, sp.answers, '', sp.created_at
FROM public.style_profiles sp
JOIN public.profiles p ON p.id = sp.user_id
ON CONFLICT (user_id) DO UPDATE
SET answers = EXCLUDED.answers;