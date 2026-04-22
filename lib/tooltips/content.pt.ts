import type { TooltipContent } from "./content";

// Portuguese (Brazilian) tooltip dictionary for the EduInsights deployment.
// Shape mirrors lib/tooltips/content.ts exactly — same keys, same ids,
// same learnMoreHref + roles fields. Only `title` and `body` differ.
// Consumers should use useTooltips() (lib/tooltips/useTooltips.ts) to
// dispatch by locale rather than importing this file directly.

export const TOOLTIPS_PT: Record<string, TooltipContent> = {
  // ── TRI Score ──
  tri_score: {
    id: "tri_score",
    title: "Índice de Prontidão para Transição (TRI)",
    body: "Uma pontuação composta (0–100) em 6 dimensões de prontidão. Mostra o quanto um(a) estudante aparenta estar preparado(a) para as exigências acadêmicas e sociais de uma nova escola — não mede inteligência nem potencial. Não é uma nota de aprovado/reprovado.",
    learnMoreHref: "/help/evaluator#tri-score",
  },

  // ── 7 Dimensions ──
  dim_reading: {
    id: "dim_reading",
    title: "Interpretação de Leitura",
    body: "Como o(a) estudante se engaja com textos — se localiza evidências, faz inferências e constrói sentido a partir de passagens do nível da série. Reflete estratégia de compreensão, não velocidade de leitura.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_writing: {
    id: "dim_writing",
    title: "Expressão Escrita",
    body: "Clareza, estrutura e voz na produção escrita. A avaliação captura como as ideias se desenvolvem ao longo dos rascunhos e quanto o(a) estudante revisa — não apenas a contagem final de palavras.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_reasoning: {
    id: "dim_reasoning",
    title: "Raciocínio e Estruturação de Problemas",
    body: "Como o(a) estudante aborda problemas desconhecidos — se identifica padrões, organiza informações e constrói uma solução. Distinto de conhecimento prévio.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_reflection: {
    id: "dim_reflection",
    title: "Reflexão e Metacognição",
    body: "Consciência do próprio processo de pensamento. Estudantes que conseguem nomear desafios, avaliar o próprio trabalho e planejar os próximos passos tendem a fazer transições mais bem-sucedidas.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_persistence: {
    id: "dim_persistence",
    title: "Persistência na Tarefa",
    body: "Engajamento sustentado diante de desafios. Medido pela profundidade de revisão, tempo na tarefa e se o(a) estudante retorna a itens difíceis em vez de pulá-los.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_math: {
    id: "dim_math",
    title: "Raciocínio Matemático",
    body: "Como o(a) estudante aborda problemas quantitativos — precisão, estruturação do problema, reconhecimento de padrões e capacidade de explicar o raciocínio matemático. Pontuado no nível da série, não por dificuldade absoluta.",
    learnMoreHref: "/help/evaluator#dimensions",
  },
  dim_advocacy: {
    id: "dim_advocacy",
    title: "Autoadvocacia Acadêmica",
    body: "Como o(a) estudante busca apoio quando trava — se usa dicas, pede esclarecimentos ou recorre às ferramentas disponíveis. Um forte indicador de quão bem pedirá ajuda em um novo ambiente.",
    learnMoreHref: "/help/evaluator#dimensions",
  },

  // ── Learning Support Signals ──
  learning_support_signals: {
    id: "learning_support_signals",
    title: "Sinais de Apoio à Aprendizagem",
    body: "A plataforma detecta 9 padrões comportamentais observados durante a sessão — incluindo ritmo de leitura, profundidade de revisão e abandono de tarefas. Quando os padrões aparecem, são sinalizados para acompanhamento profissional. São observações, não diagnósticos.",
    learnMoreHref: "/help/evaluator#enriched-signals",
  },
  signal_severity_advisory: {
    id: "signal_severity_advisory",
    title: "Sinal Informativo",
    body: "Um padrão que vale mencionar na conversa sobre o(a) candidato(a). Não exige ação imediata, mas vale explorar — especialmente se alinhar com algo da inscrição.",
  },
  signal_severity_notable: {
    id: "signal_severity_notable",
    title: "Sinal Destacado",
    body: "Um padrão comportamental mais forte que justifica uma conversa direta com a família e encaminhamento à equipe de apoio à aprendizagem antes da chegada do(a) estudante.",
  },

  // ── Evaluator Intelligence ──
  evaluator_intelligence: {
    id: "evaluator_intelligence",
    title: "Inteligência para o(a) Avaliador(a)",
    body: "Briefing gerado por IA preparado especificamente para a entrevista deste(a) candidato(a). Inclui observações extraídas dos dados da sessão, perguntas de entrevista personalizadas e áreas para explorar. Gerado do zero para cada candidato(a).",
    learnMoreHref: "/help/evaluator#briefing",
  },
  pre_interview_briefing: {
    id: "pre_interview_briefing",
    title: "Briefing Pré-Entrevista",
    body: "Leia antes de encontrar o(a) candidato(a). Indica o que observar, o que aprofundar e onde os dados da sessão sugerem conversa mais profunda. Específico para este(a) candidato(a) — não é um modelo genérico.",
  },
  post_interview_synthesis: {
    id: "post_interview_synthesis",
    title: "Síntese Pós-Entrevista",
    body: "Gerada após você preencher a rubrica do(a) avaliador(a). Combina dados comportamentais da sessão com suas observações da entrevista para produzir uma recomendação de colocação holística.",
  },

  // ── Evaluator Rubric ──
  evaluator_rubric: {
    id: "evaluator_rubric",
    title: "Rubrica do(a) Avaliador(a)",
    body: "Sua pontuação estruturada do(a) candidato(a) após a entrevista. Preenche o contexto humano que a sessão não captura — linguagem corporal, comunicação oral, ajuste à cultura da sua escola.",
    learnMoreHref: "/help/evaluator#writing-review",
  },

  // ── School Admin Concepts ──
  admissions_cycle: {
    id: "admissions_cycle",
    title: "Ciclo de Admissões",
    body: "Um período definido de atividade de admissões (ex.: Processo 2025-2026). Todos os candidatos, sessões e avaliações pertencem a um ciclo. Você pode ter múltiplos ciclos abertos simultaneamente.",
    learnMoreHref: "/help/school_admin#cycles",
  },
  session_token: {
    id: "session_token",
    title: "Link da Sessão do(a) Candidato(a)",
    body: "Uma URL única e segura para este(a) candidato(a). Envie diretamente — não é preciso criar conta. O link é de uso único e vinculado apenas a este(a) candidato(a).",
  },
  grade_band: {
    id: "grade_band",
    title: "Série/Ano",
    body: "A plataforma entrega automaticamente tarefas apropriadas à idade com base na série/ano ao qual o(a) estudante se candidata. 6º–7º, 8º e 9º–11º têm experiências distintas projetadas para cada fase de desenvolvimento.",
  },
  completion_rate: {
    id: "completion_rate",
    title: "Taxa de Conclusão",
    body: "A porcentagem de tarefas disponíveis que este(a) candidato(a) concluiu. Uma taxa baixa pode ser um sinal em si — pode refletir gestão de tempo, desengajamento ou dificuldade técnica.",
  },

  // ── Support Plan ──
  support_plan: {
    id: "support_plan",
    title: "Plano de Apoio",
    body: "Um plano de integração de 90 dias gerado para candidatos(as) admitidos(as). Contém intervenções recomendadas mapeadas aos padrões comportamentais específicos observados na sessão. Entregue à equipe de apoio à aprendizagem antes da chegada do(a) estudante.",
    learnMoreHref: "/help/school_admin#support-plans",
  },

  // ── Outcome Tracking ──
  outcome_tracking: {
    id: "outcome_tracking",
    title: "Acompanhamento de Resultados",
    body: "Registre como estudantes admitidos(as) realmente se saem após a matrícula. A plataforma compara resultados reais com as previsões do TRI para gerar um relatório de precisão — demonstrando o valor ao conselho ao longo do tempo.",
    learnMoreHref: "/help/school_admin#outcome-tracking",
  },

  // ── Session & Signals ──
  hint_usage: {
    id: "hint_usage",
    title: "Uso de Dicas",
    body: "Com que frequência este(a) candidato(a) pediu dicas durante a sessão. Baixo = trabalhou de forma independente. Moderado = pediu ocasionalmente. Alto = pediu com frequência — pode se beneficiar de apoio adicional.",
  },
  task_count: {
    id: "task_count",
    title: "Tarefas da Sessão",
    body: "O número de tarefas na experiência de sessão deste(a) candidato(a). A quantidade varia conforme a série/ano e a configuração da sessão.",
  },
  tri_distribution: {
    id: "tri_distribution",
    title: "Distribuição de Prontidão",
    body: "Mostra como os níveis de prontidão dos seus candidatos estão distribuídos. Prontidão Forte = TRI 75+, Em Desenvolvimento = TRI 50-74, Emergente = abaixo de 50. Não é aprovado/reprovado — mostra o perfil de prontidão do grupo.",
  },
  readiness_level: {
    id: "readiness_level",
    title: "Nível de Prontidão",
    body: "Baseado no Índice de Prontidão para Transição (TRI). Prontidão Forte = sinais fortes na maioria das dimensões. Em Desenvolvimento = sinais sólidos com algumas áreas em crescimento. Emergente = várias dimensões ainda em desenvolvimento — pode se beneficiar de apoio adicional.",
  },
  fit_notes: {
    id: "fit_notes",
    title: "Notas de Ajuste",
    body: "Notas da sua escola sobre o ajuste do(a) candidato(a) além das pontuações de prontidão — necessidades atléticas, talentos artísticos, histórico familiar, bolsa ou qualquer outro fator considerado pelo comitê.",
  },

  // ── Cohort View ──
  cohort_tri_avg: {
    id: "cohort_tri_avg",
    title: "TRI Médio",
    body: "A média do Índice de Prontidão para Transição entre todos os candidatos que concluíram neste ciclo. Use como referência — pontuações individuais acima ou abaixo dessa média merecem um olhar mais atento.",
  },
  cohort_signals: {
    id: "cohort_signals",
    title: "Sinais de Apoio",
    body: "Candidatos(as) sinalizados(as) com um ou mais padrões comportamentais que podem justificar uma conversa sobre apoio à aprendizagem. Não é algo negativo — ajuda sua equipe a se planejar antes da chegada do(a) estudante.",
  },

  // ── Observation Notes ──
  sentiment_confirms: {
    id: "sentiment_confirms",
    title: "Confirma",
    body: "A entrevista confirmou o que foi observado na sessão. O(a) candidato(a) se comportou de forma consistente nos dois contextos — um forte sinal de desempenho autêntico.",
  },
  sentiment_contradicts: {
    id: "sentiment_contradicts",
    title: "Contradiz",
    body: "A entrevista mostrou algo diferente da sessão. Não é necessariamente preocupante — pode refletir ansiedade de teste, um contexto diferente ou crescimento desde a sessão.",
  },
  sentiment_expands: {
    id: "sentiment_expands",
    title: "Amplia",
    body: "A entrevista trouxe nuances que a sessão não captura — contexto, motivação ou qualidades interpessoais que aprofundam a compreensão deste(a) candidato(a).",
  },
  sentiment_unclear: {
    id: "sentiment_unclear",
    title: "Inconclusivo",
    body: "A entrevista não confirmou nem contradisse claramente esta observação. Anote para acompanhamento ou conversa adicional com o(a) candidato(a) ou a família.",
  },

  // ── Application Data ──
  application_data: {
    id: "application_data",
    title: "Dados da Inscrição",
    body: "Informações da escola sobre este(a) candidato(a) — notas, resultados de provas, recomendações de professores — exibidas ao lado dos dados da sessão para que os(as) avaliadores(as) vejam tudo em um só lugar.",
  },
  recommendation_sentiment: {
    id: "recommendation_sentiment",
    title: "Sentimento da Recomendação",
    body: "Um resumo rápido do tom da recomendação do(a) professor(a) ou orientador(a). Forte = endosso entusiasmado, Positivo = apoiador, Neutro = factual/padrão, Misto = preocupações ao lado de pontos fortes.",
  },

  // ── Committee Report ──
  committee_report: {
    id: "committee_report",
    title: "Informe do Comitê",
    body: "Um resumo de uma página pronto para impressão, desenhado para a reunião do comitê de admissões. Narrativa gerada por IA combinando dados da plataforma com observações da entrevista. Confidencial — não é para famílias.",
  },

  // ── Trial-specific banners ──
  trial_invite_first_candidate: {
    id: "trial_invite_first_candidate",
    title: "Convide seu primeiro(a) candidato(a)",
    body: "A forma mais rápida de avaliar a plataforma é rodar uma sessão real. Convide um(a) colega para fazer uma sessão de teste como candidato(a) de prática — leva 45 minutos e mostra imediatamente o que seus(suas) avaliadores(as) verão.",
    learnMoreHref: "/help/school_admin#candidates",
    roles: ["school_admin"],
  },
  trial_explore_evaluator: {
    id: "trial_explore_evaluator",
    title: "Explore o Espaço do(a) Avaliador(a)",
    body: "Após uma sessão ser concluída, mude para a visão de avaliador(a) para ver a camada completa de inteligência — pontuação TRI, detalhamento por dimensão, briefing pré-entrevista e Sinais de Apoio à Aprendizagem.",
    learnMoreHref: "/help/evaluator",
    roles: ["school_admin"],
  },
  trial_family_report: {
    id: "trial_family_report",
    title: "Experimente o Relatório para a Família",
    body: "Gere um Relatório para a Família a partir de qualquer sessão concluída para ver o que você entregaria aos responsáveis. Com a marca da escola, redigido por IA, tom acolhedor — sem linguagem clínica.",
    roles: ["school_admin", "evaluator"],
  },
};
