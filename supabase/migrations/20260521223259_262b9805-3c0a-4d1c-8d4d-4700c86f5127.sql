CREATE TABLE public.size_guides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name text NOT NULL UNIQUE,
  guide_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.size_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view size guides"
ON public.size_guides FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin can insert size guides"
ON public.size_guides FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'diogodigitalart@gmail.com'::text);

CREATE POLICY "Admin can update size guides"
ON public.size_guides FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'diogodigitalart@gmail.com'::text)
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'diogodigitalart@gmail.com'::text);

CREATE POLICY "Admin can delete size guides"
ON public.size_guides FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'diogodigitalart@gmail.com'::text);

CREATE TRIGGER update_size_guides_updated_at
BEFORE UPDATE ON public.size_guides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();