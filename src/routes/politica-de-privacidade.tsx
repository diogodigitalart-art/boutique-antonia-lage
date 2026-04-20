import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Boutique Antónia Lage" },
      { name: "description", content: "Como tratamos os teus dados pessoais em conformidade com o RGPD." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Layout>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Legal</p>
        <h1 className="mt-3 font-display text-4xl italic text-foreground md:text-5xl">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualização: Abril 2026</p>

        <div className="prose prose-neutral mt-10 max-w-none space-y-8 text-sm leading-relaxed text-foreground">
          <Section title="1. Responsável pelo tratamento">
            A Boutique Antónia Lage, com sede em R. Dom Afonso Henriques 111, 4700-030 Braga,
            Portugal, é a responsável pelo tratamento dos dados pessoais recolhidos através deste
            site, em conformidade com o Regulamento Geral de Protecção de Dados (RGPD — Reg. UE
            2016/679) e a Lei n.º 58/2019.
          </Section>
          <Section title="2. Dados recolhidos">
            Recolhemos: nome, email, telefone, morada de entrega, histórico de encomendas e
            reservas, preferências de estilo (quando completas o quiz) e dados de navegação
            estritamente necessários ao funcionamento do site.
          </Section>
          <Section title="3. Finalidades">
            Os teus dados são tratados para: (i) gestão da tua conta e do teu perfil de estilo;
            (ii) processamento de encomendas e reservas; (iii) comunicações relacionadas com o
            serviço; (iv) cumprimento de obrigações legais (facturação, garantias).
          </Section>
          <Section title="4. Fundamento legal">
            Execução do contrato (compras e reservas), consentimento (newsletter, perfil de
            estilo) e cumprimento de obrigações legais (fiscais e contabilísticas).
          </Section>
          <Section title="5. Conservação">
            Os dados de cliente são conservados durante a relação contratual e até 10 anos após o
            seu fim, conforme exigências fiscais portuguesas. Dados de marketing são eliminados
            quando retirado o consentimento.
          </Section>
          <Section title="6. Partilha">
            Não vendemos dados. Partilhamos apenas com prestadores essenciais: alojamento,
            processamento de pagamentos, transportadoras e serviço de email transaccional, todos
            sujeitos a acordo de confidencialidade.
          </Section>
          <Section title="7. Os teus direitos">
            Tens direito de acesso, rectificação, apagamento, portabilidade, limitação e oposição.
            Podes exercê-los através de <a href="mailto:store@antonialage.pt" className="text-primary underline-offset-4 hover:underline">store@antonialage.pt</a>.
            Tens igualmente direito a apresentar reclamação à CNPD.
          </Section>
          <Section title="8. Cookies">
            Utilizamos cookies estritamente necessários ao funcionamento (sessão, carrinho,
            preferências). Cookies analíticos só são activados com o teu consentimento.
          </Section>
          <Section title="9. Contacto">
            Para qualquer questão sobre privacidade: <a href="mailto:store@antonialage.pt" className="text-primary underline-offset-4 hover:underline">store@antonialage.pt</a> · 932 196 049.
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
