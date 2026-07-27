# ADR-0006 — Fase 4 Solana: cNFT Bubblegum + PDAs determinísticos

- **Status:** Aceita como fase futura (Plano-Mestre Fase 4/D2; registrada em 2026-07-26)

## Decisão

Certificados na Solana serão **cNFTs via Bubblegum** (~US$ 0,0001/mint, ~100× mais barato que a Base), com programa **Anchor/Rust** próprio. Derivação de endereços por **PDA** com seeds `[b"cert", user_pubkey, module_id]`.

## Fundamentação

- `[RS2–4]`: PDAs dão endereço **determinístico** (substitui mapping) e garantem **1 registro por (user, módulo) de graça** — a mesma invariante que hoje exige índice parcial no Postgres e guard on-chain na EVM sai do modelo de contas da Solana por construção. PDA (off-curve, signed CPI) também serve de **tree authority** da árvore Bubblegum.
- O esqueleto do projeto final do curso (Part 05: account model + instruction map + authority rules) é o template do spike de 1 dia registrado no Plano-Mestre (item CU-8).
- Timing mantido: **não antes da Fase 4** — dobraria superfície de teste/ops sem volume que justifique (decisão original do plano, inalterada).
