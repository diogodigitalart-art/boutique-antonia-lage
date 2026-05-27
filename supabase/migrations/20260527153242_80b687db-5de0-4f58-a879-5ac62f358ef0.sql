
-- 1. Wishlist shares: remove public access to user_id. The getSharedWishlist
--    server function uses the service role and does its own token lookup, so
--    no anon/authenticated SELECT policy is needed.
DROP POLICY IF EXISTS "Anyone can view active shares" ON public.wishlist_shares;

-- 2. Returns: tighten INSERT policy to require the order to belong to the user.
DROP POLICY IF EXISTS "Users can create their own returns" ON public.returns;
CREATE POLICY "Users can create their own returns"
ON public.returns
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

-- 3. Reservations: add admin SELECT policy mirroring orders/returns.
CREATE POLICY "Admin can view all reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

CREATE POLICY "Admin can update all reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');
