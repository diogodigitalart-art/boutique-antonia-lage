
-- Orders: writes happen exclusively via server functions using the service role.
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

-- Returns: writes happen exclusively via server functions using the service role.
DROP POLICY IF EXISTS "Users can create their own returns" ON public.returns;

-- Waitlist: signups happen exclusively via server functions; remove anon insert path.
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
