# ADRs — Registros de Decisão de Arquitetura

Registros curtos e datados de decisões **já tomadas** (no Plano-Mestre e revisões), mantidos aqui para que a *fundamentação* — inclusive onde o material do curso a valida independentemente — sobreviva aos documentos que a originaram. Rastreabilidade curso→código é ativo de empregabilidade.

Convenção: um arquivo por decisão, `NNNN-slug.md`, status `Aceita | Substituída | Pendente`. Um ADR nunca muda uma decisão — apenas a registra. O Plano-Mestre continua sendo a fonte da verdade de execução.

## Tags de fonte do curso (Bootcamp Borderless)

| Tag | Material | Conteúdo relevante |
|---|---|---|
| `[W2]` | Week 2 (César) — fundamentos EVM | mempool/front-running, ciclo de vida de tx, decimals 18/6/8, events p/ indexação |
| `[W4]` | Weeks 3–4 (Jimmy) — tokens | ERC-20/721/1155, OpenZeppelin, oracles (trust & staleness), IPFS/Arweave/Filecoin (só URI on-chain) |
| `[W5P1]` | Week 5 pt.1 (Jan) — Solidity avançado | create3, Chainlink decimals, fuzz + invariant tests com handlers, proxies/ERC-1967 |
| `[W5P2]` | Week 5 pt.2 (Jan) — Solidity avançado | imutabilidade > upgradability (Uniswap V2→V3→V4), pull-over-push, colisão de hash em `encodePacked`, reentrancy/CEI, assinaturas (deadline+nonce), monitoring + Pausable |
| `[QA-JT]` | Q&A Jimmy Tan | storage slot packing, `indexed` em eventos, automação descentralizada (Chainlink Automation/Gelato/Defender) |
| `[W9]` | Front-end (César) + exercício | wagmi/viem + reown/WalletConnect; verificação via Standard JSON |
| `[RS1–5]` | César — Rust for Web3 (Solana) | Anchor, lifecycle de accounts, PDAs (seeds+bump, signed CPI), projetos finais com PDA schema |
| `[W10E1]` | Week 10 ep.1 (Sam) — stablecoins | blacklist como feature regulatória; decimals 6 vs 18; USDT imutável em 0.4.17 com US$ 110 bi |
| `[W10E5]` | Week 10 ep.5 (Sam) — bridges | "o que exatamente estou confiando, e o que acontece quando essa confiança quebra?" |

## Índice

| ADR | Decisão | Status |
|---|---|---|
| [0001](0001-eip3009-caminho-principal.md) | EIP-3009 `receiveWithAuthorization` como caminho principal de cobrança; creditar sempre o signatário (RB4) | Aceita |
| [0002](0002-subscription-manager-imutavel.md) | `SubscriptionManager.sol` imutável na v1 (sem proxy) + `Pausable` | Aceita |
| [0003](0003-maxtotal-anti-frontrun.md) | `maxTotal` anti-front-run em todas as funções de compra | Aceita |
| [0004](0004-storage-packing.md) | Storage packing consciente (Subscription 1 slot; certificado ERC-5192 packed, sem Enumerable) | Aceita |
| [0005](0005-nao-reaproveitar-learningprogress.md) | Não reaproveitar `LearningProgress.sol` no C4 | Aceita |
| [0006](0006-solana-cnft-pda.md) | Fase 4 Solana: cNFT Bubblegum + PDAs determinísticos | Aceita (fase futura) |
