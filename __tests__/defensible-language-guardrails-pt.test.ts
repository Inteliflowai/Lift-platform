import { describe, it, expect } from "vitest";
import { validateAgainstGuardrails } from "@/lib/ai/forbiddenPhrases";

// Smoke coverage for the Portuguese (Brazilian) forbidden-phrase patterns
// shipped for the EduInsights deployment. One representative reject per
// category; the parallel English coverage in
// defensible-language-guardrails.test.ts already exhaustively exercises the
// regex shape.

describe("validateAgainstGuardrails — PT patterns", () => {
  describe("accepts safe Portuguese phrasing", () => {
    it.each([
      "O candidato demonstra esforço persistente em tarefas escritas, retornando aos prompts para refinar ideias.",
      "O engajamento na leitura é forte, com respostas ponderadas às perguntas de compreensão.",
      "Foi observada ética de trabalho alinhada à missão durante toda a sessão de avaliação.",
      "A reflexão sobre o processo sugere prontidão para a ênfase da escola em aprendizagem investigativa.",
      "A produção escrita mostrou desenvolvimento consistente de ideias em vários rascunhos.",
    ])("accepts: %s", (text) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(true);
    });
  });

  describe("rejects each PT category with at least one phrasing", () => {
    it.each([
      ["Comparado aos demais candidatos, o desempenho foi forte.", "comparative"],
      ["Em comparação com outros estudantes, a leitura foi superior.", "comparative"],
      ["Demonstra desempenho superior aos colegas em raciocínio.", "comparative"],
      ["O candidato pertence à raça branca, o que reflete na adaptação.", "protected_class"],
      ["A família segue a fé católica, o que alinha com a escola.", "protected_class"],
      ["Recebeu diagnóstico recente que pode afetar a participação em sala.", "medical_disability"],
      ["Apresenta deficiência de aprendizagem leve segundo relato familiar.", "medical_disability"],
      ["Foi sinalizado como portador de TDAH durante a sessão.", "medical_disability"],
      ["A família solicitou bolsa de estudos integral para custear a matrícula.", "financial"],
      ["Indicadores socioeconômicos sugerem fragilidade familiar.", "financial"],
      ["A criança é filha de mãe solteira, o que pode impactar suporte em casa.", "family_structure"],
      ["Por ser adotada, demonstra padrão emocional distinto.", "family_structure"],
      ["Apresenta QI estimado abaixo da média esperada para a série.", "iq_deficit"],
      ["É um estudante lento que precisa de mais tempo que os colegas.", "iq_deficit"],
      ["Mostra perfil intelectualmente superdotado em todas as dimensões.", "iq_deficit"],
    ])("rejects: %s (%s)", (text, expectedCategory) => {
      const result = validateAgainstGuardrails(text);
      expect(result.ok).toBe(false);
      expect(result.category).toBe(expectedCategory);
    });
  });

  it("rejects PT comparative phrasing with diacritics intact", () => {
    const result = validateAgainstGuardrails(
      "Em relação aos pares, demonstrou maior consistência em leitura."
    );
    expect(result.ok).toBe(false);
    expect(result.category).toBe("comparative");
  });

  it("does not false-positive on neutral PT text mentioning 'comparação' as a noun without rejection structure", () => {
    // Standalone usage of comparison vocabulary in a non-rejection context.
    // The intent is to flag explicit comparative framing, not the word itself.
    const result = validateAgainstGuardrails(
      "A análise considera múltiplas dimensões da prontidão observada."
    );
    expect(result.ok).toBe(true);
  });
});
