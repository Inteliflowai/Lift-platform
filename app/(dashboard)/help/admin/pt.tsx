"use client";

import {
  Building2,
  CreditCard,
  BarChart2,
  Shield,
  Trash2,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  HelpSection,
  Steps,
  WhereToFind,
  Tip,
  Warning,
  StatExplainer,
  TableOfContents,
} from "../components/HelpUI";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function AdminHelpPt() {
  const { t } = useLocale();
  const toc = [
    { id: "overview", label: "Painel do(a) Administrador(a)" },
    { id: "tenants", label: "Gerenciando Tenants" },
    { id: "licenses", label: "Gestão de Licenças" },
    { id: "health", label: "Painel de Saúde de Licenças" },
    { id: "revenue", label: "Relatório de Receita" },
    { id: "data-reset", label: "Reset e Exclusão de Dados" },
    { id: "trial-health", label: "Inteligência de Saúde do Trial" },
    { id: "upgrade-requests", label: "Lidando com Solicitações de Upgrade" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("help.admin.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("help.admin.subtitle")}
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Overview */}
      <HelpSection id="overview" title="Painel do(a) Administrador(a)" icon={BarChart2} defaultOpen>
        <WhereToFind path={["Barra Lateral", "Plataforma (seção)"]} />
        <p className="text-sm text-muted">
          O painel mostra uma visão geral de negócio com métricas-chave:
        </p>

        <div className="space-y-2">
          <StatExplainer label="Escolas Ativas" example="12" description="Tenants com status = 'active' (clientes pagantes). Não inclui trials." />
          <StatExplainer label="Em Trial" example="8" description="Tenants atualmente no trial de 30 dias. Seu pipeline de conversão." />
          <StatExplainer label="MRR" example="R$ 6.400" description="Receita Recorrente Mensal. Calculada como ARR total / 12 de assinaturas ativas." />
          <StatExplainer label="ARR" example="R$ 76.800" description="Receita Recorrente Anual. Soma das taxas anuais de todos os tenants ativos por tier." />
          <StatExplainer label="Trials Expirando Esta Semana" example="3" description="Trials terminando em até 7 dias. Precisam de atenção — um e-mail ou ligação de acompanhamento pode convertê-los." />
          <StatExplainer label="Upgrades Pendentes" example="2" description="Escolas que clicaram em 'Solicitar Upgrade' mas ainda não foram ativadas. Processe rapidamente." />
          <StatExplainer label="Em Atraso" example="1" description="Assinaturas ativas com pagamentos falhos. O Stripe tenta novamente automaticamente, mas acompanhe se persistir." />
        </div>

        <Tip>
          Todos os cards de métricas são clicáveis — levam para visões filtradas onde você pode agir.
        </Tip>
      </HelpSection>

      {/* Tenants */}
      <HelpSection id="tenants" title="Gerenciando Tenants" icon={Building2}>
        <WhereToFind path={["Barra Lateral", "Tenants"]} />
        <p className="text-sm text-muted">
          A página de Tenants lista todas as escolas da plataforma. Clique em um nome para ver detalhes.
        </p>

        <h3 className="text-sm font-semibold">Página de Detalhe do Tenant</h3>
        <p className="text-sm text-muted">Cada página de tenant mostra:</p>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Configurações</span> — Idioma, modo COPPA, pausa de sessão, retenção de dados, controles de voz/acessibilidade.</p>
          <p><span className="font-medium text-lift-text">Usuários</span> — Todos os membros da equipe com papéis e data de adição.</p>
          <p><span className="font-medium text-lift-text">Ciclos</span> — Ciclos de admissão com status e ano acadêmico.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Ações Rápidas (a partir do detalhe do tenant)</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Gestão de Dados</span> — Resetar dados de candidatos, gerenciar licença ou excluir o tenant completamente.</p>
          <p><span className="font-medium text-lift-text">Licença</span> — Ver e editar a licença do tenant, tier, período de cobrança e overrides de features.</p>
          <p><span className="font-medium text-lift-text">Impersonar</span> — Acessar como administrador(a) da escola para investigar problemas.</p>
        </div>
      </HelpSection>

      {/* Licenses */}
      <HelpSection id="licenses" title="Gestão de Licenças" icon={CreditCard}>
        <WhereToFind path={["Barra Lateral", "Licenças"]} />

        <p className="text-sm text-muted">
          A página de Licenças mostra todos os tenants com status, tier e uso.
        </p>

        <h3 className="text-sm font-semibold">Detalhe de Licença (clique em qualquer tenant)</h3>
        <p className="text-sm text-muted">A página de detalhe de licença permite:</p>
        <Steps steps={[
          "Alterar tier e status diretamente (dropdowns)",
          "Editar data de término do trial, datas do período e ciclo de cobrança",
          "Definir overrides de limite de sessões ou assentos (vazio = usar padrão do tier)",
          "Adicionar overrides de features — conceder features individuais além do tier do tenant",
          "Escrever notas internas (visíveis só para administradores(as) da plataforma)",
          "Ver e processar solicitações de upgrade pendentes",
          "Ver o histórico completo de eventos de licença",
        ]} />

        <Tip>
          <strong>Overrides de features</strong> são poderosos — você pode conceder uma única feature Enterprise a um tenant Professional sem mudar o tier inteiro. Útil para demos e acordos especiais.
        </Tip>
      </HelpSection>

      {/* Health */}
      <HelpSection id="health" title="Painel de Saúde de Licenças" icon={TrendingUp}>
        <WhereToFind path={["Painel do(a) Administrador(a)", "Saúde de Licenças (link)"]} />

        <p className="text-sm text-muted">
          O painel de saúde oferece um funil visual e uma lista de itens que requerem atenção.
        </p>

        <h3 className="text-sm font-semibold">Funil de Pipeline</h3>
        <p className="text-sm text-muted">
          Mostra contagens de tenants em cada estágio: Em Trial → Ativo → Convertido → Suspenso → Cancelado. A taxa de conversão mostra qual porcentagem de trials vira cliente pagante.
        </p>

        <h3 className="mt-4 text-sm font-semibold">Tendência Mensal</h3>
        <p className="text-sm text-muted">
          Gráfico de barras mostrando novos trials (índigo) e conversões (verde) por mês nos últimos 6 meses. Ajuda a identificar tendências no pipeline.
        </p>

        <h3 className="mt-4 text-sm font-semibold">Requer Atenção</h3>
        <p className="text-sm text-muted">
          Ordenado por urgência. Codificado por cor:
        </p>
        <div className="space-y-1 text-xs text-muted">
          <p><span className="inline-block w-3 h-3 rounded bg-review/20 mr-1" /> <strong>Vermelho</strong> — Trials expirando em 7 dias ou menos, contas em atraso</p>
          <p><span className="inline-block w-3 h-3 rounded bg-warning/20 mr-1" /> <strong>Âmbar</strong> — Trials expirando em 8-14 dias, limite de sessões &gt;80%</p>
          <p><span className="inline-block w-3 h-3 rounded bg-primary/20 mr-1" /> <strong>Índigo</strong> — Solicitações de upgrade pendentes</p>
        </div>
      </HelpSection>

      {/* Revenue */}
      <HelpSection id="revenue" title="Relatório de Receita" icon={BarChart2}>
        <WhereToFind path={["Painel do(a) Administrador(a)", "Relatório de Receita (link)"]} />

        <div className="space-y-2">
          <StatExplainer label="ARR Total" example="R$ 76.800" description="Soma das taxas anuais de todas as assinaturas ativas." />
          <StatExplainer label="MRR" example="R$ 6.400" description="ARR dividido por 12. Equivalente mensal da receita recorrente." />
          <StatExplainer label="ARR por Tier" example="Tabela" description="Detalhamento mostrando: quantas escolas por tier × taxa anual = ARR do tier. Total no rodapé." />
          <StatExplainer label="Pipeline de Trials" example="R$ 38.400 estimado" description="Valor estimado se todas as escolas em trial converterem no tier esperado (com base na contagem de candidatos estimada no cadastro)." />
        </div>
      </HelpSection>

      {/* Data Reset */}
      <HelpSection id="data-reset" title="Reset e Exclusão de Dados" icon={Trash2}>
        <WhereToFind path={["Tenants", "[Nome da Escola]", "Gestão de Dados"]} />

        <Warning>
          Todas as ações de reset e exclusão são <strong>irreversíveis</strong>. Exigem digitar o nome da escola para confirmar.
        </Warning>

        <h3 className="text-sm font-semibold">Ações Disponíveis</h3>

        <div className="space-y-3">
          <div className="rounded-lg border border-lift-border p-3">
            <p className="text-sm font-medium">Resetar para Trial</p>
            <p className="text-xs text-muted">Reseta a licença para um trial de 30 dias. Os dados NÃO são excluídos. Bom para dar uma escola um recomeço.</p>
          </div>
          <div className="rounded-lg border border-lift-border p-3">
            <p className="text-sm font-medium">Estender Trial</p>
            <p className="text-xs text-muted">Adiciona mais dias a um trial existente. Use quando a escola precisa de mais tempo para avaliar.</p>
          </div>
          <div className="rounded-lg border border-lift-border p-3">
            <p className="text-sm font-medium">Ativar Assinatura</p>
            <p className="text-xs text-muted">Ativa manualmente uma escola em qualquer tier por 1 ano. Use para escolas pagando por fatura em vez de Stripe.</p>
          </div>
          <div className="rounded-lg border border-lift-border p-3">
            <p className="text-sm font-medium">Suspender Conta</p>
            <p className="text-xs text-muted">Bloqueia acesso imediatamente. Dados são retidos. A escola vê a página de suspensão ao fazer login.</p>
          </div>
          <div className="rounded-lg border border-warning/30 p-3">
            <p className="text-sm font-medium text-warning">Resetar Todos os Dados de Candidatos</p>
            <p className="text-xs text-muted">Exclui TODOS os candidatos, sessões, relatórios, revisões, ciclos e dados de IA. Preserva a conta do tenant, usuários e licença. Útil para limpar dados de teste.</p>
          </div>
          <div className="rounded-lg border border-review/30 p-3">
            <p className="text-sm font-medium text-review">Excluir Escola por Completo</p>
            <p className="text-xs text-muted">Exclusão em cascata de tudo: tenant, usuários, dados, licença. Não pode ser desfeito. Não é possível excluir seu próprio tenant.</p>
          </div>
        </div>
      </HelpSection>

      {/* Trial Health */}
      <HelpSection id="trial-health" title="Inteligência de Saúde do Trial" icon={Activity}>
        <WhereToFind path={["Barra Lateral", "Saúde do Trial"]} />
        <p className="text-sm text-muted">
          Monitore o engajamento das escolas em trial em tempo real. Identifique trials em risco cedo e intervenha antes que expirem sem uso.
        </p>

        <h3 className="text-sm font-semibold">Visão Geral do Painel</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Total de Trials</span> — Número de escolas atualmente em trial ativo.</p>
          <p><span className="font-medium text-lift-text">Saudáveis</span> — Escolas que fizeram login, convidaram candidatos e estão engajando com features.</p>
          <p><span className="font-medium text-lift-text">Em Risco</span> — Escolas que não fizeram login em 24 horas após cadastro, não completaram uma sessão até o dia 7, ou têm baixa profundidade de uso até o dia 14.</p>
          <p><span className="font-medium text-lift-text">Profundidade Média de Features</span> — Número médio de features exploradas (de 7) entre todas as escolas em trial.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Colunas da Tabela</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Dias Restantes</span> — Dias que restam no trial. Vermelho se menos de 7, âmbar se menos de 14.</p>
          <p><span className="font-medium text-lift-text">Login Dia 1</span> — Se o(a) administrador(a) da escola fez login em 24 horas.</p>
          <p><span className="font-medium text-lift-text">Primeira Sessão</span> — Se um(a) candidato(a) concluiu uma sessão. Mostra em qual dia aconteceu.</p>
          <p><span className="font-medium text-lift-text">Profundidade de Features</span> — Barra de progresso mostrando quantas das 7 features-chave foram exploradas. Passe o mouse para ver quais.</p>
          <p><span className="font-medium text-lift-text">Candidatos Rodados</span> — Total de sessões concluídas para esta escola.</p>
          <p><span className="font-medium text-lift-text">Saúde</span> — Saudável (verde) ou Em Risco (vermelho), em formato de pílula.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Enviar Nudge</h3>
        <p className="text-xs text-muted">
          Clique em &quot;Nudge&quot; em qualquer escola em trial para disparar um e-mail pessoal de acompanhamento via HighLevel. O(a) administrador(a) recebe uma mensagem de Marvin oferecendo ajuda e um link para agendar uma chamada.
        </p>

        <h3 className="mt-4 text-sm font-semibold">Workflows Automáticos do HL</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p>Eventos de trial marcam automaticamente contatos no HL, disparando workflows de e-mail:</p>
          <p><span className="font-medium text-lift-text">Sem Login Dia 1</span> — E-mail &quot;Algo deu errado?&quot; após 2 horas.</p>
          <p><span className="font-medium text-lift-text">Em Risco (Dia 7)</span> — E-mail &quot;Seu trial precisa de uma coisa&quot; incentivando uma sessão de teste.</p>
          <p><span className="font-medium text-lift-text">Primeira Sessão Concluída</span> — Celebração + próximos passos.</p>
          <p><span className="font-medium text-lift-text">Nudge Manual</span> — E-mail pessoal do co-fundador.</p>
        </div>

        <Tip>
          O melhor preditor de conversão é concluir uma primeira sessão de candidato(a) nos primeiros 7 dias. Foque seu contato em levar as escolas a esse marco.
        </Tip>
      </HelpSection>

      {/* Upgrade Requests */}
      <HelpSection id="upgrade-requests" title="Lidando com Solicitações de Upgrade" icon={Shield}>
        <p className="text-sm text-muted">
          Quando uma escola clica em &quot;Solicitar Upgrade&quot; na página de assinatura, cria uma solicitação que aparece em dois lugares:
        </p>

        <Steps steps={[
          "Você recebe um e-mail de notificação em lift@inteliflowai.com com todos os detalhes da solicitação.",
          "A solicitação aparece na página de Detalhe de Licença do tenant, em \"Solicitações de Upgrade Pendentes\".",
          "Revise a solicitação — verifique o uso atual da escola, tier e preferência de cobrança.",
          "Clique em \"Ativar Upgrade\" para imediatamente mudar o tier e configurar o período anual.",
          "A escola recebe um e-mail de ativação e o painel é atualizado instantaneamente.",
          "Para upgrades via Stripe: as escolas clicam em \"Obter [Tier]\" e pagam pelo Stripe Checkout — isso ativa automaticamente via webhook.",
        ]} />

        <Tip>
          Escolas que pagam via Stripe são ativadas automaticamente — não é necessária ação manual. A ativação manual é só para acordos baseados em fatura ou com preço customizado.
        </Tip>
      </HelpSection>
    </div>
  );
}
