"use client";

import {
  Briefcase,
  FileCheck,
  MessageSquare,
  Brain,
  ClipboardCheck,
} from "lucide-react";
import {
  HelpSection,
  Steps,
  WhereToFind,
  Tip,
  StatExplainer,
  TableOfContents,
} from "../components/HelpUI";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function InterviewerHelpPt() {
  const { t } = useLocale();
  const toc = [
    { id: "cases", label: "Suas Entrevistas" },
    { id: "preparing", label: "Preparando-se para uma Entrevista" },
    { id: "rubric", label: "Usando a Rubrica da Entrevista" },
    { id: "notes", label: "Submetendo Notas de Entrevista" },
    { id: "synthesis", label: "Síntese da Entrevista" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("help.interviewer.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("help.interviewer.subtitle")}
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Cases */}
      <HelpSection id="cases" title="Suas Entrevistas" icon={Briefcase} defaultOpen>
        <WhereToFind path={["Barra Lateral", "Minhas Entrevistas"]} />
        <p className="text-sm text-muted">
          A página de Entrevistas lista os(as) candidatos(as) atribuídos(as) a você. Cada cartão mostra nome, série, pontuação TRI e status da entrevista.
        </p>

        <h3 className="text-sm font-semibold">Status das Entrevistas</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-primary">Agendada</span> — A entrevista está planejada. Clique para ver o briefing da IA e se preparar.</p>
          <p><span className="font-medium text-warning">Em Andamento</span> — Você começou mas ainda não submeteu as notas.</p>
          <p><span className="font-medium text-success">Concluída</span> — Notas e pontuações da rubrica submetidas.</p>
        </div>
      </HelpSection>

      {/* Preparing */}
      <HelpSection id="preparing" title="Preparando-se para uma Entrevista" icon={Brain}>
        <p className="text-sm text-muted">
          A plataforma gera um briefing personalizado para cada candidato(a) com base na sessão de avaliação. É a coisa mais importante a ler antes da entrevista.
        </p>

        <Steps steps={[
          "Abra o(a) candidato(a) pela sua página de Entrevistas.",
          "Leia o Briefing de Inteligência do(a) Avaliador(a) no topo.",
          "Note as Observações-Chave — são específicas para este(a) candidato(a), não genéricas.",
          "Revise as Perguntas Sugeridas para Entrevista — estão mapeadas aos padrões do(a) candidato(a).",
          "Verifique as \"Áreas para Explorar\" — são dimensões onde a IA não teve tanta confiança. Sua entrevista pode preencher as lacunas.",
          "Opcionalmente, revise as respostas reais do(a) candidato(a) na aba de Respostas para contexto adicional.",
        ]} />

        <Tip>
          O briefing foi desenhado para ser lido em 2-3 minutos. Considere imprimi-lo ou mantê-lo aberto no celular durante a entrevista.
        </Tip>
      </HelpSection>

      {/* Rubric */}
      <HelpSection id="rubric" title="Usando a Rubrica da Entrevista" icon={ClipboardCheck}>
        <p className="text-sm text-muted">
          Após a entrevista, você pontua o(a) candidato(a) em uma rubrica estruturada. Isso cria um ponto de dado padronizado comparável entre entrevistadores(as).
        </p>

        <h3 className="text-sm font-semibold">Categorias da Rubrica</h3>
        <div className="space-y-2">
          <StatExplainer label="Comunicação" example="1-5" description="Com que clareza e eficácia o(a) candidato(a) se expressou verbalmente. Considere: contato visual, articulação, capacidade de explicar o próprio raciocínio." />
          <StatExplainer label="Pensamento Crítico" example="1-5" description="Evidência de raciocínio analítico durante a entrevista. Pensou sobre as perguntas ou deu respostas superficiais?" />
          <StatExplainer label="Autoconsciência" example="1-5" description="Capacidade de refletir sobre os próprios pontos fortes, desafios e aprendizado. Corresponde ao que a sessão da plataforma mostrou?" />
          <StatExplainer label="Motivação e Ajuste" example="1-5" description="Interesse genuíno pela escola e reflexão cuidadosa sobre por que é o ajuste certo." />
          <StatExplainer label="Impressão Geral" example="1-5" description="Sua avaliação holística do(a) candidato(a) como potencial membro da comunidade escolar." />
        </div>

        <h3 className="mt-4 text-sm font-semibold">Escala de Pontuação</h3>
        <div className="space-y-1 text-xs text-muted">
          <p><strong>5</strong> — Excepcional. Destaca-se claramente.</p>
          <p><strong>4</strong> — Forte. Acima do que costuma ver.</p>
          <p><strong>3</strong> — Sólido. Atende às expectativas para a série.</p>
          <p><strong>2</strong> — Abaixo das expectativas. Preocupante em algumas áreas.</p>
          <p><strong>1</strong> — Preocupações significativas.</p>
        </div>
      </HelpSection>

      {/* Notes */}
      <HelpSection id="notes" title="Submetendo Notas de Entrevista" icon={MessageSquare}>
        <Steps steps={[
          "Após a entrevista, volte à página do(a) candidato(a).",
          "Pontue cada categoria da rubrica (1-5).",
          "Escreva suas notas na área de texto. Inclua observações específicas, citações memoráveis e o que te surpreendeu.",
          "Clique em \"Submeter\" — suas pontuações e notas são salvas imediatamente.",
          "O(a) administrador(a) e avaliador(a) da escola agora veem seus dados da entrevista ao lado do perfil da IA.",
        ]} />

        <Tip>
          Escreva as notas enquanto a entrevista está fresca — idealmente dentro de uma hora. Detalhes específicos (&quot;Descreveu como abordou o projeto de ciências...&quot;) são muito mais úteis do que impressões gerais (&quot;Parecia inteligente&quot;).
        </Tip>
      </HelpSection>

      {/* Synthesis */}
      <HelpSection id="synthesis" title="Síntese da Entrevista" icon={FileCheck}>
        <p className="text-sm text-muted">
          Após você submeter a rubrica e as notas, a IA gera uma <strong>Síntese da Entrevista</strong> — um documento que reconcilia o que a sessão mostrou com o que você observou na entrevista.
        </p>

        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Pontos Fortes Confirmados</span> — Padrões da sessão que sua entrevista validou.</p>
          <p><span className="font-medium text-lift-text">Novos Insights</span> — Coisas que você observou que a sessão não captou (ou não podia captar).</p>
          <p><span className="font-medium text-lift-text">Discrepâncias</span> — Áreas onde a impressão da entrevista diferiu da sessão. Especialmente importantes para decisões de admissão.</p>
        </div>

        <Tip>
          A síntese é uma das ferramentas mais poderosas para avaliadores(as). Cria um quadro completo combinando análise estruturada da IA com observação humana — exatamente o que boas decisões de admissão exigem.
        </Tip>
      </HelpSection>
    </div>
  );
}
