import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Users, MapPin, Sparkles, CalendarCheck, Heart, ChevronRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { EXPERIENCES, type Experience } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { ReservationModal } from "@/components/ReservationModal";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { listExperienceCapacity } from "@/server-fns/slots";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/experiencias")({
  head: () => ({
    meta: [
      { title: "Experiências | Boutique Antónia Lage" },
      {
        name: "description",
        content:
          "Reserve uma sessão privada de moda na Boutique Antónia Lage. Boutique Privada e Personal Styling disponíveis.",
      },
      { property: "og:title", content: "Experiências | Boutique Antónia Lage" },
      {
        property: "og:description",
        content: "Reserve uma sessão privada de moda na Boutique Antónia Lage. Boutique Privada e Personal Styling disponíveis.",
      },
    ],
  }),
  component: ExperiencesPage,
});

const STEPS = [
  {
    icon: Sparkles,
    title: "Escolhe a tua experiência",
    description: "Selecciona entre Boutique Privada ou Personal Styling",
  },
  {
    icon: CalendarCheck,
    title: "Reserva o teu momento",
    description: "Escolhe a data e hora que preferes, com pelo menos 3 dias de antecedência",
  },
  {
    icon: Heart,
    title: "Aparece e desfruta",
    description: "Nós tratamos de tudo, desde as peças à atmosfera",
  },
];

const FAQS = [
  {
    question: "É necessário comprar algo?",
    answer:
      "Não. A experiência não implica qualquer compromisso de compra. Vem desfrutar sem pressão.",
  },
  {
    question: "Posso oferecer uma experiência?",
    answer: "Sim! Contacta-nos via WhatsApp e tratamos de tudo.",
  },
  {
    question: "O que está incluído na Boutique Privada?",
    answer:
      "Sessão exclusiva fora do horário normal, selecção personalizada de peças, ambiente personalizado e atenção dedicada.",
  },
  {
    question: "Qual é a política de cancelamento?",
    answer:
      "Podes cancelar ou reagendar até 48h antes da tua reserva sem qualquer custo.",
  },
];

