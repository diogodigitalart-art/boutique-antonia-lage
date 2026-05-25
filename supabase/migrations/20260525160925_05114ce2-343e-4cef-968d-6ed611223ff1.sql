
-- Settings entries (use INSERT ON CONFLICT)
INSERT INTO public.settings (key, value) VALUES
  ('experience_tailoring_price', '15'),
  ('google_review_url', '')
ON CONFLICT (key) DO NOTHING;

-- Allow "Concluída" reservation status
CREATE OR REPLACE FUNCTION public.validate_reservation_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('Confirmada', 'Em visita', 'Cancelada', 'Vendida', 'Concluída') THEN
    RAISE EXCEPTION 'invalid reservation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- Editorial posts
CREATE TABLE public.editorial_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  quote text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  featured_product_ids text[] NOT NULL DEFAULT '{}',
  teaser_text text NOT NULL DEFAULT '',
  publish_date date NOT NULL DEFAULT CURRENT_DATE,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published editorials"
  ON public.editorial_posts FOR SELECT
  USING (is_published = true OR (auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can insert editorials"
  ON public.editorial_posts FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can update editorials"
  ON public.editorial_posts FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete editorials"
  ON public.editorial_posts FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE TRIGGER editorial_posts_updated_at
  BEFORE UPDATE ON public.editorial_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Waitlist
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  size text NOT NULL,
  email text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);
CREATE INDEX waitlist_product_size_idx ON public.waitlist (product_id, size) WHERE notified_at IS NULL;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (length(email) >= 3 AND length(email) <= 320 AND length(size) >= 1 AND length(size) <= 50);

CREATE POLICY "Admin can view waitlist"
  ON public.waitlist FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Users can view their waitlist"
  ON public.waitlist FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can update waitlist"
  ON public.waitlist FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete waitlist"
  ON public.waitlist FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

-- Review requests
CREATE TABLE public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_id uuid,
  reservation_id uuid,
  type text NOT NULL,
  customer_email text NOT NULL,
  customer_name text,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_requests_pending_idx ON public.review_requests (scheduled_for) WHERE sent_at IS NULL;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view review requests"
  ON public.review_requests FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can manage review requests"
  ON public.review_requests FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');
