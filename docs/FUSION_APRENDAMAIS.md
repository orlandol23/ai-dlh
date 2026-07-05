# Fusão aprendaMais → all (AI-DLH)

Roadmap da incorporação do projeto **aprendaMais** (plataforma de aprendizagem
adaptativa em JS vanilla) ao **all / AI-DLH** (monorepo React + tRPC + Drizzle +
IA generativa multi-provider + Web3).

A decisão estratégica é **portar conceitos, não código**: o aprendaMais foi
prototipado em JavaScript vanilla sem build, sem tipos e sem backend real; o
all já possui infraestrutura madura (i18n com 6 idiomas, router multi-provider
de IA Gemini/Claude/Qwen, autenticação Web3, PostgreSQL com migrations no
boot). Cada fase abaixo traz uma capacidade do aprendaMais para dentro dessa
infraestrutura.

---

## Fase 1 — Questionário VARK + prompt condicionado por estilo (este PR)

O coração do aprendaMais é o questionário **VARK** (Visual, Auditory,
Reading/Writing, Kinesthetic): 15 perguntas de múltipla escolha que detectam o
estilo de aprendizagem dominante do usuário. Nesta fase ele é portado como
fluxo de onboarding do AI-DLH e o resultado passa a **condicionar a geração de
módulos por IA**.

### Escopo

- **DB**: coluna `learning_style` (nullable) na tabela `users`, via migration
  Drizzle (`0002_*`), aplicada automaticamente no boot do servidor.
- **API (tRPC)**: router `learningStyle` com `submitVarkResult` — recebe as 15
  respostas (validação Zod estrita), calcula o estilo dominante **server-side**
  (regra determinística de desempate) e persiste. O estilo é exposto em
  `auth.me` / `auth.login` automaticamente (a row completa do usuário é
  retornada).
- **Frontend**: página `/vark` com as 15 perguntas (adaptadas do aprendaMais),
  barra de progresso, navegação anterior/próxima, tela de resultado com
  explicação do estilo, distribuição de pontos e recomendações de estudo.
  - CTA no dashboard ("Descubra seu estilo de aprendizagem") quando
    `learning_style` é `null`.
  - Possibilidade de refazer o questionário pelo painel de preferências.
  - Textos no namespace i18n `vark` nos 6 idiomas: **pt-BR** e **en**
    autorais; **es/fr/ja/ar** traduzidos por máquina (paridade de
    chaves/placeholders verificada) e pendentes de revisão humana.
- **Prompt condicionado**: o `prompt-builder` (ponto comum a TODOS os
  providers — Gemini, Claude e Qwen) injeta instruções de adaptação
  pedagógica quando o usuário tem estilo definido:
  - `visual` → analogias visuais, descrições de diagramas, estrutura espacial;
  - `auditory` → tom narrativo/conversacional, mnemônicos sonoros;
  - `reading_writing` → texto estruturado, listas, definições;
  - `kinesthetic` → exemplos práticos, exercícios hands-on, aprender-fazendo.

  O contrato de saída (schema Zod `ModuleContentSchema`) permanece intacto.
- **Testes**: unitários para o cálculo VARK (server e frontend compartilham a
  mesma regra) e para o prompt builder (instrução de estilo presente/ausente).

### Decisões de design

- **Empate (perfil multimodal)**: a coluna persiste apenas um dos 4 estilos.
  Em caso de empate na contagem máxima, o desempate é determinístico pela
  ordem fixa `visual > auditory > reading_writing > kinesthetic`. A tela de
  resultado detecta o empate e apresenta o perfil como *multimodal* (com
  recomendações específicas), deixando claro qual estilo foi persistido como
  dominante.
- **Cálculo server-side é a fonte da verdade**: o frontend calcula o resultado
  apenas para exibição imediata; o valor persistido vem sempre do servidor, a
  partir das respostas brutas.

### Critérios de pronto (DoD)

- [ ] Migration `0002` aplica e o boot do servidor continua íntegro.
- [ ] `learningStyle.submitVarkResult` valida 15 respostas e persiste o estilo.
- [ ] Fluxo completo no frontend: CTA → quiz → resultado → persistência →
      CTA some do dashboard.
