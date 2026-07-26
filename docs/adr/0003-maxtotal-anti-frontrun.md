# ADR-0003 — `maxTotal` anti-front-run em todas as funções de compra

- **Status:** Aceita (Plano-Mestre E1; registrada em 2026-07-26)

## Decisão

Toda função de compra (`subscribe*`, `purchaseCredits*`) recebe `maxTotal` e faz `require(total <= maxTotal)`. Sem timelock no `setPrice`; a transparência vem dos **eventos completos** (`PlanUpdated`, `PricePerCreditUpdated` etc.) — barata e suficiente para o estágio.

## Fundamentação

- Classe de ataque `[W2]`: a tx do usuário fica visível no mempool; um `setPrice` do owner (ou reorg de ordenação) entre a assinatura do usuário e a inclusão da tx poderia cobrar mais do que o usuário viu na UI. `maxTotal` transfere o teto para a assinatura do usuário — o pior caso vira revert, nunca cobrança maior.
- `[W5P1]` demonstrou o mecanismo ao vivo (demo Bob/Alice de front-run).
- Complementa a regra da UI (E5): **exibir claramente o valor assinado** (anti-phishing, threat T4-equivalente).
