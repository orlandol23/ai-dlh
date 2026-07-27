# Checklist de Revisão Solidity (gate derivado do curso)

> Origem: Bootcamp Borderless `[W5P1]` `[W5P2]` `[QA-JT]` (mapa de tags: `docs/adr/README.md`). Vale para **todo PR de contrato** (A4, C4a, C5, D2…): o revisor percorre a lista; qualquer desvio ganha comentário de triagem inline, nunca passa em silêncio. Complementa o "Checklist de verificação manual do dono" do E1 — não o substitui.

1. **CEI** — checks → effects → interactions, em toda função que muda estado, sem exceção.
2. **`nonReentrant`** em qualquer função que envie ETH/token (cinto e suspensório mesmo com CEI; no `SubscriptionManager` a decisão E1 de dispensar ReentrancyGuard é válida porque USDC não tem hooks — a dispensa deve estar escrita no PR).
3. **Pull over push** — nunca transferir em loop para endereços arbitrários; destinatários sacam.
4. **`abi.encode` (não `encodePacked`)** ao hashear 2+ campos dinâmicos (classe de colisão).
5. **Assinaturas** — deadline + nonce + domain binding (EIP-712, domain lido do contrato); replay testado.
6. **Zero `call`/multicall arbitrário**; todo input externo validado na borda.
7. **`SafeERC20` sempre; `decimals()` lido, nunca assumido** (USDC = 6 — o bug do "fator de um trilhão").
8. **`Ownable2Step`**; owner = multisig (Safe) onde houver valor real.
9. **Oracles** — staleness + heartbeat + `decimals` do feed checados por feed (Chainlink = 8).
10. **Storage packing** consciente (slots de 32 bytes) — otimizar **depois** de correto (ADR-0004).
11. **Upgradability só com justificativa escrita; default = imutável** (ADR-0002).
12. **Randomness** nunca de block vars; VRF ou commit-reveal se um dia precisar.
13. **Slither (+ gate de gas) no CI antes do merge** (C1b); high/med limpos ou triados inline.
