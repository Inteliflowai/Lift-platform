"use client";

import {
  ClipboardList,
  Users,
  FileText,
  Star,
  Brain,
  AlertTriangle,
  MessageSquare,
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

export function EvaluatorHelpPt() {
  const { t } = useLocale();
  const toc = [
    { id: "queue", label: "Sua Fila de Revisão" },
    { id: "candidate-review", label: "Revisando um(a) Candidato(a)" },
    { id: "tri-score", label: "Entendendo a Pontuação TRI" },
    { id: "briefing", label: "Briefing de Inteligência do(a) Avaliador(a)" },
    { id: "learning-support", label: "Sinais de Apoio à Aprendizagem" },
    { id: "enriched-signals", label: "Sinais Comportamentais Enriquecidos" },
    { id: "support-plan", label: "Aba de Plano de Apoio" },
    { id: "outcomes", label: "Acompanhamento de Resultados" },
    { id: "writing-review", label: "Escrevendo sua Revisão" },
    { id: "reports", label: "Relatórios do Grupo" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("help.evaluator.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("help.evaluator.subtitle")}
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Queue */}
      <HelpSection id="queue" title="Sua Fila de Revisão" icon={ClipboardList} defaultOpen>
        <WhereToFind path={["Barra Lateral", "Minha Fila"]} />
        <p className="text-sm text-muted">
          Sua fila mostra candidatos(as) que concluíram a sessão e estão prontos(as) para sua revisão. Os(as) candidatos(as) são ordenados(as) pela data de conclusão — mais recentes primeiro.
        </p>

        <h3 className="text-sm font-semibold">Indicadores de Status da Fila</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Concluído(a)</span> — Sessão finalizada, perfil de IA gerado. Pronto(a) para sua revisão.</p>
          <p><span className="font-medium text-review">Sinalizado(a)</span> — A IA detectou padrões incomuns. Revise com atenção extra.</p>
          <p><span className="font-medium text-success">Revisado(a)</span> — Você (ou outro(a) avaliador(a)) já submeteu uma revisão.</p>
        </div>

        <Tip>
          Você também pode navegar por todos(as) os(as) candidatos(as) (não só sua fila) clicando em <strong>Todos os Candidatos</strong> na barra lateral.
        </Tip>
      </HelpSection>

      {/* Candidate Review */}
      <HelpSection id="candidate-review" title="Revisando um(a) Candidato(a)" icon={Users}>
        <p className="text-sm text-muted">
          Clique em qualquer candidato(a) da sua fila para ver o perfil completo. Eis o que você encontrará na página de revisão:
        </p>

        <h3 className="text-sm font-semibold">Layout da Página (de cima para baixo)</h3>
        <Steps steps={[
          "Cabeçalho do(a) candidato(a) — nome, série, data de conclusão da sessão, selo de pontuação TRI",
          "Medidor da Pontuação TRI — indicador visual com rótulo (Emergente / Em Desenvolvimento / Preparado(a) / Excelente)",
          "Pontuações por dimensão — gráfico radar mostrando todas as 6 dimensões com pontuações individuais",
          "Briefing de Inteligência do(a) Avaliador(a) — guia pré-entrevista gerado por IA",
          "Painel de Sinais de Apoio à Aprendizagem — indicadores comportamentais, se detectados",
          "Aba de Respostas — as respostas escritas reais do(a) candidato(a) para cada tarefa",
          "Sua seção de Revisão — onde você escreve a avaliação e a recomendação",
        ]} />

        <Tip>
          Leia as respostas reais do(a) candidato(a) (aba de Respostas) junto com as pontuações da IA. A IA fornece análise quantitativa, mas seu julgamento qualitativo é essencial.
        </Tip>
      </HelpSection>

      {/* TRI Score */}
      <HelpSection id="tri-score" title="Entendendo a Pontuação TRI" icon={Star}>
        <p className="text-sm text-muted">
          O Índice de Prontidão para Transição (TRI) é um composto ponderado de 6 dimensões:
        </p>

        <div className="space-y-2">
          <StatExplainer label="Leitura (20%)" example="0-100" description="Como o(a) candidato(a) processa, compreende e usa evidências de passagens de leitura. Baseado nas respostas de tarefas de passagens de leitura." />
          <StatExplainer label="Escrita (20%)" example="0-100" description="Qualidade da expressão escrita: estrutura, vocabulário, coesão e desenvolvimento de ideias. Baseado em tarefas de escrita estendida e resposta curta." />
          <StatExplainer label="Raciocínio (20%)" example="0-100" description="Capacidade de analisar cenários, resolver problemas e pensar em desafios de múltiplas etapas. Baseado em tarefas de cenário, raciocínio quantitativo e lógica de padrões." />
          <StatExplainer label="Reflexão (15%)" example="0-100" description="Autoconsciência e metacognição. Com que cuidado o(a) candidato(a) considera o próprio pensamento e aprendizado. Baseado em tarefas de reflexão." />
          <StatExplainer label="Persistência (15%)" example="0-100" description="Como o(a) candidato(a) responde quando as tarefas ficam mais difíceis. Medido por sinais comportamentais: tempo em tarefas difíceis, comportamento de nova tentativa, taxa de conclusão." />
          <StatExplainer label="Busca por Apoio (10%)" example="0-100" description="Disposição para usar recursos disponíveis (dicas, releituras). Uma pontuação saudável significa que o(a) candidato(a) sabe quando pedir ajuda — nem demais, nem de menos." />
        </div>

        <Warning>
          O TRI é uma <strong>ferramenta de insight</strong>, não uma nota de aprovado/reprovado. Dois(duas) candidatos(as) com o mesmo TRI podem ter perfis muito diferentes. Sempre olhe o detalhamento por dimensão.
        </Warning>
      </HelpSection>

      {/* Briefing */}
      <HelpSection id="briefing" title="Briefing de Inteligência do(a) Avaliador(a)" icon={Brain}>
        <p className="text-sm text-muted">
          O briefing é gerado automaticamente após cada sessão. É desenhado para preparar você para a entrevista.
        </p>

        <h3 className="text-sm font-semibold">O que o Briefing Contém</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Observações-Chave (3-5)</span> — Padrões específicos da sessão deste(a) candidato(a) que valem ser notados. Exemplo: &quot;Mostrou forte uso de evidências em leitura, mas teve dificuldade com argumentação estruturada em escrita estendida.&quot;</p>
          <p><span className="font-medium text-lift-text">Perguntas Sugeridas para Entrevista (6-8)</span> — Perguntas personalizadas aos padrões específicos deste(a) candidato(a). Não são genéricas — são mapeadas ao que a IA observou.</p>
          <p><span className="font-medium text-lift-text">Áreas para Explorar</span> — Dimensões onde a confiança foi menor ou os padrões foram ambíguos. Oportunidades para aprender mais na entrevista.</p>
          <p><span className="font-medium text-lift-text">Pontos Fortes a Confirmar</span> — Áreas fortes da sessão que você deve buscar observar pessoalmente.</p>
        </div>

        <Tip>
          Imprima ou abra o briefing no celular antes de entrar em uma entrevista. Leva 2 minutos para ler e melhora drasticamente a qualidade da entrevista.
        </Tip>
      </HelpSection>

      {/* Learning Support */}
      <HelpSection id="learning-support" title="Sinais de Apoio à Aprendizagem" icon={AlertTriangle}>
        <p className="text-sm text-muted">
          Este painel aparece quando a IA detecta padrões comportamentais associados a estudantes que podem se beneficiar de avaliação de apoio à aprendizagem.
        </p>

        <h3 className="text-sm font-semibold">Níveis de Sinal</h3>
        <div className="space-y-2">
          <StatExplainer label="Nenhum (0-1 sinais)" example="Verde" description="Nenhum padrão significativo detectado. Prossiga com a avaliação padrão." />
          <StatExplainer label="Observar (2-3 sinais)" example="Âmbar" description="Alguns padrões que valem ser notados. Considere perguntar sobre histórico de aprendizagem na entrevista. Nenhuma ação imediata é necessária." />
          <StatExplainer label="Recomendar Triagem (4+ sinais)" example="Vermelho" description="Múltiplos padrões consistentes com necessidades de apoio à aprendizagem. A plataforma recomenda uma conversa profissional de triagem antes ou logo após a matrícula. O perfil deste(a) candidato(a) é automaticamente sinalizado para revisão humana." />
        </div>

        <Warning>
          <strong>Isto não é um diagnóstico.</strong> A plataforma não diagnostica transtornos de aprendizagem, TDAH ou qualquer condição clínica. Esses sinais são projetados para estimular o acompanhamento profissional — não para substituí-lo.
        </Warning>
      </HelpSection>

      {/* Enriched Signals */}
      <HelpSection id="enriched-signals" title="Sinais Comportamentais Enriquecidos" icon={Brain}>
        <WhereToFind path={["Detalhe do(a) Candidato(a)", "Aba Visão Geral", "Painel de Sinais de Apoio à Aprendizagem"]} />
        <p className="text-sm text-muted">
          Além dos 8 sinalizadores booleanos originais, a plataforma agora computa 9 sinais comportamentais enriquecidos com descrições detalhadas, resumos de evidência e recomendações acionáveis.
        </p>

        <h3 className="text-sm font-semibold">O que Você Verá</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p>Cada sinal enriquecido inclui:</p>
          <p><span className="font-medium text-lift-text">Severidade</span> — Informativo (âmbar) ou Destacado (laranja). Sinais destacados justificam uma conversa.</p>
          <p><span className="font-medium text-lift-text">Categoria</span> — Leitura, Escrita, Atenção ou Autorregulação.</p>
          <p><span className="font-medium text-lift-text">Descrição</span> — Explicação em linguagem simples do que foi observado.</p>
          <p><span className="font-medium text-lift-text">Evidência</span> — Dados específicos da sessão (em itálico).</p>
          <p><span className="font-medium text-lift-text">Recomendação</span> — O que explorar em seguida, marcado com ícone de lâmpada.</p>
        </div>

        <Warning>
          Estas são observações comportamentais, não diagnósticos. Indicam padrões que podem justificar uma conversa profissional sobre apoio à aprendizagem. Nunca os utilize como única base para uma decisão de admissão.
        </Warning>
      </HelpSection>

      {/* Support Plan */}
      <HelpSection id="support-plan" title="Aba de Plano de Apoio" icon={Star}>
        <WhereToFind path={["Detalhe do(a) Candidato(a)", "Aba Plano de Apoio"]} />
        <p className="text-sm text-muted">
          Para candidatos(as) admitidos(as), a aba Plano de Apoio mostra um plano de integração de 90 dias gerado pela IA. Inclui listas acionáveis, recursos recomendados e orientação para a transição.
        </p>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Ações das Semanas 1-2</span> — Lista interativa. Marque itens conforme os conclui.</p>
          <p><span className="font-medium text-lift-text">Prioridades do Mês 1</span> — Também uma lista. Metas de prazo mais longo para o primeiro mês.</p>
          <p><span className="font-medium text-lift-text">Pontos de Verificação dos Meses 2-3</span> — Marcos temporais para apoio contínuo.</p>
          <p><span className="font-medium text-lift-text">Recursos Recomendados</span> — Mapeados aos recursos configurados pela escola com níveis de prioridade.</p>
          <p><span className="font-medium text-lift-text">Narrativa do Plano</span> — Um resumo escrito sobre as necessidades de transição deste(a) estudante.</p>
        </div>
      </HelpSection>

      {/* Outcomes */}
      <HelpSection id="outcomes" title="Acompanhamento de Resultados" icon={AlertTriangle}>
        <WhereToFind path={["Detalhe do(a) Candidato(a)", "Aba de Resultados"]} />
        <p className="text-sm text-muted">
          Registre resultados pós-admissão dos(as) candidatos(as): notas, desempenho acadêmico, serviços de apoio utilizados, ajuste social e permanência. Esses dados ajudam a comparar as previsões da plataforma com o desempenho real.
        </p>
        <Tip>
          A aba de Resultados mostra a previsão TRI original do(a) candidato(a) ao lado dos resultados registrados, facilitando a avaliação da precisão preditiva ao longo do tempo.
        </Tip>
      </HelpSection>

      {/* Writing Review */}
      <HelpSection id="writing-review" title="Escrevendo sua Revisão" icon={MessageSquare}>
        <WhereToFind path={["Detalhe do(a) Candidato(a)", "Seção Sua Revisão (inferior)"]} />

        <Steps steps={[
          "Leia a pontuação TRI, o detalhamento por dimensão e o briefing para formar sua impressão inicial.",
          "Leia as respostas reais do(a) candidato(a) na aba de Respostas.",
          "Escreva sua avaliação na área de texto — foque no que observou e no que importa para a admissão.",
          "Selecione um nível de recomendação: Admitir / Lista de Espera / Não Admitir / Adiar / Precisa de Mais Informação.",
          "Clique em \"Submeter Revisão\" — sua revisão fica visível ao(à) administrador(a) da escola imediatamente.",
        ]} />

        <h3 className="mt-4 text-sm font-semibold">Níveis de Recomendação</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-success">Admitir</span> — Candidato(a) forte. Recomende aceitação.</p>
          <p><span className="font-medium text-warning">Lista de Espera</span> — Promissor(a) mas incerto(a). Considere se houver espaço.</p>
          <p><span className="font-medium text-review">Não Admitir</span> — Não é o ajuste certo neste momento.</p>
          <p><span className="font-medium text-primary">Adiar</span> — Informação insuficiente para decidir. Recomende reavaliação.</p>
          <p><span className="font-medium text-muted">Precisa de Mais Informação</span> — Acompanhamento específico necessário antes de qualquer decisão.</p>
        </div>

        <Tip>
          Sua revisão é um dos insumos da decisão de admissão — não o único. O(a) administrador(a) da escola vê todas as revisões ao lado das notas de entrevista e do perfil da IA ao fazer as recomendações finais.
        </Tip>
      </HelpSection>

      {/* Reports */}
      <HelpSection id="reports" title="Relatórios do Grupo" icon={FileText}>
        <WhereToFind path={["Barra Lateral", "Relatórios"]} />
        <p className="text-sm text-muted">
          A página de Relatórios mostra análises agregadas do conjunto de candidatos(as) da sua escola.
        </p>

        <div className="space-y-2">
          <StatExplainer label="Distribuição de TRI" example="Gráfico" description="Um histograma mostrando como as pontuações TRI dos seus candidatos estão distribuídas. Ajuda a entender o perfil geral de prontidão do grupo." />
          <StatExplainer label="Médias por Dimensão" example="Leitura: 68" description="Pontuações médias por dimensão em todas as sessões concluídas. Identifica se o grupo tende a ser forte ou fraco em áreas específicas." />
          <StatExplainer label="Comparação por Série" example="8º ano média: 72" description="Compara pontuações médias entre séries. Útil para entender diferenças de prontidão por faixa etária." />
        </div>
      </HelpSection>
    </div>
  );
}
