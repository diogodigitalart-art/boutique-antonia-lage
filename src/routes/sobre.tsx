import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre nós | Boutique Antónia Lage" },
      { name: "description", content: "Conhece a história da Boutique Antónia Lage, moda feminina premium em Braga desde 1984." },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <Layout>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">A nossa história</p>
        <h1 className="mt-3 font-display text-4xl italic text-foreground md:text-5xl">
          Sobre nós
        </h1>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
          <Section>
            A Boutique Antónia Lage nasceu em 1984, no coração de Braga, com uma visão clara:
            oferecer moda feminina de excelência, selecionada com rigor e bom gosto. Ao longo de
            mais de quatro décadas, tornámo-nos um ponto de referência para mulheres que valorizam
            qualidade, elegância e um atendimento personalizado.
          </Section>
          <Section>
            Cada peça que apresentamos é escolhida a pensar em si — nos seus momentos especiais,
            no seu dia a dia, na sua individualidade. Trabalhamos com marcas nacionais e
            internacionais criteriosamente seleccionadas, garantindo um guarda-roupa que transcende
            temporadas e tendências passageiras.
          </Section>
          <Section>
            A nossa equipa acredita que comprar roupa deve ser uma experiência memorável. Por isso,
            convidamo-la a visitar a nossa boutique em Braga, onde aconselhamento de estilo e
            atenção aos pormenores fazem parte de cada conversa.
          </Section>
          <Section>
            Bem-vinda à Boutique Antónia Lage — onde a moda encontra a tradição.
          </Section>
        </div>
      </article>
    </Layout>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}
