# ADR-0005 — Não reaproveitar `LearningProgress.sol` no C4

- **Status:** Aceita (Plano-Mestre, correções factuais + E0/C4; registrada em 2026-07-26)

## Decisão

O contrato atual (`contracts/contracts/LearningProgress.sol`, Sepolia) continua servindo o tier free como está, mas **não é base** para o certificado premium: o C4 nasce como `LearningCertificate.sol` (ERC-5192 soulbound) novo, mintando na **wallet provada do usuário**.

## Fundamentação

Três defeitos estruturais do contrato atual, todos anti-padrões nomeados em `[W5P2]`:
1. Grava tudo em `msg.sender` = **wallet custodial do backend**, não do usuário — o "certificado" não pertence a quem estudou.
2. `string` em storage (caro, sem necessidade — `topicHash bytes32` + metadata off-chain resolve).
3. `Completion[]` **unbounded** por usuário — crescimento sem teto é a receita de DoS/gas descrita no curso (pull-over-push/estruturas limitadas).

O ADR-0004 define o layout do substituto.
