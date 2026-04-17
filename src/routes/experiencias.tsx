import { createFileRoute } from "@tanstack/react-router";
import { Clock, Users, MapPin, Calendar } from "lucide-react";
import { Layout } from "@/components/Layout";
import { EXPERIENCES } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/experiencias")({
  head: () => ({
    meta: [
      { title: "Experiências exclusivas — Boutique Antónia Lage" },
      {
        name: "description",
        content:
          "Boutique Privada e Personal Styling com a Antónia, na boutique em Braga.",
      },
      { property: "og:title", content: "Experiências exclusivas — Antónia Lage" },
      {
        property: "og:description",
        content: "Eventos íntimos e curados na boutique em Braga.",
      },
    ],
  }),
  component: ExperiencesPage,
});

function ExperiencesPage() {
  const { t } = useI18n();
  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">{t("badge_new")}</p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">
          {t("exclusive_experiences")}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Momentos íntimos curados pela Antónia. Reserva o teu lugar na boutique.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 md:px-8">
        <div className="space-y-6">
          {EXPERIENCES.map((e) => (
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
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={15} strokeWidth={1.5} className="text-primary" />
                      Quinzenal
                    </span>
                  </div>
                </div>
                <button className="mt-8 h-12 rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90">
                  {t("book")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
}
