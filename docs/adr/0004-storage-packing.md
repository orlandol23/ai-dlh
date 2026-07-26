# ADR-0004 — Storage packing consciente

- **Status:** Aceita (Plano-Mestre E1 + orçamento de gas; registrada em 2026-07-26)

## Decisão

- `struct Subscription { uint64 expiresAt; uint8 planId; }` — **1 slot** (1 SSTORE quente por renovação).
- Certificado ERC-5192 (C4): storage packed (`score uint16` + `timestamp uint64` + `topicHash bytes32`), metadata via `tokenURI`, histórico via eventos indexados, **sem `ERC721Enumerable`** — alvo ~100–140k gas/mint.
- Regra geral: otimizar **depois** de correto; metas de gas são validadas no gate de regressão do C1b, não assumidas.

## Fundamentação

`[QA-JT]`: slots de 32 bytes; packing reduz SSTOREs/SLOADs — a otimização de maior alavancagem em contratos de escrita frequente; `indexed` só em eventos (histórico barato off-chain em vez de arrays on-chain).
