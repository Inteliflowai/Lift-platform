import { supabaseAdmin } from "@/lib/supabase/admin";

// Portuguese-localized demo data for the EduInsights deployment.
// Mirrors seedDemoSchool.ts shape exactly so the same dispatch in
// ensureDemoCandidates() can branch by locale without diverging APIs.
//
// Candidate names + content target Brazilian-Portuguese context. Task
// responses reference the same task titles that scripts/seed-pt-tasks.ts
// inserts into task_templates, so a real assessment session would
// plausibly produce these responses.

const DEMO_CANDIDATES_PT = [
  {
    first_name: "Pedro",
    last_name: "Oliveira",
    grade_band: "8" as const,
    grade_applying_to: "8",
    tri_score: 74,
    tri_label: "ready",
    tri_confidence: "high",
    reading: 81, writing: 68, reasoning: 74, math: 72, reflection: 62, persistence: 78, support_seeking: 71,
    overall_confidence: 82,
    support_level: "none" as const,
    enriched_signals: [] as { id: string; label: string; severity: string; category: string; description: string; recommendation: string; evidenceSummary: string }[],
    tasks: [
      { type: "reading_passage", title: "A Decisão de Rio Verde", response: "O texto apresenta uma tensão real entre revitalização e o risco de afastar as famílias que ficaram durante os anos difíceis. A câmara municipal aprovou o projeto e os números mostram resultados — 40 pequenos negócios e os imóveis valorizando 22%. Mas três negócios tradicionais já fecharam por causa dos novos aluguéis. Acho que a evidência mais forte para os dois lados está na frase final do texto: a cidade está sendo revitalizada ou substituída? Eu argumentaria que ambos podem ser verdade ao mesmo tempo. A revitalização cria oportunidade, mas sem políticas de proteção aos moradores antigos, a substituição é o efeito colateral previsível. Uma solução intermediária seria criar incentivos para que negócios tradicionais continuem nos prédios convertidos.", wordCount: 118, timeMs: 480000, revisionDepth: 2 },
      { type: "extended_writing", title: "A Escola Ideal", response: "Minha escola ideal não separaria as matérias do mundo real. Toda semana teríamos um projeto que conecta o que estudamos a algo da nossa cidade — talvez analisar o orçamento da prefeitura, mapear áreas de risco no bairro, ou criar uma campanha sobre um problema local. Os alunos escolheriam temas diferentes mas usariam matemática, escrita e raciocínio juntos.\n\nO espaço físico também seria diferente. Em vez de salas iguais com fileiras de carteiras, teríamos áreas para conversar em grupo, áreas silenciosas para ler e pensar, e um laboratório com ferramentas — tanto físicas quanto digitais. As mesas seriam móveis para reorganizarmos conforme a tarefa.\n\nOs professores agiriam mais como orientadores. Em vez de só explicar e cobrar, fariam perguntas que nos ajudam a chegar nas próprias respostas. A avaliação seria principalmente por portfólios e apresentações — coisas que mostram o que aprendemos de verdade, não só o que decoramos para a prova.\n\nO mais importante: cada aluno se sentiria pertencente. Algumas pessoas aprendem rápido, outras devagar, algumas em grupo, outras sozinhas. A escola ideal valorizaria todos esses jeitos.", wordCount: 178, timeMs: 600000, revisionDepth: 4 },
      { type: "reflection", title: "Como Você Aprende Melhor", response: "Aprendo melhor quando consigo conectar o conteúdo novo com algo que já entendo. Por exemplo, eu não estava entendendo equações até a professora comparar com uma balança — o que está de um lado precisa estar do outro também. Depois disso, fez sentido na hora.\n\nTambém preciso de tempo pra pensar antes de responder. Às vezes na aula a professora pergunta e quem grita primeiro responde, mas eu ainda estou processando. Quando posso escrever a resposta antes de falar, ela fica muito melhor. Aprendi que tudo bem precisar desse tempo — não significa que sou mais lento, significa que penso de outro jeito.", wordCount: 105, timeMs: 360000, revisionDepth: 1 },
      { type: "scenario", title: "O Trabalho em Grupo", response: "Primeiro, eu falaria em particular com o colega que não está respondendo. Não daria pra saber o que está acontecendo sem perguntar — talvez ele esteja com problema em casa, talvez não tenha entendido a tarefa, talvez esteja com vergonha de admitir que se atrasou. Eu mostraria que estou ali pra ajudar, não pra cobrar. Depois, com o grupo todo, eu sugeriria uma reunião curta pra alinhar: o que cada um vai fazer até quando, e como vamos juntar tudo no final. Sobre o colega que quer recomeçar — eu pediria pra ele explicar especificamente o que mudaria e por quê, antes de decidir se vale o esforço. Se a discordância for sobre algo importante, talvez valha mesmo. Se for só preferência, manteríamos o que já está pronto. O que eu não faria é dividir tudo e trabalhar separado, porque o projeto fica desigual e a gente perde a chance de aprender com os outros.", wordCount: 158, timeMs: 360000, revisionDepth: 2 },
    ],
    briefing: {
      key_observations: [
        "Pedro demonstra forte compreensão leitora, identificando a tensão central do texto e propondo soluções intermediárias sem ser solicitado.",
        "A produção escrita mostra estrutura clara e voz pessoal — Pedro consegue desenvolver ideias ao longo de parágrafos sem perder o foco.",
        "Na reflexão, Pedro articula com precisão como aprende melhor, demonstrando consciência metacognitiva acima da média para a série.",
        "No cenário em grupo, Pedro prioriza diálogo direto e empatia antes de escalar para autoridade — perfil maduro de resolução de conflitos.",
      ],
      interview_questions: [
        { question: "Conte sobre uma decisão difícil que você teve que tomar onde não havia uma resposta certa óbvia.", rationale: "A resposta de Pedro sobre Rio Verde mostra conforto com ambiguidade — vale aprofundar.", dimension: "reasoning" },
        { question: "Como você costuma se preparar para uma tarefa ou prova desafiadora?", rationale: "Pedro mencionou precisar de tempo para processar — entender suas estratégias de estudo.", dimension: "reflection" },
        { question: "Descreva um trabalho em grupo que deu certo e outro que deu errado. O que fez a diferença?", rationale: "A resposta ao cenário sugere habilidades interpessoais fortes — confirmar com exemplos reais.", dimension: "support_seeking" },
      ],
      areas_to_explore: ["Expressão escrita poderia ser mais desenvolvida — explorar se Pedro escreve mais em contextos de baixa pressão", "Reflexão é a dimensão mais baixa — pode se beneficiar de práticas estruturadas de autoavaliação"],
      strengths_to_confirm: ["Compreensão leitora aparenta ser forte", "Abordagem para resolução de problemas é madura para a série"],
      confidence_explanation: "Alta confiança neste perfil. As respostas de Pedro são internamente consistentes e os sinais comportamentais alinham com as pontuações por dimensão.",
    },
  },
  {
    first_name: "Mariana",
    last_name: "Tanaka",
    grade_band: "9-11" as const,
    grade_applying_to: "10",
    tri_score: 61,
    tri_label: "ready",
    tri_confidence: "moderate",
    reading: 58, writing: 55, reasoning: 69, math: 63, reflection: 48, persistence: 52, support_seeking: 44,
    overall_confidence: 64,
    support_level: "watch" as const,
    enriched_signals: [
      { id: "slow_reading_pace", label: "Tempo de Leitura Estendido", severity: "notable", category: "reading", description: "Tempo significativamente maior que o esperado nas passagens de leitura em múltiplas tarefas.", recommendation: "Considerar se tempo estendido em avaliações pode ser apropriado.", evidenceSummary: "Observado em 3 de 4 passagens de leitura." },
      { id: "high_writing_deletion", label: "Alta Revisão na Expressão Escrita", severity: "advisory", category: "writing", description: "Apagou e reescreveu uma porção significativa das respostas escritas.", recommendation: "Apoio em expressão escrita pode beneficiar a estudante.", evidenceSummary: "Observado em 2 tarefas de escrita." },
    ],
    tasks: [
      { type: "reading_passage", title: "A Questão da Automação", response: "O texto fala sobre a empresa que substituiu 60% da equipe por automação. A produtividade subiu 35% e os erros caíram. Mas dos 200 trabalhadores deslocados, só 30 conseguiram ser realocados com salário maior. Os outros 155 receberam três meses de indenização. Seis meses depois, 35% ainda estavam desempregados. Acho que dizer que a automação foi positiva no geral depende muito de quem você está olhando. Para a empresa e os acionistas (ações subiram 18%), foi positiva. Para os 30 realocados com salário melhor, também. Mas para os 155 desempregados ou em trabalhos piores, foi devastador. O texto não fala se a indenização foi suficiente, ou se há programa público de requalificação na cidade. Essas informações fortaleceriam ou enfraqueceriam o argumento dependendo da resposta. Eu acho que precisamos de políticas que protejam os trabalhadores antes da empresa decidir automatizar — não depois.", wordCount: 152, timeMs: 900000, revisionDepth: 6 },
      { type: "extended_writing", title: "Um Sistema que Você Mudaria", response: "Mudaria o sistema de avaliação nas escolas. Hoje quase tudo gira em torno de provas e tarefas pra casa. Quem vai bem em prova parece ser bom aluno, mas isso não mostra tudo. Conheço pessoas que entendem a matéria, conseguem explicar, fazem projetos incríveis, mas travam na hora da prova. E o sistema diz que elas não aprenderam.\n\nO problema persiste porque medir conhecimento por prova é fácil e barato. Você dá a mesma prova pra trinta pessoas e tem trinta notas em uma hora. Avaliar projetos, apresentações, portfólios — leva muito mais tempo do professor.\n\nMinha proposta seria misturar os dois jeitos. Manter algumas provas, mas dar peso igual a portfólios e projetos onde o aluno aplica o que aprendeu. Também avaliar progresso, não só nota final. Se alguém começou o ano com nota baixa e terminou com nota boa, isso é aprendizado real e deveria contar.\n\nUma objeção possível é que sem prova padronizada não dá pra comparar entre escolas. Concordo que é um problema, mas a comparação atual também é injusta — uma prova não mede tudo.", wordCount: 178, timeMs: 840000, revisionDepth: 8 },
      { type: "reflection", title: "Crescimento Intelectual", response: "Antes eu pensava que ser inteligente significava saber muita coisa e tirar nota boa. Hoje penso diferente. Acho que ser inteligente é saber lidar com o que você ainda não entende. Minha professora de matemática do ano passado dizia que errar é parte de aprender, e isso mudou como encaro problema difícil. Antes eu desistia rápido se não conseguia. Hoje persisto mais, mesmo errando várias vezes. Mas ainda tenho dificuldade de pedir ajuda quando travo. Sinto que admitir que não consigo é admitir que não sou inteligente — sei que é bobagem mas é o que sinto na hora.", wordCount: 102, timeMs: 720000, revisionDepth: 4 },
      { type: "scenario", title: "O Comitê de Ética", response: "Minha recomendação ao comitê seria não punir o aluno desta vez, mas usar o caso para criar uma política clara. O código de honra atual proíbe entregar trabalho que não é seu — mas com IA o que é 'seu' ficou complicado. 40% de sobreposição é muito, mas se o aluno editou substancialmente os outros 60%, a contribuição original existe. Eu pediria para o aluno explicar oralmente as ideias da redação. Se ele consegue defender o raciocínio, ele entendeu o tema mesmo tendo usado IA pra começar. Se não consegue, aí sim é problema.\n\nPara atualizar o código de honra, a escola deveria ser específica: definir quanto de uso de IA é aceitável (talvez para brainstorm sim, para escrita final não), exigir que alunos declarem quando usaram IA e como, e criar uma forma de avaliar a redação não só pelo texto entregue mas também pela capacidade do aluno de defender o conteúdo. Isso resolve a parte ética e também cria oportunidade de aprendizado real.", wordCount: 168, timeMs: 480000, revisionDepth: 5 },
    ],
    briefing: {
      key_observations: [
        "Mariana mostra um descompasso significativo entre raciocínio (dimensão mais forte) e expressão escrita. As ideias frequentemente são mais sofisticadas do que a escrita que as transmite.",
        "As passagens de leitura exigiram tempo substancialmente maior que o esperado, e Mariana releu trechos múltiplas vezes. O padrão apareceu consistentemente nas tarefas.",
        "Alta profundidade de revisão na escrita — Mariana frequentemente apagou e reescreveu frases, sugerindo dificuldade com expressão de primeiro rascunho mais do que falta de ideias.",
        "Na reflexão, Mariana mencionou explicitamente dificuldade em pedir ajuda. A pontuação baixa em busca de apoio pode refletir essa autopercepção.",
      ],
      interview_questions: [
        { question: "Quando você está lendo algo difícil, que estratégias usa para entender?", rationale: "Os sinais de tempo de leitura sugerem que Mariana pode se beneficiar de estratégias explícitas de compreensão.", dimension: "reading" },
        { question: "Conte sobre seu processo de escrita. Como você sai de uma ideia até um texto pronto?", rationale: "Alta revisão sugere processo não-linear — entender isso ajuda no plano de apoio.", dimension: "writing" },
        { question: "Quando você trava num problema na aula, o que costuma fazer?", rationale: "Pontuação baixa em busca de apoio precisa de investigação — independência ou evitação?", dimension: "support_seeking" },
      ],
      areas_to_explore: ["Velocidade de processamento de leitura — pode se beneficiar de tempo estendido em avaliações", "Apoio em escrita — o descompasso entre ideias e expressão merece atenção", "Comportamento de busca de ajuda — determinar se é força (independência) ou preocupação (evitação)"],
      strengths_to_confirm: ["Raciocínio forte e pensamento ético maduro", "Mentalidade de crescimento evidente na reflexão", "Engajamento genuíno com temas complexos"],
      confidence_explanation: "Confiança moderada. Os sinais de tempo de leitura são consistentes, mas podem refletir engajamento profundo em vez de dificuldade. A entrevista deve esclarecer.",
    },
  },
  {
    first_name: "Helena",
    last_name: "Costa",
    grade_band: "6-7" as const,
    grade_applying_to: "7",
    tri_score: 88,
    tri_label: "thriving",
    tri_confidence: "high",
    reading: 91, writing: 84, reasoning: 87, math: 85, reflection: 82, persistence: 93, support_seeking: 88,
    overall_confidence: 91,
    support_level: "none" as const,
    enriched_signals: [],
    tasks: [
      { type: "reading_passage", title: "O Novo Playground", response: "A cidade escolheu a opção do meio porque ela equilibrou o desejo de ter algo novo (o muro de escalada) com o que cabia no orçamento de R$250.000. Custou R$240.000, então sobrou um pouco. Acho que foi uma boa decisão por dois motivos. Primeiro, ela ouviu os dois grupos de pais — não ignorou ninguém. Segundo, foi realista com o dinheiro disponível. A área aquática teria custado muito mais e eles teriam que cortar de outro lugar pra pagar. Talvez a próxima reforma possa adicionar a área aquática quando tiver mais orçamento. Decisões em cidade são assim: nem sempre dá pra ter tudo, mas dá pra escolher o melhor possível.", wordCount: 116, timeMs: 360000, revisionDepth: 2 },
      { type: "extended_writing", title: "Meu Dia Perfeito", response: "Meu dia perfeito começaria cedo, antes do sol nascer. Eu pegaria minha bicicleta e iria até o lago perto da casa da minha avó. Tem uma neblina que sobe da água de manhãzinha que parece que o mundo inteiro está acordando junto comigo. Sentaria num banco e desenharia o que vejo até o sol esquentar.\n\nDepois do café — minha avó faz o melhor pão de queijo do mundo, com manteiga de verdade — eu passaria a manhã trabalhando no meu projeto. Estou escrevendo um livro sobre uma menina que descobre que pode conversar com as árvores. As árvores contam histórias do que aconteceu no bairro há cem anos atrás. Cada capítulo é uma árvore diferente, com uma história diferente.\n\nÀ tarde, iria pra casa da minha amiga Júlia. A gente está construindo um robô pra feira de ciências, que separa lixo reciclável. Ela faz a parte da fiação e eu faço a programação. A gente já errou várias vezes mas está perto de funcionar.\n\nMeu dia terminaria assistindo um filme com toda minha família, todo mundo amontoado no sofá. Provavelmente algo engraçado. Eu adormeceria sabendo que amanhã também vai ser bom.", wordCount: 195, timeMs: 540000, revisionDepth: 3 },
      { type: "reflection", title: "Quando as Coisas São Difíceis", response: "Ano passado eu fiz audição pro coral da escola e não passei. Tinha treinado a música por duas semanas. Fiquei muito triste — chorei na hora e quis desistir de música pra sempre.\n\nMas meu pai disse uma coisa que ficou na minha cabeça: 'às vezes as coisas que mais decepcionam a gente ensinam o mais.' Então pensei em desistir mas depois resolvi pedir pra regente se podia ajudar de outra forma. Ela me ofereceu trabalhar como assistente — organizar partituras, ajudar nos ensaios, marcar entradas. Acabei aprendendo muito mais sobre música do que aprenderia só cantando. Esse ano vou tentar de novo, e mesmo se não passar, sei que vou continuar envolvida.\n\nA parte mais difícil não foi a rejeição — foi escolher continuar envolvida em vez de ir embora. Tô feliz que escolhi ficar.", wordCount: 145, timeMs: 420000, revisionDepth: 2 },
      { type: "short_response", title: "Um Momento Surpreendente", response: "O mais surpreendente que aprendi esse ano foi que polvos têm três corações e sangue azul. Minha professora de ciências mostrou um vídeo de um polvo resolvendo um quebra-cabeça pra pegar comida, e mudou como eu penso sobre inteligência. Só porque algo é diferente da gente não significa que não é inteligente. Agora fico pensando em quantos animais resolvem problemas de jeitos que a gente nem percebe.", wordCount: 71, timeMs: 270000, revisionDepth: 1 },
    ],
    briefing: {
      key_observations: [
        "Helena demonstra persistência excepcional — engajou-se profundamente em cada tarefa e mostrou esforço consistente ao longo de toda a sessão.",
        "A expressão escrita é vívida e pessoal. Helena usa detalhes específicos (pão de queijo da avó, livro sobre árvores que falam) que mostram voz genuína e criatividade.",
        "Forte evidência de consciência metacognitiva na tarefa de reflexão. Helena consegue traçar o arco emocional de uma decepção e identificar o que aprendeu com ela.",
        "Compreensão leitora é a dimensão mais forte — Helena identificou o equilíbrio central no texto do playground e propôs uma solução criativa sem ser solicitada.",
      ],
      interview_questions: [
        { question: "Conte mais sobre seu livro. O que te inspirou a ideia de uma menina que conversa com as árvores?", rationale: "Helena mencionou esse projeto sem ser perguntada — é uma janela para o pensamento criativo e iniciativa dela.", dimension: "writing" },
        { question: "Você falou que está construindo um robô com sua amiga Júlia. Qual foi a parte mais difícil desse projeto?", rationale: "Isto revela como Helena lida com desafios técnicos e colabora.", dimension: "reasoning" },
        { question: "Se você pudesse criar uma matéria que não existe na sua escola, qual seria?", rationale: "Helena mostra pensamento criativo e divergente — esta pergunta a deixa demonstrar isso em entrevista.", dimension: "reflection" },
      ],
      areas_to_explore: ["Auto-defesa acadêmica é forte mas vale verificar — Helena pede ajuda quando realmente trava ou tende a resolver sozinha?"],
      strengths_to_confirm: ["Persistência e resiliência excepcionais", "Voz criativa na escrita", "Curiosidade intelectual genuína"],
      confidence_explanation: "Alta confiança. Os dados de sessão de Helena são internamente consistentes, os sinais comportamentais mostram engajamento sustentado, e não há padrões de preocupação.",
    },
  },
];

