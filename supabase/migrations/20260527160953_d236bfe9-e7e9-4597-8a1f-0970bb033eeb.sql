
CREATE TABLE public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount >= 25),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  sender_user_id uuid,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  message text,
  send_date date NOT NULL DEFAULT CURRENT_DATE,
  sent_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid,
  order_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gift_cards_code_idx ON public.gift_cards(code);
CREATE INDEX gift_cards_status_idx ON public.gift_cards(status);
CREATE INDEX gift_cards_send_date_idx ON public.gift_cards(send_date) WHERE sent_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_cards TO service_role;

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can create gift cards"
  ON public.gift_cards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Users can view own purchased or redeemed gift cards"
  ON public.gift_cards FOR SELECT TO authenticated
  USING (auth.uid() = sender_user_id OR auth.uid() = redeemed_by_user_id);

CREATE POLICY "Admin can view all gift cards"
  ON public.gift_cards FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can update gift cards"
  ON public.gift_cards FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can delete gift cards"
  ON public.gift_cards FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE TRIGGER trg_gift_cards_updated_at
  BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
