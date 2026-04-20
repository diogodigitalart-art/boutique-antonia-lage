import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "pt" | "en";

const dict = {
  pt: {
    search_placeholder: "O que procuras?",
    tab_collection: "Colecção",
    tab_experiences: "Experiências",
    tab_archive: "Arquivo",
    tab_wishlist: "Wishlist",
    badge_new: "Novo",
    new_arrivals: "Novas chegadas",
    curated_title: "Boutique Antónia Lage — escolhido para ti",
    curated_subtitle: "Selecção pessoal baseada no teu perfil de estilo",
    curated_cta: "Faz o quiz de estilo",
    exclusive_experiences: "Experiências exclusivas",
    archive_pieces: "Peças de arquivo",
    bottom_home: "Início",
    bottom_explore: "Explorar",
    bottom_wishlist: "Wishlist",
    bottom_profile: "O meu perfil",
    reserve: "Reservar para experimentar",
    reserve_short: "Reservar peça",
    buy: "Comprar",
    size: "Tamanho",
    description: "Descrição",
    duration: "Duração",
    capacity: "Capacidade",
    location: "Localização",
    free: "Gratuito",
    book: "Reservar",
    style_quiz: "Quiz de estilo",
    quiz_intro: "4 perguntas para criarmos o teu perfil pessoal",
    quiz_q1: "Para que ocasião procuras vestir?",
    quiz_q2: "Qual o teu estilo preferido?",
    quiz_q3: "Que tipo de peça te define?",
    quiz_q4: "Qual o teu intervalo de orçamento?",
    next: "Seguinte",
    finish: "Concluir",
    your_profile: "O teu perfil de estilo",
    purchase_history: "Histórico de compras",
    reservations: "Reservas activas",
    empty_wishlist: "A tua wishlist está vazia",
    archive_price: "Preço arquivo",
    reserve_confirm: "Peça reservada por 48h. Vai recebê-la na boutique.",
    founded: "Boutique fundada em Braga, 1984",
  },
  en: {
    search_placeholder: "What are you looking for?",
    tab_collection: "Collection",
    tab_experiences: "Experiences",
    tab_archive: "Archive",
    tab_wishlist: "Wishlist",
    badge_new: "New",
    new_arrivals: "New arrivals",
    curated_title: "Boutique Antónia Lage — picked for you",
    curated_subtitle: "Personal selection based on your style profile",
    curated_cta: "Take the style quiz",
    exclusive_experiences: "Exclusive experiences",
    archive_pieces: "Archive pieces",
    bottom_home: "Home",
    bottom_explore: "Explore",
    bottom_wishlist: "Wishlist",
    bottom_profile: "My profile",
    reserve: "Reserve to try on",
    reserve_short: "Reserve piece",
    buy: "Buy now",
    size: "Size",
    description: "Description",
    duration: "Duration",
    capacity: "Capacity",
    location: "Location",
    free: "Free",
    book: "Book",
    style_quiz: "Style quiz",
    quiz_intro: "4 questions to build your personal profile",
    quiz_q1: "What occasion are you dressing for?",
    quiz_q2: "What's your preferred style?",
    quiz_q3: "Which piece defines you?",
    quiz_q4: "What's your budget range?",
    next: "Next",
    finish: "Finish",
    your_profile: "Your style profile",
    purchase_history: "Purchase history",
    reservations: "Active reservations",
    empty_wishlist: "Your wishlist is empty",
    archive_price: "Archive price",
    reserve_confirm: "Piece reserved for 48h. Pick it up at the boutique.",
    founded: "Boutique founded in Braga, 1984",
  },
} as const;

type Key = keyof typeof dict.pt;

const I18nCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}>({ lang: "pt", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("al-lang") : null;
    if (stored === "pt" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("al-lang", l);
  };

  const t = (k: Key) => dict[lang][k];

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
