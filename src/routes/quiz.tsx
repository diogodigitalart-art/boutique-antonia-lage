import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { Check } from "lucide-react";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz de estilo | Boutique Antónia Lage" },
      {
        name: "description",
        content: "Quatro perguntas para criarmos o teu perfil de estilo personalizado.",
      },
    ],
  }),
  component: QuizPage,
});

type Q = { key: string; q: keyof QDict; options: string[] };
type QDict = {
  quiz_q1: string;
  quiz_q2: string;
  quiz_q3: string;
  quiz_q4: string;
};

const questions: Q[] = [
  { key: "occasion", q: "quiz_q1", options: ["Dia-a-dia", "Trabalho", "Eventos especiais", "Viagem"] },
  {
    key: "style",
    q: "quiz_q2",
    options: ["Clássico intemporal", "Boémio romântico", "Minimalista", "Editorial"],
  },
  { key: "piece", q: "quiz_q3", options: ["Vestidos", "Alfaiataria", "Casacos", "Blusas"] },
  { key: "budget", q: "quiz_q4", options: ["até €300", "€300–€600", "€600–€1000", "€1000+"] },
];

function QuizPage() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const current = questions[step];
  const total = questions.length;

  const select = (opt: string) => {
    setAnswers((a) => ({ ...a, [current.key]: opt }));
  };

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else {
      try {
        localStorage.setItem("al-style-profile", JSON.stringify(answers));
      } catch {}
      setDone(true);
    }
  };

  if (done) {
    const styleChoice = answers["style"] ?? "";
    return (
      <Layout>
        <section className="mx-auto max-w-2xl px-4 py-20 text-center md:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
            <Check size={28} className="text-primary" />
          </div>
          <h1 className="mt-6 font-display text-4xl font-light italic text-foreground md:text-5xl">
            O teu perfil de estilo
          </h1>
          <p className="mt-3 font-light text-muted-foreground">
            A Antónia já está a curar peças especialmente para ti.
          </p>
          <div className="mt-10 space-y-3 text-left">
            {questions.map((q) => (
              <div
                key={q.key}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
              >
                <span className="text-sm font-light text-muted-foreground">{t(q.q)}</span>
                <span className="font-display text-lg italic text-primary">{answers[q.key]}</span>
              </div>
            ))}
          </div>
          <Link
            to="/"
            search={{ style: styleChoice }}
            className="mt-10 inline-block rounded-full bg-primary px-8 py-4 text-sm font-light uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
          >
            Ver selecção para mim
          </Link>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-10 md:px-8 md:py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">
          {t("style_quiz")} · {step + 1}/{total}
        </p>
        <h1 className="mt-3 font-display text-4xl italic text-foreground md:text-5xl">
          {t(current.q)}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("quiz_intro")}</p>

        <div className="mt-8 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>

        <div className="mt-8 grid gap-3">
          {current.options.map((opt) => {
            const active = answers[current.key] === opt;
            return (
              <button
                key={opt}
                onClick={() => select(opt)}
                className={`flex items-center justify-between rounded-2xl border px-6 py-5 text-left transition ${
                  active
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-foreground"
                }`}
              >
                <span className="font-display text-xl italic text-foreground">{opt}</span>
                {active && <Check size={18} className="text-primary" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={next}
          disabled={!answers[current.key]}
          className="mt-8 h-14 w-full rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step === total - 1 ? t("finish") : t("next")}
        </button>
      </section>
    </Layout>
  );
}