export async function ensureDemoCandidatesPt(tenantId: string): Promise<void> {
  // Skip if demo already populated (same threshold as EN seeder)
  const { count: profileCount } = await supabaseAdmin
    .from("insight_profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { count: taskCount } = await supabaseAdmin
    .from("task_instances")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if ((profileCount ?? 0) >= 3 && (taskCount ?? 0) >= 6) return;

  // Clean up bare demo stubs (same logic as EN)
  const { data: existingCandidates } = await supabaseAdmin
    .from("candidates")
    .select("id, sessions(id)")
    .eq("tenant_id", tenantId);

  for (const c of existingCandidates ?? []) {
    const sessions = c.sessions as unknown as { id: string }[];
    if (!sessions || sessions.length === 0) {
      await supabaseAdmin.from("candidates").delete().eq("id", c.id);
      continue;
    }
    const { count: tiCount } = await supabaseAdmin
      .from("task_instances")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessions[0].id);
    if ((tiCount ?? 0) === 0) {
      await supabaseAdmin.from("candidates").delete().eq("id", c.id);
    }
  }

  console.log("[demo-pt] Seeding PT demo data for tenant:", tenantId);

  // Find or create active cycle (PT-named)
  let cycleId: string | null = null;
  const { data: activeCycle } = await supabaseAdmin
    .from("application_cycles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (activeCycle) {
    cycleId = activeCycle.id;
  } else {
    const year = new Date().getFullYear();
    const { data: newCycle } = await supabaseAdmin
      .from("application_cycles")
      .insert({
        tenant_id: tenantId,
        name: `${year}-${year + 1} Processo Seletivo`,
        academic_year: `${year}-${year + 1}`,
        status: "active",
      })
      .select("id")
      .single();
    cycleId = newCycle?.id ?? null;
  }

  for (const c of DEMO_CANDIDATES_PT) {
    const { data: candidate, error: candErr } = await supabaseAdmin
      .from("candidates")
      .insert({
        tenant_id: tenantId,
        cycle_id: cycleId,
        first_name: c.first_name,
        last_name: c.last_name,
        grade_band: c.grade_band,
        grade_applying_to: c.grade_applying_to,
        status: "completed",
        is_demo: true,
      })
      .select("id")
      .single();

    if (candErr || !candidate) { console.error("[demo-pt] candidate error:", c.first_name, candErr); continue; }

    const completedAt = new Date(Date.now() - (1 + Math.random() * 3) * 24 * 60 * 60 * 1000);
    const sessionDurationMs = c.tasks.reduce((sum, t) => sum + t.timeMs, 0);
    const startedAt = new Date(completedAt.getTime() - sessionDurationMs);

    const { data: session, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .insert({
        candidate_id: candidate.id,
        tenant_id: tenantId,
        cycle_id: cycleId,
        grade_band: c.grade_band,
        status: "completed",
        completion_pct: 100,
        completed_at: completedAt.toISOString(),
        started_at: startedAt.toISOString(),
        last_activity_at: completedAt.toISOString(),
      })
      .select("id")
      .single();

    if (sessErr || !session) { console.error("[demo-pt] session error:", c.first_name, sessErr); continue; }

    let taskTime = startedAt.getTime();
    for (let i = 0; i < c.tasks.length; i++) {
      const task = c.tasks[i];
      const taskStarted = new Date(taskTime);
      const taskCompleted = new Date(taskTime + task.timeMs);
      taskTime = taskCompleted.getTime() + 10000;

      const { data: ti } = await supabaseAdmin
        .from("task_instances")
        .insert({
          session_id: session.id,
          tenant_id: tenantId,
          sequence_order: i + 1,
          status: "completed",
          started_at: taskStarted.toISOString(),
          completed_at: taskCompleted.toISOString(),
        })
        .select("id")
        .single();

      if (!ti) continue;

      const { data: rt } = await supabaseAdmin
        .from("response_text")
        .insert({
          task_instance_id: ti.id,
          session_id: session.id,
          tenant_id: tenantId,
          response_body: task.response,
          word_count: task.wordCount,
          submitted_at: taskCompleted.toISOString(),
        })
        .select("id")
        .single();

      if (rt) {
        await supabaseAdmin.from("response_features").insert({
          response_text_id: rt.id,
          session_id: session.id,
          tenant_id: tenantId,
          sentence_count: Math.ceil(task.wordCount / 15),
          avg_sentence_length: 15 + Math.random() * 5,
          lexical_diversity: 0.55 + Math.random() * 0.2,
          evidence_marker_count: Math.floor(Math.random() * 4),
          revision_depth: task.revisionDepth,
        });
      }

      await supabaseAdmin.from("timing_signals").insert([
        { session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId, signal_type: "task_duration", value_ms: task.timeMs, occurred_at: taskCompleted.toISOString() },
        { session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId, signal_type: "reading_time", value_ms: Math.floor(task.timeMs * (0.2 + Math.random() * 0.15)), occurred_at: taskStarted.toISOString() },
      ]);

      const hintChance = c.support_seeking > 70 ? 0.5 : c.support_seeking > 50 ? 0.3 : 0.05;
      if (Math.random() < hintChance) {
        await supabaseAdmin.from("help_events").insert({
          session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId,
          event_type: "hint_requested",
          occurred_at: new Date(taskStarted.getTime() + task.timeMs * 0.6).toISOString(),
        });
      }

      await supabaseAdmin.from("interaction_signals").insert([
        { session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId, signal_type: "keystroke_count", payload: { count: task.wordCount * 5 + Math.floor(Math.random() * 50) }, occurred_at: taskCompleted.toISOString() },
        { session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId, signal_type: "backspace_count", payload: { count: task.revisionDepth * 8 + Math.floor(Math.random() * 20) }, occurred_at: taskCompleted.toISOString() },
      ]);

      await supabaseAdmin.from("session_events").insert([
        { session_id: session.id, tenant_id: tenantId, event_type: "task_started", task_instance_id: ti.id, occurred_at: taskStarted.toISOString() },
        { session_id: session.id, tenant_id: tenantId, event_type: "task_completed", task_instance_id: ti.id, occurred_at: taskCompleted.toISOString() },
      ]);
    }

    const { data: profile } = await supabaseAdmin
      .from("insight_profiles")
      .insert({
        session_id: session.id,
        candidate_id: candidate.id,
        tenant_id: tenantId,
        reading_score: c.reading,
        writing_score: c.writing,
        reasoning_score: c.reasoning,
        math_score: c.math,
        reflection_score: c.reflection,
        persistence_score: c.persistence,
        support_seeking_score: c.support_seeking,
        overall_confidence: c.overall_confidence,
        tri_score: c.tri_score,
        tri_label: c.tri_label,
        tri_confidence: c.tri_confidence,
        is_final: true,
        requires_human_review: c.support_level === "watch",
        internal_narrative: `${c.first_name} demonstrou prontidão ${c.tri_label === "thriving" ? "forte" : c.tri_label === "ready" ? "sólida" : "em desenvolvimento"} nas dimensões avaliadas. ${c.enriched_signals.length > 0 ? `${c.enriched_signals.length} padrão(ões) comportamental(is) sinalizado(s) para análise profissional.` : "Nenhum padrão comportamental de preocupação foi detectado."}`,
        family_narrative: `${c.first_name} concluiu um conjunto de atividades de leitura, escrita e raciocínio como parte do processo. Os resultados sugerem ${c.tri_label === "thriving" ? "preparação forte" : c.tri_label === "ready" ? "preparação sólida" : "áreas onde apoio adicional pode ser útil"} para a transição a um novo ambiente escolar.`,
      })
      .select("id")
      .single();

    if (profile) {
      const { data: lss } = await supabaseAdmin.from("learning_support_signals").insert({
        session_id: session.id,
        candidate_id: candidate.id,
        tenant_id: tenantId,
        signal_count: c.enriched_signals.length,
        support_indicator_level: c.support_level,
        enriched_signals: c.enriched_signals,
        enriched_signal_count: c.enriched_signals.length,
        has_notable_signals: c.enriched_signals.some((s) => s.severity === "notable"),
        high_revision_depth: c.writing < 60,
        low_reading_dwell: c.support_level === "watch",
        short_written_output: false,
        high_response_latency: false,
        task_abandonment_pattern: false,
        hint_seeking_high: false,
        planning_task_difficulty: false,
        reasoning_writing_gap: c.reasoning > c.writing + 15,
      }).select("id").single();

      if (lss) {
        await supabaseAdmin.from("insight_profiles")
          .update({ learning_support_signal_id: lss.id })
          .eq("id", profile.id);
      }
    }

    await supabaseAdmin.from("evaluator_briefings").insert({
      candidate_id: candidate.id,
      tenant_id: tenantId,
      key_observations: c.briefing.key_observations,
      interview_questions: c.briefing.interview_questions,
      areas_to_explore: c.briefing.areas_to_explore,
      strengths_to_confirm: c.briefing.strengths_to_confirm,
      confidence_explanation: c.briefing.confidence_explanation,
    });

    console.log("[demo-pt] Seeded:", c.first_name, "—", c.tasks.length, "tasks,", c.briefing.key_observations.length, "observations");
  }
}
