import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Layout } from "@/components/Layout";
import { MapPin, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contactos")({
  head: () => ({
    meta: [
      { title: "Contactos | Boutique Antónia Lage" },
      { name: "description", content: "Visita-nos em Braga ou contacta a Boutique Antónia Lage." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    // Placeholder — wire to backend later
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    (e.target as HTMLFormElement).reset();
    toast.success("Mensagem enviada. Respondemos em breve.");
  };

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Visita-nos</p>
        <h1 className="mt-3 font-display text-4xl italic text-foreground md:text-6xl">Contactos</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          A nossa equipa está disponível para te receber na boutique ou responder por email.
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
          {/* Info + map */}
          <div className="space-y-8">
            <InfoRow icon={MapPin} label="Boutique">
              R. Dom Afonso Henriques 111
              <br />
              4700-030 Braga, Portugal
            </InfoRow>
            <InfoRow icon={Mail} label="Email">
              <a href="mailto:store@antonialage.pt" className="text-primary underline-offset-4 hover:underline">
                store@antonialage.pt
              </a>
            </InfoRow>
            <InfoRow icon={Phone} label="Telefone">
              <a href="tel:+351932196049" className="hover:text-primary">
                932 196 049
              </a>
            </InfoRow>

            <div className="overflow-hidden rounded-3xl border border-border">
              <iframe
                title="Mapa da Boutique Antónia Lage"
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d186.61973420418636!2d-8.425739345423356!3d41.549421447278085!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd24febbf00ed9ed%3A0x41250303f208cce6!2sAnt%C3%B3nia%20Lage%20Boutique!5e0!3m2!1spt-PT!2sus!4v1776706693749!5m2!1spt-PT!2sus"
                className="h-[450px] w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl italic text-foreground">Envia-nos uma mensagem</h2>
            <Field label="Nome" name="name" type="text" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Assunto" name="subject" type="text" required />
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Mensagem
              </label>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "A enviar…" : "Enviar mensagem"}
            </button>
          </form>
        </div>
      </section>
    </Layout>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
        <Icon size={18} strokeWidth={1.5} className="text-primary" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="mt-1 font-light text-foreground">{children}</p>
      </div>
    </div>
  );
}

function Field({ label, name, type, required }: { label: string; name: string; type: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