function ExperiencesPage() {
  const { t } = useI18n();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Experience | null>(null);
  const list = useServerFn(listExperienceCapacity);
  const [overrides, setOverrides] = useState<Record<string, { price: number; duration: string; description: string; image_url: string | null }>>({});

  useEffect(() => {
    let cancelled = false;
    list()
      .then((r) => {
        if (cancelled) return;
        const m: typeof overrides = {};
        r.rows.forEach((row) => {
          m[row.experience_name] = {
            price: row.price,
            duration: row.duration,
            description: row.description,
            image_url: row.image_url,
          };
        });
        setOverrides(m);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [list]);

  const experiences = useMemo<Experience[]>(
    () =>
      EXPERIENCES.map((e) => {
        const o = overrides[e.title];
        if (!o) return e;
        return {
          ...e,
          price: Number.isFinite(o.price) ? o.price : e.price,
          duration: o.duration || e.duration,
          description: o.description || e.description,
          image: o.image_url || e.image,
        };
      }),
    [overrides],
  );

  const handleBook = (e: Experience) => {
    if (!session) {
      toast.error("Inicia sessão para continuar com a tua reserva.");
      navigate({ to: "/login", search: { redirect: "/experiencias" } });
      return;
    }
    setSelected(e);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <h1 className="font-display text-4xl italic text-foreground md:text-6xl">
          Uma experiência de moda única em Braga
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Reserve uma sessão privada e deixe-nos cuidar de si — da selecção das peças ao ambiente perfeito.
        </p>
      </section>

      {/* Experiences section */}
      <section className="mx-auto mt-10 max-w-7xl px-4 md:px-8">
        <p className="mb-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {t("tab_experiences")}
        </p>
        <div className="space-y-6">
          {EXPERIENCES.filter((e) => e.title !== "Arranjos e Costura").map((e) => (
            <article
              key={e.id}
              className="overflow-hidden rounded-3xl bg-card md:grid md:grid-cols-2"
            >
              <div className="aspect-[5/3] overflow-hidden md:aspect-auto md:h-full">
                <img src={e.image} alt={e.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col justify-between p-6 md:p-10">
                <div>
                  <div className="mb-3 inline-block rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">
                    {e.price === 0 ? t("free") : `a partir de €${e.price}`}
                  </div>
                  <h2 className="font-display text-3xl italic text-foreground md:text-4xl">
                    {e.title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{e.description}</p>
                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Clock size={15} strokeWidth={1.5} className="text-primary" />
                      {e.duration}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Users size={15} strokeWidth={1.5} className="text-primary" />
                      {e.capacity}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={15} strokeWidth={1.5} className="text-primary" />
                      {e.location}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleBook(e)}
                  className="mt-8 h-12 rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
                >
                  {t("book")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Services section — Tailoring */}
      {EXPERIENCES.filter((e) => e.title === "Arranjos e Costura").map((e) => (
        <section key={e.id} className="mx-auto mt-16 max-w-7xl px-4 md:px-8">
          <div className="mb-6 border-t border-border pt-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#9b7e6b]">Serviços</p>
          </div>
          <article className="overflow-hidden rounded-2xl border border-[#e6dcd2] bg-[#f7f1ea] md:grid md:grid-cols-[2fr_3fr]">
            <div className="aspect-[4/3] overflow-hidden md:aspect-auto md:h-full">
              <img src={e.image} alt={e.title} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col justify-between p-6 md:p-8">
              <div>
                <div className="mb-3 inline-block rounded-full bg-[#e6dcd2] px-3 py-1 text-xs text-[#7a5a44]">
                  a partir de €{e.price}
                </div>
                <h2 className="font-display text-2xl italic text-[#3d2e22] md:text-3xl">
                  {e.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6b5644]">{e.description}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-[#5a4838]">
                  <span className="inline-flex items-center gap-2">
                    <Clock size={14} strokeWidth={1.5} className="text-[#9b7e6b]" />
                    {e.duration}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={14} strokeWidth={1.5} className="text-[#9b7e6b]" />
                    {e.location}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleBook(e)}
                className="mt-6 h-11 rounded-full bg-[#7a5a44] text-xs uppercase tracking-wider text-white transition hover:bg-[#5e4634]"
              >
                Pedir orçamento
              </button>
            </div>
          </article>
        </section>
      ))}

      {/* How it works */}
      <section className="mx-auto mt-20 max-w-7xl px-4 md:px-8">
        <h2 className="text-center font-display text-3xl italic text-foreground md:text-4xl">
          Como funciona
        </h2>

        {/* Desktop horizontal steps */}
        <div className="mt-10 hidden md:flex items-center justify-between gap-4">
          {STEPS.map((step, idx) => (
            <div key={idx} className="flex items-center gap-4 flex-1">
              <div className="flex flex-col items-center text-center flex-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon size={24} strokeWidth={1.5} />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex items-center self-start mt-7">
                  <ChevronRight size={20} className="text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile vertical steps */}
        <div className="mt-10 flex flex-col gap-6 md:hidden">
          {STEPS.map((step, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon size={22} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-20 max-w-3xl px-4 pb-16 md:px-8">
        <h2 className="text-center font-display text-3xl italic text-foreground md:text-4xl">
          Perguntas frequentes
        </h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger className="text-left text-sm font-medium text-foreground">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <ReservationModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Reservar — ${selected.title}` : undefined}
        contextLabel="Experiência"
        itemName={selected?.title ?? ""}
        itemType="experiencia"
        collectExperienceDetails={selected?.title === "Boutique Privada"}
        collectTailoringDetails={selected?.title === "Arranjos e Costura"}
      />
    </Layout>
  );
}
