-- Fix products SELECT policy: avoid auth.users subquery which anon role can't access
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  OR (auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com'
);

-- Same fix for brands (uses similar pattern but SELECT was already true for everyone — leaving as is)
-- Same fix for products other policies (admin write) - keep using auth.jwt() to avoid auth.users dependency
DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Admin can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products"
ON public.products
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');

DROP POLICY IF EXISTS "Admin can delete products" ON public.products;
CREATE POLICY "Admin can delete products"
ON public.products
FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'diogodigitalart@gmail.com');