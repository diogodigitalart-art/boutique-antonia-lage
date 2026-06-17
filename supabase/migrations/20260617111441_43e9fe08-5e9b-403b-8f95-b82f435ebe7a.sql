
ALTER TABLE public.experience_capacity
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

INSERT INTO public.experience_capacity (experience_name, max_capacity_per_slot, price, duration, description)
VALUES ('Arranjos e Costura', 1, 15, 'Variável', 'Pequenos ajustes feitos com mãos artesãs. Bainhas, ajustes de cavas e cintura, aberturas de costura — para que cada peça assente como se fosse feita para ti.')
ON CONFLICT (experience_name) DO NOTHING;

UPDATE public.experience_capacity SET price = 150, duration = '2 horas',
  description = 'A boutique fechada só para ti. Duas horas com a atenção total da equipa — escolhas sem pressa, sem o mundo lá fora.'
WHERE experience_name = 'Boutique Privada' AND (price = 0 OR duration = '');

UPDATE public.experience_capacity SET price = 80, duration = '1 hora',
  description = 'Sessão de styling personalizada com a nossa equipa. Um olho clínico com 40 anos de experiência dedicado só a ti.'
WHERE experience_name = 'Personal Styling' AND (price = 0 OR duration = '');
