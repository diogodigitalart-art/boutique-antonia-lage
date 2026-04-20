import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { Check, Calendar, Sparkles, Shirt, Wallet } from "lucide-react";

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

type Q = { key: string; q: keyof QDict; options: string[]; icon: typeof Calendar; label: string };
type QDict = {
  quiz_q1: string;
  quiz_q2: string;
  quiz_q3: string;
  quiz_q4: string;
};

const questions: Q[] = [
  { key: "occasion", q: "quiz_q1", label: "Ocasião", icon: Calendar, options: ["Dia-a-dia", "Trabalho", "Eventos especiais", "Viagem"] },
  {
    key: "style",
    q: "quiz_q2",
    label: "Estilo",
    icon: Sparkles,
    options: ["Clássico intemporal", "Boémio romântico", "Minimalista", "Editorial"],
  },
  { key: "piece", q: "quiz_q3", label: "Peça favorita", icon: Shirt, options: ["Vestidos", "Alfaiataria", "Casacos", "Blusas"] },
  { key: "budget", q: "quiz_q4", label: "Orçamento", icon: Wallet, options: ["até €300", "€300–€600", "€600–€1000", "€1000+"] },
];

function buildProfileDescription(a: Record<string, string>) {
  const occasion = a.occasion?.toLowerCase() ?? "";
  const style = a.style ?? "";
  const piece = a.piece?.toLowerCase() ?? "";
  const budget = a.budget ?? "";
  return `O teu perfil revela uma mulher com sensibilidade ${style.toLowerCase()}, que valoriza ${piece} para momentos de ${occasion}. A Antónia vai curar peças que combinam elegância intemporal com o teu orçamento de ${budget} — selecções pensadas para durar e para te fazerem sentir verdadeiramente tu.`;
}

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
    return (
      <Layout>
        <section className="mx-auto max-w-2xl px-4 py-16 text-center md:px-8 md:py-20">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
            <Check size={28} className="text-primary" />
          </div>
          <h1 className="mt-6 font-display text-4xl font-light italic text-foreground md:text-6xl">
            O teu perfil de estilo
          </h1>
          <p className="mt-4 mx-auto max-w-lg font-light leading-relaxed text-muted-foreground">
            {buildProfileDescription(answers)}
          </p>

          <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card text-left">
            {questions.map((q, i) => {
              const Icon = q.icon;
              return (
                <div
                  key={q.key}
                  className={`flex items-center gap-4 px-6 py-5 ${
                    i !== questions.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                    <Icon size={18} strokeWidth={1.5} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground">
                      {q.label}
                    </p>
                    <p className="mt-1 font-display text-xl italic text-foreground">
                      {answers[q.key]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            to="/"
            className="mt-10 inline-block w-full rounded-full bg-primary px-8 py-4 text-sm font-light uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 md:w-auto"
          >
            Ver peças seleccionadas para mim
          </Link>
          <div className="mt-5">
            <button
              onClick={() => {
                setAnswers({});
                setStep(0);
                setDone(false);
              }}
              className="text-xs font-light uppercase tracking-[0.2em] text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
            >
              Refazer o quiz
            </button>
          </div>
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
