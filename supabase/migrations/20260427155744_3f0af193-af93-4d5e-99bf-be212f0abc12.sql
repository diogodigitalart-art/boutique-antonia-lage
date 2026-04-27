-- 1. Add new columns to reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS occasion TEXT,
  ADD COLUMN IF NOT EXISTS visit_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ;

-- 2. Trigger to set visit_started_at when status first becomes "Em visita"
CREATE OR REPLACE FUNCTION public.set_visit_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Em visita'
     AND (OLD.status IS DISTINCT FROM 'Em visita')
     AND NEW.visit_started_at IS NULL THEN
    NEW.visit_started_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_visit_started_at ON public.reservations;
CREATE TRIGGER trg_reservations_visit_started_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_visit_started_at();

-- 3. Feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL,
  piece_match TEXT NOT NULL,
  wish_list_text TEXT,
  return_intent TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reservation_id ON public.feedback(reservation_id);

-- Validate values via trigger (CHECK constraints would also work but trigger keeps it consistent with project guidelines)
CREATE OR REPLACE FUNCTION public.validate_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF NEW.piece_match NOT IN ('yes', 'no', 'better') THEN
    RAISE EXCEPTION 'invalid piece_match';
  END IF;
  IF NEW.return_intent NOT IN ('yes', 'maybe', 'no') THEN
    RAISE EXCEPTION 'invalid return_intent';
  END IF;
  IF NEW.wish_list_text IS NOT NULL AND length(NEW.wish_list_text) > 2000 THEN
    RAISE EXCEPTION 'wish_list_text too long';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_validate ON public.feedback;
CREATE TRIGGER trg_feedback_validate
  BEFORE INSERT OR UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_feedback();

DROP TRIGGER IF EXISTS trg_feedback_set_updated_at ON public.feedback;
CREATE TRIGGER trg_feedback_set_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
CREATE POLICY "Users can view their own feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all feedback" ON public.feedback;
CREATE POLICY "Admin can view all feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (
    (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
      = 'diogodigitalart@gmail.com'
  );

DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
CREATE POLICY "Users can insert their own feedback"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own feedback" ON public.feedback;
CREATE POLICY "Users can update their own feedback"
  ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);