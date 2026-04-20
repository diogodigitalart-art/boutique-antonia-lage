import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

export const Route = createFileRoute("/termos-e-condicoes")({
  head: () => ({
    meta: [
      { title: "Termos e Condições | Boutique Antónia Lage" },
      { name: "description", content: "Condições gerais de venda e utilização da Boutique Antónia Lage." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <Layout>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Legal</p>
        <h1 className="mt-3 font-display text-4xl italic text-foreground md:text-5xl">
          Termos e Condições
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualização: Abril 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
          <Section title="1. Identificação">
            Boutique Antónia Lage, R. Dom Afonso Henriques 111, 4700-030 Braga, Portugal.
            Email: store@antonialage.pt · Telefone: 932 196 049.
          </Section>
          <Section title="2. Objecto">
            As presentes condições regulam a venda online de vestuário e acessórios, bem como a
            reserva de peças e experiências na boutique física.
          </Section>
          <Section title="3. Encomendas">
            A encomenda só é considerada aceite após confirmação por email. Reservamo-nos o
            direito de não aceitar encomendas em caso de erro manifesto de preço, ruptura de stock
            ou suspeita de fraude.
          </Section>
          <Section title="4. Preços e pagamento">
            Os preços incluem IVA à taxa legal em vigor em Portugal. Aceitamos cartão de crédito,
            débito, MB Way e transferência bancária. O pagamento é processado de forma segura.
          </Section>
          <Section title="5. Reservas de peças">
            As peças reservadas para prova são guardadas durante 48 horas na boutique. Findo este
            prazo sem confirmação, voltam a ficar disponíveis.
          </Section>
          <Section title="6. Entrega">
            Envios para Portugal continental em 2-4 dias úteis. Ilhas e Europa em 5-10 dias.
            Entrega gratuita acima de 150 €.
          </Section>
          <Section title="7. Direito de livre resolução">
            Tens 14 dias após a recepção para devolver qualquer peça nova, sem necessidade de
            justificação, desde que esteja em perfeito estado e com etiquetas. Peças de arquivo
            em saldo final não são reembolsáveis.
          </Section>
          <Section title="8. Garantias">
            Aplica-se a garantia legal de 3 anos para defeitos de conformidade, conforme o
            Decreto-Lei n.º 84/2021.
          </Section>
          <Section title="9. Propriedade intelectual">
            Todo o conteúdo do site (imagens, textos, marcas) é propriedade da Boutique Antónia
            Lage ou utilizado sob licença. É proibida a reprodução sem autorização.
          </Section>
          <Section title="10. Lei aplicável">
            Aplica-se a lei portuguesa. Litígios poderão ser submetidos ao Centro de Arbitragem
            de Conflitos de Consumo de Braga ou aos tribunais comuns competentes.
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
