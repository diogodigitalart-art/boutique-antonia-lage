-- 1. Add profile_details JSONB column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_details JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Create blocked_slots table
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  blocked_time TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON public.blocked_slots(blocked_date);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can view blocked slots (needed by reservation form)
CREATE POLICY "Anyone can view blocked slots"
ON public.blocked_slots
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admin can insert
CREATE POLICY "Admin can insert blocked slots"
ON public.blocked_slots
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'diogodigitalart@gmail.com'
);

-- Only admin can delete
CREATE POLICY "Admin can delete blocked slots"
ON public.blocked_slots
FOR DELETE
TO authenticated
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'diogodigitalart@gmail.com'
);
