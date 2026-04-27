// Mock data for Boutique Antónia Lage
// Experiences are still hardcoded; products now come from the live Supabase
// `products` table via `useProducts()` (see `src/lib/products.tsx`).

export type Product = {
  id: string;
  /** Database UUID — required when calling stock-adjust functions. */
  uuid?: string;
  brand: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  sizes: string[];
  /** Per-size availability (sizes that still have stock available). */
  availableSizes?: string[];
  /** True when every size is reserved (no stock available). */
  fullyReserved?: boolean;
  reference?: string;
  description: string;
  category: "new" | "archive" | "curated";
  season?: string;
};

export type Experience = {
  id: string;
  title: string;
  description: string;
  duration: string;
  capacity: string;
  location: string;
  price: number;
  image: string;
  tag: string;
};

export const BRANDS = [
  "Todas",
  "Zadig & Voltaire",
  "Self-Portrait",
  "BA&SH",
  "Alberta Ferretti",
  "Anine Bing",
  "DVF",
  "Rixo",
  "SARACO",
];

const img = (seed: string, w = 800, h = 1000) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    brand: "Zadig & Voltaire",
    name: "Vestido seda bordado",
    price: 480,
    image: img("1539109136881-3be0616acf4b"),
    sizes: ["XS", "S", "M", "L"],
    description:
      "Vestido em seda natural com bordado artesanal nas mangas. Caimento fluido, ideal para ocasiões especiais.",
    category: "new",
  },
  {
    id: "p2",
    brand: "Self-Portrait",
    name: "Blusa renda marfim",
    price: 320,
    image: img("1572804013309-59a88b7e92f1"),
    sizes: ["XS", "S", "M"],
    description:
      "Blusa em renda francesa cor marfim, com detalhes em guipura. Peça intemporal para o guarda-roupa.",
    category: "new",
  },
  {
    id: "p3",
    brand: "BA&SH",
    name: "Casaco lã camel",
    price: 540,
    image: img("1591047139829-d91aecb6caea"),
    sizes: ["S", "M", "L"],
    description: "Casaco oversize em lã virgem, tom camel quente. Forro em cetim.",
    category: "new",
  },
  {
    id: "p4",
    brand: "Alberta Ferretti",
    name: "Saia plissada midi",
    price: 690,
    image: img("1583744946564-b52ac1c389c8"),
    sizes: ["XS", "S", "M", "L"],
    description: "Saia plissada em chiffon italiano. Cintura subida, comprimento midi.",
    category: "new",
  },
  {
    id: "p5",
    brand: "Anine Bing",
    name: "Blazer alfaiataria",
    price: 420,
    image: img("1594633312681-425c7b97ccd1"),
    sizes: ["S", "M", "L"],
    description: "Blazer de inspiração masculina em lã fria, corte estruturado.",
    category: "new",
  },
  {
    id: "p6",
    brand: "Rixo",
    name: "Vestido floral midi",
    price: 380,
    image: img("1515886657613-9f3515b0c78f"),
    sizes: ["XS", "S", "M"],
    description: "Vestido em viscose com estampado floral exclusivo, mangas tufadas.",
    category: "new",
  },
  // Archive
  {
    id: "a1",
    brand: "DVF",
    name: "Vestido envelope vintage",
    price: 220,
    originalPrice: 590,
    image: img("1490481651871-ab68de25d43d"),
    sizes: ["S", "M"],
    description: "Edição arquivo. Vestido envelope clássico em jersey de seda.",
    category: "archive",
  },
  {
    id: "a2",
    brand: "Alberta Ferretti",
    name: "Top renda preto",
    price: 180,
    originalPrice: 480,
    image: img("1485518882345-15568b007407"),
    sizes: ["XS", "S"],
    description: "Top em renda chantilly preta. Coleção FW18.",
    category: "archive",
  },
  {
    id: "a3",
    brand: "Self-Portrait",
    name: "Vestido azul cobalto",
    price: 290,
    originalPrice: 650,
    image: img("1496747611176-843222e1e57c"),
    sizes: ["XS", "S", "M"],
    description: "Vestido em crepe cobalto com detalhes em renda. Coleção SS19.",
    category: "archive",
  },
  {
    id: "a4",
    brand: "BA&SH",
    name: "Trench coat bege",
    price: 240,
    originalPrice: 520,
    image: img("1539109136881-3be0616acf4b"),
    sizes: ["S", "M", "L"],
    description: "Trench coat clássico em algodão impermeabilizado.",
    category: "archive",
  },
];

export const EXPERIENCES: Experience[] = [
  {
    id: "exp1",
    title: "Boutique Privada",
    description:
      "A boutique fechada só para ti. Duas horas com a atenção total da equipa — escolhas sem pressa, sem o mundo lá fora.",
    duration: "2 horas",
    capacity: "Até 3 pessoas",
    location: "Braga",
    price: 150,
    image: img("1490481651871-ab68de25d43d", 1200, 800),
    tag: "Experiência exclusiva",
  },
  {
    id: "exp2",
    title: "Personal Styling",
    description:
      "Sessão de styling personalizada com a nossa equipa. Um olho clínico com 40 anos de experiência dedicado só a ti.",
    duration: "1 hora",
    capacity: "Individual",
    location: "Braga",
    price: 80,
    image: img("1515886657613-9f3515b0c78f", 1200, 800),
    tag: "Curadoria pessoal",
  },
];

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
export const getExperience = (id: string) => EXPERIENCES.find((e) => e.id === id);
