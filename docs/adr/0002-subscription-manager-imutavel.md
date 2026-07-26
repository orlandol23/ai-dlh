# ADR-0002 — `SubscriptionManager.sol` imutável na v1 (sem proxy) + `Pausable`

- **Status:** Aceita (Plano-Mestre E1: "Fora de escopo v1 (decisões certas): … proxy upgradeable"; registrada em 2026-07-26)

## Decisão

O `SubscriptionManager.sol` é **imutável**: sem proxy UUPS/transparent, sem initializers. Kill-switch = `Pausable` (só bloqueia vendas; leituras nunca) + `Ownable2Step` com owner **multisig Safe** no mainnet. Correção de bug = deploy de V2 com migração honrando `subscriptions`/`creditsPurchased` do contrato antigo (runbook do A4).

## Fundamentação

1. **Plano-Mestre**: superfície de auditoria mínima para um contrato que segura dinheiro real; o estado é simples (1 slot por assinante + contador de créditos) — migração barata.
2. `[W5P2]`: imutabilidade > upgradability como padrão da indústria para contratos de valor — Uniswap entrega V2→V3→V4 como **novos deploys**, não upgrades in-place; a própria maquinaria de proxy é fonte histórica de perdas (Parity).
3. `[W10E1]`: USDT roda bytecode de solc 0.4.17 segurando ~US$ 110 bi — o mercado aceita código antigo imutável porque **risco de migração > features novas**; usuários confiam mais no que não pode mudar debaixo deles.

## Consequências

- Sem `UPGRADER_ROLE`, sem storage gaps, sem CI de layout de storage.
- O runbook de rollback do A4 (playbook de `pause()`, migração de contrato, refund manual via `withdraw`) é a resposta completa a "e se tiver bug?".
