import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

export const Route = createFileRoute("/devolucoes-info")({
  head: () => ({
    meta: [
      { title: "Devoluções | Boutique Antónia Lage" },
      { name: "description", content: "Política de devoluções da Boutique Antónia Lage. Saiba como devolver as suas peças." },
    ],
  }),
  component: DevolucoesPage,
});

function DevolucoesPage() {
  return (
    <Layout>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Serviço ao cliente</p>
        <h1 className="mt-3 font-display text-4xl italic text-foreground md:text-5xl">
          Devoluções
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualização: Abril 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
          <Section title="Direito de livre resolução">
            Tens 14 dias após a recepção da encomenda para exercer o teu direito de livre
            resolução, sem necessidade de indicar o motivo. A peça deve estar em perfeito estado,
            sem sinais de uso e com todas as etiquetas originais.
          </Section>
          <Section title="Como devolver">
            1. Contacta-nos por email ou telefone para iniciar o processo.
            <br />
            2. Embala a peça com cuidado, incluindo o comprovativo de compra.
            <br />
            3. Envia para a nossa morada ou entrega directamente na boutique.
            <br />
            4. Após recepção e verificação, o reembolso será processado em 5-10 dias úteis.
          </Section>
          <Section title="Peças não elegíveis">
            Peças de arquivo em saldo final, artigos de lingerie, peças personalizadas ou
            alteradas, e peças com sinais de uso não são elegíveis para devolução.
          </Section>
          <Section title="Contacto">
            Para esclarecimentos sobre devoluções, contacta-nos:
            <br />
            Email: <a href="mailto:store@antonialage.pt" className="text-primary underline-offset-4 hover:underline">store@antonialage.pt</a>
            <br />
            Telefone: <a href="tel:+351932196049" className="text-primary underline-offset-4 hover:underline">932 196 049</a>
          </Section>
        </div>
      </article>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl italic text-foreground">{title}</h2>
      <p className="mt-3 text-muted-foreground">{children}</p>
    </section>
  );
}
