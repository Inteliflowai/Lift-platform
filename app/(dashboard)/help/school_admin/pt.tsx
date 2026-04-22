"use client";

import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  Settings,
  CreditCard,
  BarChart2,
  BookOpen,
  HeartHandshake,
  Target,
  Plug,
  Brain,
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
import { BackButton } from "@/components/ui/BackButton";

export function SchoolAdminHelpPt() {
  const { t } = useLocale();

  const toc = [
    { id: "dashboard", label: t("help.dashboard.title") },
    { id: "candidates", label: t("help.candidates.title") },
    { id: "cycles", label: t("help.cycles.title") },
    { id: "team", label: t("help.team.title") },
    { id: "evaluator-workspace", label: t("help.evaluator_workspace.title") },
    { id: "reports", label: t("help.settings.title") },
    { id: "settings", label: t("help.settings.title") },
    { id: "subscription", label: t("help.subscription.title") },
    { id: "support-plans", label: "Planos de Apoio" },
    { id: "outcome-tracking", label: "Acompanhamento de Resultados" },
    { id: "sis-integrations", label: "Integrações SIS" },
    { id: "support-resources", label: "Recursos de Apoio" },
    { id: "enriched-signals", label: "Sinais Enriquecidos de Apoio" },
    { id: "stats", label: t("help.stats.title") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackButton label="Painel" />
      <div>
        <h1 className="text-2xl font-bold">{t("help.school_admin.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("help.school_admin.subtitle")}
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Dashboard */}
      <HelpSection id="dashboard" title={t("help.dashboard.title")} icon={LayoutDashboard} defaultOpen>
        <WhereToFind path={["Barra Lateral", "Painel"]} />
        <p className="text-sm text-muted">
          Seu painel oferece um panorama em tempo real do pipeline de admissões. Eis o que cada seção mostra:
        </p>

        <div className="space-y-2">
          <StatExplainer
            label="Total de Candidatos(as)"
            example="47"
            description="Todos(as) os(as) candidatos(as) importados(as) ou convidados(as) para sua escola em todos os ciclos. Inclui ativos(as), concluídos(as) e sinalizados(as)."
          />
          <StatExplainer
            label="Sessões Concluídas"
            example="32"
            description="Número de candidatos(as) que finalizaram todas as tarefas de avaliação. Cada sessão concluída dispara automaticamente o pipeline de IA para gerar perfis de insight, pontuações TRI e briefings para avaliadores(as)."
          />
          <StatExplainer
            label="Sinalizados(as) / Requer Revisão"
            example="5"
            description="Candidatos(as) cujos perfis gerados pela IA foram sinalizados para revisão humana. Isso acontece quando a confiança é baixa, padrões incomuns são detectados ou os Sinais de Apoio à Aprendizagem excedem limiares. Sempre revise antes de decisões de admissão."
          />
          <StatExplainer
            label="% Média de Conclusão"
            example="87%"
            description="A porcentagem média de tarefas concluídas em todas as sessões. Abaixo de 70% pode indicar que candidatos(as) estão desistindo no meio — considere verificar configurações da sessão ou dificuldade das tarefas."
          />
        </div>

        <Tip>
          A <strong>Fila de Revisão</strong> mostra candidatos(as) que precisam de atenção. Clique em qualquer nome para ver o perfil completo, pontuações da IA e briefing do(a) avaliador(a).
        </Tip>
      </HelpSection>

      {/* Candidates */}
      <HelpSection id="candidates" title="Gerenciando Candidatos(as)" icon={Users}>
        <WhereToFind path={["Barra Lateral", "Candidatos"]} />

        <h3 className="text-sm font-semibold">Importando Candidatos(as)</h3>
        <Steps steps={[
          "Clique em \"Importar Excel\" no canto superior direito da página de Candidatos.",
          "Envie uma planilha (.xlsx ou .csv) com as colunas: Nome, Sobrenome, E-mail, Série Pretendida, Data de Nascimento.",
          "Revise a prévia da importação — a plataforma mostra quantos(as) candidatos(as) serão criados(as).",
          "Clique em \"Importar\" para criar todos(as) de uma vez.",
          "Cada candidato(a) recebe um token de convite automaticamente. Use \"Convidar Candidato(a)\" para enviar e-mails.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Convidando um(a) Único(a) Candidato(a)</h3>
        <Steps steps={[
          "Clique em \"Convidar Candidato(a)\" na página de Candidatos.",
          "Preencha nome, e-mail, série pretendida e informações do(a) responsável (se o modo COPPA estiver ativo).",
          "Clique em \"Enviar Convite\" — o(a) candidato(a) recebe um e-mail com link seguro de sessão.",
          "O link é válido pelo número de dias configurado nas definições do ciclo.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Status dos(as) Candidatos(as)</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Convidado(a)</span> — Convite enviado, aguardando o(a) candidato(a) abrir o link</p>
          <p><span className="font-medium text-lift-text">Consentimento Pendente</span> — Consentimento do(a) responsável exigido (modo COPPA)</p>
          <p><span className="font-medium text-lift-text">Ativo(a)</span> — Sessão em andamento ou pronta para iniciar</p>
          <p><span className="font-medium text-lift-text">Concluído(a)</span> — Todas as tarefas finalizadas, pipeline de IA executado</p>
          <p><span className="font-medium text-lift-text">Sinalizado(a)</span> — Requer revisão humana antes de decisão de admissão</p>
        </div>

        <Tip>
          Ao se cadastrar, a plataforma cria 3 candidatos(as) de demonstração (Pedro Oliveira, Mariana Tanaka, Helena Costa) para você explorar. São marcados(as) com &quot;(Demo)&quot; e podem ser excluídos(as) a qualquer momento.
        </Tip>
      </HelpSection>

      {/* Cycles */}
      <HelpSection id="cycles" title="Ciclos de Admissão" icon={Calendar}>
        <WhereToFind path={["Barra Lateral", "Ciclos"]} />
        <p className="text-sm text-muted">
          Um ciclo de admissão representa um período de inscrições (ex.: &quot;Processo 2026-2027&quot;). Cada ciclo tem seu próprio grupo de candidatos(as), datas e séries.
        </p>

        <h3 className="text-sm font-semibold">Criando um Ciclo</h3>
        <Steps steps={[
          "Clique em \"Novo Ciclo\" na página de Ciclos.",
          "Informe um nome (ex.: \"Processo Seletivo 2026-2027\") e o ano acadêmico.",
          "Defina datas de abertura e fechamento — convites só podem ser enviados durante essa janela.",
          "Configure as séries (6º-7º, 8º, 9º-11º) — cada série tem seu conjunto de tarefas apropriadas à idade.",
          "Clique em \"Criar Ciclo\" — ele fica ativo imediatamente.",
        ]} />

        <Tip>
          Você pode ter múltiplos ciclos, mas só um ativo por vez. Ciclos concluídos são arquivados e seus dados continuam acessíveis para relatórios.
        </Tip>
      </HelpSection>

      {/* Team */}
      <HelpSection id="team" title="Gestão de Equipe" icon={UserCheck}>
        <WhereToFind path={["Barra Lateral", "Equipe"]} />
        <p className="text-sm text-muted">
          Adicione avaliadores(as), entrevistadores(as) e outros(as) profissionais à sua escola. Cada papel vê uma visão diferente da plataforma.
        </p>

        <h3 className="text-sm font-semibold">Papéis Explicados</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Administrador(a) da Escola</span> — Controle completo: candidatos, ciclos, equipe, configurações, cobrança. Este é o seu papel.</p>
          <p><span className="font-medium text-lift-text">Avaliador(a)</span> — Revisa perfis, pontuações TRI, briefings de IA. Escreve revisões e recomendações.</p>
          <p><span className="font-medium text-lift-text">Entrevistador(a)</span> — Conduz entrevistas usando briefings gerados por IA. Submete pontuações de rubrica e notas.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Convidando um Membro da Equipe</h3>
        <Steps steps={[
          "Clique em \"Convidar\" na página de Equipe.",
          "Informe nome, e-mail e selecione o papel.",
          "A pessoa recebe um e-mail com link para configurar a conta.",
          "Ao fazer login, ela vê apenas as páginas relevantes ao seu papel.",
        ]} />

        <Warning>
          Assentos de avaliador(a) e entrevistador(a) são limitados pelo tier da sua assinatura. Verifique os limites do plano em Configurações → Assinatura.
        </Warning>
      </HelpSection>

      {/* Evaluator Workspace */}
      <HelpSection id="evaluator-workspace" title="Entendendo a Visão do(a) Avaliador(a)" icon={BarChart2}>
        <p className="text-sm text-muted">
          Quando um(a) candidato(a) conclui a sessão, a plataforma gera um perfil de insight que os(as) avaliadores(as) usam para revisão. Eis o que veem:
        </p>

        <h3 className="text-sm font-semibold">Componentes do Perfil do(a) Candidato(a)</h3>
        <div className="space-y-2">
          <StatExplainer
            label="Pontuação TRI (Índice de Prontidão para Transição)"
            example="72 — Preparado(a)"
            description="Pontuação composta (0-100) em 6 dimensões: leitura, escrita, raciocínio, reflexão, persistência e busca por apoio. Rótulos: Emergente (<40), Em Desenvolvimento (40-59), Preparado(a) (60-79), Excelente (80+)."
          />
          <StatExplainer
            label="Pontuações por Dimensão"
            example="Leitura: 78, Escrita: 65"
            description="Pontuações individuais (0-100) por dimensão, geradas pela IA da Claude analisando as respostas reais do(a) candidato(a). Cada uma inclui nível de confiança e justificativa."
          />
          <StatExplainer
            label="Briefing do(a) Avaliador(a)"
            example="Observações-chave + perguntas para entrevista"
            description="Guia pré-entrevista gerado por IA com 3-5 observações específicas deste(a) candidato(a), 6-8 perguntas personalizadas e áreas para explorar."
          />
          <StatExplainer
            label="Sinais de Apoio à Aprendizagem"
            example="Observar — 2 sinalizadores"
            description="Padrões comportamentais que podem indicar necessidade de avaliação de apoio à aprendizagem. Três níveis: Nenhum (0-1 sinais), Observar (2-3), Recomendar Triagem (4+). NÃO é um diagnóstico — é um estímulo para acompanhamento profissional."
          />
        </div>

        <Tip>
          O(a) avaliador(a) vê tudo isso em uma página. Pode então escrever a revisão, selecionar um nível de recomendação (admitir/lista de espera/não admitir/adiar) e submeter. O(a) administrador(a) da escola vê todas as revisões na página de detalhe do(a) candidato(a).
        </Tip>
      </HelpSection>

      {/* Reports */}
      <HelpSection id="reports" title="Relatórios e Exportações" icon={BookOpen}>
        <p className="text-sm text-muted">
          A plataforma gera vários tipos de relatórios:
        </p>

        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Relatório Interno (PDF)</span> — Perfil de insight completo para sua equipe de admissão. Inclui todas as pontuações, narrativas e Sinais de Apoio à Aprendizagem.</p>
          <p><span className="font-medium text-lift-text">Resumo para a Família (PDF)</span> — Visão acessível aos responsáveis sobre a sessão do(a) candidato(a). Não inclui linguagem diagnóstica nem pontuações brutas. Disponível em português e inglês.</p>
          <p><span className="font-medium text-lift-text">Exportação do Grupo (CSV)</span> — Planilha com todos(as) os(as) candidatos(as) e pontuações para análise.</p>
        </div>

        <Warning>
          Relatórios em português requerem o plano Professional ou superior. Relatórios em inglês estão disponíveis em todos os planos.
        </Warning>
      </HelpSection>

      {/* Settings */}
      <HelpSection id="settings" title="Configurações da Escola" icon={Settings}>
        <WhereToFind path={["Barra Lateral", "Configurações"]} />

        <h3 className="text-sm font-semibold">Configurações Principais</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Idioma Padrão</span> — Define o idioma para convites e interface da sessão (português ou inglês).</p>
          <p><span className="font-medium text-lift-text">Modo COPPA</span> — Quando ativo, exige consentimento dos(as) responsáveis antes que candidatos(as) menores de 13 anos iniciem a sessão.</p>
          <p><span className="font-medium text-lift-text">Pausa de Sessão</span> — Permite que candidatos(as) pausem a sessão e retomem depois via link por e-mail.</p>
          <p><span className="font-medium text-lift-text">Resposta por Voz</span> — Permite que candidatos(as) falem suas respostas em vez de digitar. Recomendado para 6º-7º ano. O áudio é transcrito e imediatamente excluído.</p>
          <p><span className="font-medium text-lift-text">Leitor de Passagem</span> — Um player de texto para fala acima das passagens de leitura. Ajuda candidatos(as) com dificuldades de leitura sem afetar a pontuação.</p>
        </div>
      </HelpSection>

      {/* Subscription */}
      <HelpSection id="subscription" title="Assinatura e Cobrança" icon={CreditCard}>
        <WhereToFind path={["Barra Lateral", "Configurações", "Assinatura"]} />

        <h3 className="text-sm font-semibold">Planos</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Professional (US$ 12.000/ano)</span> — 500 sessões, 5 assentos de avaliador(a), motor completo de sessão, TRI, Sinais de Apoio à Aprendizagem, Inteligência do(a) Avaliador(a), planos de apoio, acompanhamento de resultados, voz.</p>
          <p><span className="font-medium text-lift-text">Enterprise (US$ 18.000/ano)</span> — Sessões e assentos ilimitados, white label, integrações SIS, inteligência de grupo, relatórios para conselho, acesso via API, CSM dedicado.</p>
          <p><span className="font-medium text-lift-text">Trial (30 dias)</span> — Todas as funcionalidades Enterprise, limitado a 25 sessões e 3 assentos de avaliador(a). Sem necessidade de cartão.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Fazendo Upgrade</h3>
        <Steps steps={[
          "Vá em Configurações → Assinatura.",
          "Clique em \"Obter [Nome do Plano]\" no plano desejado.",
          "Você é redirecionado(a) ao checkout seguro do Stripe.",
          "Conclua o pagamento — seu plano é ativado imediatamente.",
          "Você verá a confirmação \"Pagamento bem-sucedido\" ao retornar.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Gerenciando Cobrança</h3>
        <p className="text-sm text-muted">
          Se tem uma assinatura ativa, clique em <strong>Gerenciar Cobrança</strong> na página de assinatura para acessar o Portal do Cliente do Stripe, onde pode atualizar formas de pagamento, ver faturas ou cancelar.
        </p>
      </HelpSection>

      {/* Support Plans */}
      <HelpSection id="support-plans" title="Planos de Apoio" icon={HeartHandshake}>
        <WhereToFind path={["Barra Lateral", "Planos de Apoio"]} />
        <p className="text-sm text-muted">
          Quando um(a) candidato(a) é admitido(a), a plataforma gera automaticamente um plano de integração de 90 dias personalizado ao perfil da avaliação e aos recursos de apoio da sua escola.
        </p>

        <h3 className="text-sm font-semibold">Como os Planos São Gerados</h3>
        <Steps steps={[
          "Um(a) candidato(a) recebe uma decisão \"admitir\" via aba Revisão do(a) Avaliador(a).",
          "A IA lê o perfil de insight, os sinais de apoio à aprendizagem e os recursos configurados pela escola.",
          "Um plano estruturado de 90 dias é gerado com três fases: Ações das Semanas 1-2, Prioridades do Mês 1 e Pontos de Verificação dos Meses 2-3.",
          "O plano aparece na aba \"Plano de Apoio\" do(a) candidato(a) com status de rascunho.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Usando o Plano</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Lista Interativa</span> — Itens das Semanas 1-2 e Mês 1 são checkboxes. Marque conforme sua equipe completa cada ação.</p>
          <p><span className="font-medium text-lift-text">Finalizar Plano</span> — Clique em &quot;Finalizar Plano&quot; quando estiver satisfeito(a). Isso trava o plano para compartilhamento.</p>
          <p><span className="font-medium text-lift-text">Compartilhar com Equipe</span> — Compartilhe o plano com coordenadores(as) de série ou especialistas em aprendizagem. Recebem notificação por e-mail e podem ver o plano.</p>
          <p><span className="font-medium text-lift-text">Nível de Apoio</span> — Cada plano tem um nível: Independente, Padrão, Ampliado ou Intensivo. Definido pela IA com base no perfil.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Seções do Plano</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Recursos Recomendados</span> — Mapeados aos recursos configurados pela escola com níveis de prioridade.</p>
          <p><span className="font-medium text-lift-text">Acomodações Acadêmicas</span> — Sugestões para considerar (não automáticas). Mostradas em destaque âmbar.</p>
          <p><span className="font-medium text-lift-text">Notas de Integração Social</span> — Orientação para a transição social do(a) estudante.</p>
          <p><span className="font-medium text-lift-text">Narrativa do Plano</span> — Resumo escrito para o(a) coordenador(a) sobre as necessidades de transição.</p>
          <p><span className="font-medium text-lift-text">Nota de Boas-Vindas à Família</span> — Parágrafo acolhedor sobre o apoio na integração.</p>
        </div>

        <Warning>
          Planos de apoio são recomendações geradas por IA. Devem ser revisados e customizados pela sua equipe antes de serem compartilhados com famílias. O aviso &quot;Sinalizar para Revisão Antecipada&quot; significa que a IA sugere um check-in antes da marca padrão de 30 dias.
        </Warning>
      </HelpSection>

      {/* Outcome Tracking */}
      <HelpSection id="outcome-tracking" title="Acompanhamento de Resultados" icon={Target}>
        <WhereToFind path={["Detalhe do(a) Candidato(a)", "Aba de Resultados"]} />
        <p className="text-sm text-muted">
          Acompanhe como estudantes admitidos(as) realmente se saem após a matrícula. Registre notas, desempenho acadêmico, necessidades de apoio e dados de permanência — e compare com as previsões originais da plataforma.
        </p>

        <h3 className="text-sm font-semibold">Registrando Resultados</h3>
        <Steps steps={[
          "Abra a página de detalhe de um(a) candidato(a) e vá para a aba \"Resultados\".",
          "A aba aparece para candidatos(as) com status: concluído, revisado, admitido, em lista de espera ou com oferta.",
          "Preencha o formulário: ano acadêmico, bimestre, nota, desempenho acadêmico, serviços de apoio utilizados e notas do(a) orientador(a).",
          "Clique em \"Salvar Resultado\" — você pode registrar múltiplos resultados em diferentes períodos.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">O que Registrar</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Nota e Escala</span> — Insira a nota e selecione a escala (4,0, 5,0 ou 100).</p>
          <p><span className="font-medium text-lift-text">Desempenho Acadêmico</span> — Excelente, Bom, Satisfatório, Requer Apoio ou Condicional.</p>
          <p><span className="font-medium text-lift-text">Ajuste Social</span> — Bem Integrado(a), Em Desenvolvimento ou Com Dificuldade.</p>
          <p><span className="font-medium text-lift-text">Serviços de Apoio</span> — Sessões de reforço por semana, atendimento com psicólogo(a), plano de apoio à aprendizagem ativo, engajamento em atividades extracurriculares.</p>
          <p><span className="font-medium text-lift-text">Permanência</span> — Se o(a) estudante permaneceu ou se desligou (com motivo opcional).</p>
        </div>

        <Tip>
          A aba de Resultados também mostra a previsão original da plataforma (pontuação e rótulo TRI) ao lado dos resultados registrados, permitindo comparar visualmente a prontidão prevista com o desempenho real.
        </Tip>
      </HelpSection>

      {/* SIS Integrations */}
      <HelpSection id="sis-integrations" title="Integrações SIS" icon={Plug}>
        <WhereToFind path={["Barra Lateral", "Configurações", "Integrações"]} />
        <p className="text-sm text-muted">
          Conecte a plataforma ao seu Sistema de Informação do Estudante. Quando um(a) candidato(a) é admitido(a), o registro é enviado automaticamente ao SIS — sem exportação manual. Disponível no plano Enterprise.
        </p>

        <h3 className="text-sm font-semibold">Sistemas Suportados</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Veracross</span> — OAuth 2.0. Você precisará de Client ID, Client Secret e School Route do portal Veracross Axiom.</p>
          <p><span className="font-medium text-lift-text">Blackbaud</span> — SKY API. Requer Subscription Key, Access Token, Refresh Token e School ID do developer.sky.blackbaud.com.</p>
          <p><span className="font-medium text-lift-text">PowerSchool</span> — REST API. Requer Server URL, Client ID e Client Secret do painel do PowerSchool.</p>
          <p><span className="font-medium text-lift-text">Ravenna</span> — API Key e School Slug do admin do Ravenna em Settings → API Access.</p>
          <p><span className="font-medium text-lift-text">Webhook</span> — Envia dados para qualquer URL com verificação de assinatura HMAC-SHA256.</p>
          <p><span className="font-medium text-lift-text">CSV Manual</span> — Exporta admitidos(as) como CSV nos formatos Standard, Veracross ou Blackbaud.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Conectando um Provedor</h3>
        <Steps steps={[
          "Vá em Configurações → Integrações e clique em \"Conectar\" no seu provedor SIS.",
          "Siga as instruções passo a passo no modal de configuração.",
          "Informe suas credenciais — são criptografadas antes do armazenamento (AES-256-GCM).",
          "Clique em \"Salvar e Conectar\", depois use \"Testar\" para verificar a conexão.",
          "Uma vez testada, o status muda para \"Ativa\" e a sincronização ocorre automaticamente nas admissões.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">O que é Sincronizado</h3>
        <p className="text-xs text-muted">
          Na admissão, a plataforma envia: nome, e-mail, série, gênero, preferência de idioma, pontuação TRI, dimensões de prontidão, nível de apoio indicado e link para o relatório da plataforma.
        </p>

        <Tip>
          Se uma sincronização falha, o(a) administrador(a) da escola recebe notificação por e-mail. Você pode repetir sincronizações falhas com o botão &quot;Tentar Novamente&quot; na seção de log.
        </Tip>
      </HelpSection>

      {/* Support Resources */}
      <HelpSection id="support-resources" title="Configuração de Recursos de Apoio" icon={BookOpen}>
        <WhereToFind path={["Barra Lateral", "Configurações", "Recursos"]} />
        <p className="text-sm text-muted">
          Configure os recursos de apoio disponíveis na sua escola. São usados quando a plataforma gera planos de apoio por IA para admitidos(as) — a IA mapeia o apoio recomendado aos seus recursos reais.
        </p>

        <h3 className="text-sm font-semibold">Configurando Recursos</h3>
        <Steps steps={[
          "Vá em Configurações → Recursos. Na primeira vez, verá sugestões iniciais (reforço, especialista em aprendizagem, mentor de pares, orientador).",
          "Clique em uma sugestão para adicionar instantaneamente, ou em \"Adicionar Recurso\" para criar o seu.",
          "Para cada recurso defina: Nome, Tipo (acadêmico, social, aconselhamento, apoio à aprendizagem, enriquecimento, outro), Descrição e séries aplicáveis.",
          "Deixe séries vazias se o recurso está disponível para todas as séries.",
          "Ative/desative recursos conforme a disponibilidade muda ao longo do ano.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Tipos de Recurso</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Acadêmico</span> — Reforço, orientação acadêmica, programas de técnicas de estudo.</p>
          <p><span className="font-medium text-lift-text">Social</span> — Mentoria de pares, programas &quot;buddy&quot;, grupos sociais.</p>
          <p><span className="font-medium text-lift-text">Aconselhamento</span> — Orientador(a) escolar, apoio à transição, serviços de ajuste.</p>
          <p><span className="font-medium text-lift-text">Apoio à Aprendizagem</span> — Especialistas em aprendizagem, especialistas em leitura, tecnologia assistiva.</p>
          <p><span className="font-medium text-lift-text">Enriquecimento</span> — Programas avançados, oportunidades de liderança, clubes.</p>
        </div>

        <Tip>
          Quanto mais específicas as descrições dos recursos, melhor a IA os combina com as necessidades dos(as) candidatos(as). &quot;Reforço semanal 1:1 de matemática com Prof. Ana&quot; é mais útil que &quot;ajuda em matemática&quot;.
        </Tip>
      </HelpSection>

      {/* Enriched Learning Signals */}
      <HelpSection id="enriched-signals" title="Sinais Enriquecidos de Apoio à Aprendizagem" icon={Brain}>
        <WhereToFind path={["Detalhe do(a) Candidato(a)", "Aba Visão Geral", "Painel de Sinais de Apoio"]} />
        <p className="text-sm text-muted">
          A plataforma agora detecta 9 padrões comportamentais sutis durante as sessões. São <strong>observações comportamentais</strong>, não diagnósticos — descrevem o que foi observado na sessão e recomendam conversas de acompanhamento.
        </p>

        <h3 className="text-sm font-semibold">Categorias de Sinal</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Leitura</span> — Tempo de leitura estendido, releitura repetida de passagens.</p>
          <p><span className="font-medium text-lift-text">Escrita</span> — Alta revisão, descompasso raciocínio-expressão, produção escrita limitada.</p>
          <p><span className="font-medium text-lift-text">Atenção</span> — Ritmo variável nas tarefas, dificuldade de conclusão.</p>
          <p><span className="font-medium text-lift-text">Autorregulação</span> — Baixa busca por apoio sob desafio, expressão metacognitiva limitada.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Níveis de Severidade</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-[#fbbf24]">Informativo</span> — Vale notar. Um padrão foi observado mas pode não requerer ação. Pode refletir o estilo do(a) estudante e não uma necessidade.</p>
          <p><span className="font-medium text-[#f59e0b]">Destacado</span> — Vale uma conversa. O padrão foi consistente o suficiente para justificar acompanhamento com a família ou um(a) profissional de apoio à aprendizagem.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Como Ler o Painel</h3>
        <p className="text-xs text-muted">
          Cada sinal inclui uma descrição em linguagem simples, a evidência observada (em itálico) e uma recomendação específica. A recomendação sempre sugere o que explorar — nunca o que concluir.
        </p>

        <Warning>
          A plataforma não diagnostica transtornos de aprendizagem nem condições clínicas. Esses sinais devem ser revisados por um(a) profissional qualificado(a) antes de qualquer decisão. São um insumo entre vários. Para escolas terapêuticas, um aviso adicional é exibido.
        </Warning>
      </HelpSection>

      {/* Stats Explained */}
      <HelpSection id="stats" title="Pontuações e Estatísticas Explicadas" icon={BarChart2}>
        <p className="text-sm text-muted">
          Uma referência abrangente para cada métrica da plataforma.
        </p>

        <h3 className="text-sm font-semibold">Faixas da Pontuação TRI</h3>
        <div className="space-y-2">
          <StatExplainer
            label="Emergente (0-39)"
            example="TRI: 28"
            description="O(a) candidato(a) apresentou lacunas significativas em várias dimensões. Isso não significa que não pode ter sucesso — significa que provavelmente precisará de apoio substancial na transição. Explore o detalhamento por dimensão para ver onde estão as lacunas."
          />
          <StatExplainer
            label="Em Desenvolvimento (40-59)"
            example="TRI: 52"
            description="O(a) candidato(a) mostra prontidão mista. Algumas dimensões são fortes, outras precisam de trabalho. O detalhamento por dimensão é especialmente importante aqui — dois(duas) estudantes com 52 podem parecer muito diferentes."
          />
          <StatExplainer
            label="Preparado(a) (60-79)"
            example="TRI: 72"
            description="O(a) candidato(a) demonstra prontidão sólida para a transição. Algumas áreas fortes e outras em crescimento, mas o perfil geral sugere boa adaptação com apoio padrão."
          />
          <StatExplainer
            label="Excelente (80-100)"
            example="TRI: 88"
            description="Prontidão forte em todas as dimensões. O(a) candidato(a) mostrou profundidade, consistência e autoconsciência durante a sessão. Considere para oportunidades de liderança ou mentoria."
          />
        </div>

        <h3 className="mt-4 text-sm font-semibold">Sinalizadores de Apoio à Aprendizagem</h3>
        <div className="space-y-2">
          <StatExplainer label="Alta Profundidade de Revisão" example="Sinalizador" description="O(a) candidato(a) fez significativamente mais edições que a média nas respostas digitadas. Pode indicar perfeccionismo, incerteza ou dificuldade de planejamento motor." />
          <StatExplainer label="Baixa Permanência em Leitura" example="Sinalizador" description="O(a) candidato(a) passou menos de 30 segundos nas passagens antes de responder. Pode indicar pressa, evitação ou forte fluência de leitura." />
          <StatExplainer label="Produção Escrita Curta" example="Sinalizador" description="Contagem média de palavras abaixo de 25 nas tarefas de escrita. Pode indicar dificuldade de linguagem expressiva, baixo engajamento ou ansiedade." />
          <StatExplainer label="Alta Latência de Resposta" example="Sinalizador" description="Consistentemente lento(a) para iniciar tarefas. Pode indicar diferenças de velocidade de processamento ou evitação." />
          <StatExplainer label="Descompasso Raciocínio-Escrita" example="Sinalizador" description="Pontuação de raciocínio significativamente maior que a de escrita. Sugere que o(a) candidato(a) entende mais do que consegue expressar por escrito — vale explorar na entrevista." />
        </div>

        <Warning>
          Sinais de Apoio à Aprendizagem <strong>não são diagnósticos</strong>. São padrões que avaliadores(as) treinados(as) devem considerar junto com observações de entrevista e outros dados de admissão. A plataforma recomenda acompanhamento profissional quando há 4+ sinalizadores.
        </Warning>
      </HelpSection>
    </div>
  );
}