- [ ] Refazer o questionário pelas preferências funciona e sobrescreve o estilo.
- [ ] Prompt de geração inclui a instrução do estilo para os 3 providers
      (verificado por teste no `buildPrompt`).
- [ ] i18n nos 6 idiomas (pt-BR/en autorais; es/fr/ja/ar máquina, p/ revisão).
- [ ] `npm run build`, type-check, lint e todos os testes passando.

---

## Fase 2 — Gerador de perguntas extras / regeneração de quiz por estilo

O aprendaMais tinha integração de IA experimental (`ia-integration.js`) para
gerar conteúdo complementar. No all, isso vira uma feature de primeira classe
usando o **router multi-provider** já existente.

### Escopo

- Procedure `ai.generateExtraQuestions` — gera N perguntas adicionais para um
  módulo existente, adaptadas ao `learning_style` do usuário (ex.: questões
  com descrição de cenários práticos para cinestésicos).
- Procedure `ai.regenerateQuiz` — regenera o quiz de um módulo com outra
  "lente" de estilo, sem regenerar o conteúdo (custo menor de tokens).
- Reuso do `ModuleContentSchema`/`QuizQuestionSchema` (Zod) para validar a
  saída; rate limiting alinhado ao PR #14.
- UI: botão "Mais perguntas" na página do módulo, com indicação do estilo
  usado na geração.

### Critérios de pronto

- [ ] Perguntas extras validadas pelo schema Zod e persistidas junto ao módulo.
- [ ] Funciona nos 3 providers (teste do prompt + mock de provider).
- [ ] Limites de uso aplicados (sem estourar custo de API).
- [ ] i18n pt-BR/en para a nova UI.

---

## Fase 3 — Prática verbal de idiomas (Web Speech API)

O aprendaMais tinha módulos de idiomas com áudio (`frontend/audio/`). No all,
isso evolui para prática **falada** usando Web Speech API (sem custo de
backend de voz).

### Escopo

- `SpeechSynthesis` para ouvir frases/termos do módulo no idioma alvo
  (aproveitando os 6 locales já suportados pelo i18n).
- `SpeechRecognition` para o usuário repetir a frase; comparação fonética
  simples (normalização + distância de edição) com feedback de acerto.
- Integração com o estilo de aprendizagem: usuários `auditory` recebem o CTA
  de prática verbal com mais destaque.
- Detecção de capacidade do navegador com fallback gracioso (feature
  indisponível em browsers sem suporte — esconder UI, não quebrar).

### Critérios de pronto

- [ ] Prática de pronúncia funcional em Chrome/Edge (suporte completo da API).
- [ ] Fallback limpo em navegadores sem `SpeechRecognition`.
- [ ] Pontuação da prática persistida em `progress_records` (ou tabela própria).
- [ ] i18n pt-BR/en da UI de prática.

---

## Fase 4 — Arquivamento do aprendaMais

Encerramento formal do repositório original.

### Escopo

- README do aprendaMais reescrito: aviso de projeto arquivado, link para o
  all (AI-DLH) e mapa "feature antiga → onde vive agora no all".
- Repositório marcado como **archived** no GitHub (somente leitura).
- Issues abertas migradas ou fechadas com referência ao all.

### Critérios de pronto

- [ ] README de arquivamento publicado.
- [ ] Repositório no estado archived.
- [ ] Nenhuma referência externa quebrada (links atualizados).

---

## Mapa de origem (aprendaMais → all)

| aprendaMais (vanilla)               | all (AI-DLH)                                      | Fase |
| ----------------------------------- | ------------------------------------------------- | ---- |
| `frontend/js/quiz.js` (VARK)        | `/vark` (React) + `learningStyle` router (tRPC)   | 1    |
| Recomendações por estilo            | Tela de resultado + prompt condicionado           | 1    |
| `frontend/js/ia-integration.js`     | Router multi-provider (Gemini/Claude/Qwen)        | 2    |
| Módulos de idiomas com áudio        | Prática verbal com Web Speech API                 | 3    |
| Repositório como um todo            | Arquivado com ponteiro para o all                 | 4    |
