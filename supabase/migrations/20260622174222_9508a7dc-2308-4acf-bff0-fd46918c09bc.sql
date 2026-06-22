
-- Returns: allow the order owner to submit their own return
CREATE POLICY "Users can create their own returns"
  ON public.returns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Orders: defense-in-depth — only allow self-owned inserts via PostgREST
CREATE POLICY "Users can create their own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Waitlist: defense-in-depth — only allow self-owned inserts via PostgREST
CREATE POLICY "Users can add themselves to waitlist"
  ON public.waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Gift cards: recipient can look up their own (unredeemed) gift cards by email
CREATE POLICY "Recipients can view gift cards sent to their email"
  ON public.gift_cards
  FOR SELECT
  TO authenticated
  USING (lower(recipient_email) = lower(auth.jwt() ->> 'email'));
