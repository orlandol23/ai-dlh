# ADR-0001 — EIP-3009 `receiveWithAuthorization` como caminho principal de cobrança

- **Status:** Aceita (Plano-Mestre E1; registrada em 2026-07-26)

## Decisão

`subscribeWithAuthorization`/`purchaseCreditsWithAuthorization` via **EIP-3009 `receiveWithAuthorization`** são o caminho principal (single-call, 1 tx); EIP-2612 permit é fallback (com `try/catch` + checagem de allowance); `approve+subscribe` é fallback final. **REGRA RB4:** todo caminho assinado credita o **signatário** (`from`/`owner`), nunca `msg.sender` — teste obrigatório de relayer.

## Fundamentação

- `receiveWithAuthorization` exige `to == address(this)`: só o contrato submete a autorização — imune a front-running e a griefing de nonce (nonce aleatório de 32 bytes; melhor UX multi-abas). O USDC nativo da Base aceita ERC-1271 (funciona com Coinbase Smart Wallet).
- `[W5P2]` valida o desenho de assinaturas: deadline + nonce anti-replay + domain binding (EIP-712, domain lido do contrato — nunca hardcoded; fork test contra o USDC real).
- `[W2]` fundamenta a classe de ataque (mempool público → front-run de permit).

## Referência cruzada (consistência de portfólio)

O repo irmão `stablerails` decidiu o **inverso** (EIP-2612 na v1, 3009 aditivo — ADR-0003 lá): contexto diferente (rail B2B com relayer próprio e padrão B8 vs. checkout consumer multi-abas aqui). Mesmas primitivas USDC, duas decisões argumentadas pelo threat model de cada produto — contraste pronto para entrevista.
