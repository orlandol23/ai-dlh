/**
 * Gas regression gate (C1b).
 *
 * Measures gas for the deployment and for every state-changing path of
 * `LearningProgress`, then compares against the committed baseline in
 * `gas-baseline.json`.
 *
 * Why a hand-rolled script instead of hardhat-gas-reporter: the reporter
 * prints a table, it does not gate. This script fails the build when gas
 * grows past a tolerance, which is what A4 depends on ("orçamento de gas
 * batido no gate do C1b"). It also pins the *shape* of the measurement,
 * so the baseline stays comparable as the contract evolves.
 *
 * Usage:
 *   npm run gas:check    compare against the baseline, exit 1 on regression
 *   npm run gas:update   rewrite the baseline from the current contract
 *
 * The update switch is an env var, not a CLI flag, because `hardhat run`
 * does not forward argv to the script.
 *
 * Determinism: every scenario runs against a fresh in-process Hardhat chain
 * from a fixed starting state, so the numbers are reproducible across
 * machines. String lengths are pinned because `moduleTopic` is stored, and
 * calldata plus storage cost scale with it.
 */
import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/** Fail if any measurement exceeds its baseline by more than this fraction. */
const TOLERANCE = 0.02;

const BASELINE_PATH = path.resolve(__dirname, '..', 'gas-baseline.json');

/** Fixed topic (32 bytes) so calldata and storage cost stay comparable. */
const TOPIC = 'Solidity Fundamentals & Gas!!!!!';

type Measurements = Record<string, number>;

async function measure(): Promise<Measurements> {
  const [, user] = await ethers.getSigners();
  const factory = await ethers.getContractFactory('LearningProgress');

  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployTx = contract.deploymentTransaction();
  if (!deployTx) throw new Error('missing deployment transaction');
  const deployReceipt = await deployTx.wait();
  if (!deployReceipt) throw new Error('missing deployment receipt');

  const asUser = contract.connect(user);

  // First completion for this user: cold storage, array grows 0 -> 1. This is
  // the worst case and the one that matters for the queue's cost per payout.
  const first = await (await asUser.recordCompletion(1, 100, TOPIC)).wait();
  if (!first) throw new Error('missing receipt: first completion');

  // Second completion: the array slot pattern is already warm, so this is the
  // steady-state cost. Tracking both catches a regression that only shows up
  // on one of the two paths.
  const second = await (await asUser.recordCompletion(2, 80, TOPIC)).wait();
  if (!second) throw new Error('missing receipt: second completion');

  return {
    deployment: Number(deployReceipt.gasUsed),
    'recordCompletion:first': Number(first.gasUsed),
    'recordCompletion:subsequent': Number(second.gasUsed),
  };
}

function readBaseline(): Measurements {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(
      `No baseline at ${BASELINE_PATH}. Run "npm run gas:update" to create one.`
    );
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).measurements;
}

function writeBaseline(measurements: Measurements): void {
  const doc = {
    _comment:
      'Gas baseline for the C1b regression gate. Regenerate deliberately with ' +
      '"npm run gas:update" and explain the delta in the PR that changes it.',
    solidity: '0.8.20',
    optimizer: { enabled: true, runs: 200 },
    tolerancePct: TOLERANCE * 100,
    measurements,
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(doc, null, 2)}\n`);
}

async function main(): Promise<void> {
  const update = process.env.GAS_BASELINE_UPDATE === 'true';
  const measurements = await measure();

  if (update) {
    writeBaseline(measurements);
    console.log(`Baseline written to ${path.relative(process.cwd(), BASELINE_PATH)}:`);
    for (const [name, gas] of Object.entries(measurements)) {
      console.log(`  ${name.padEnd(30)} ${gas.toLocaleString('en-US')}`);
    }
    return;
  }

  const baseline = readBaseline();
  const regressions: string[] = [];
  let unknown = 0;

  console.log(`Gas check (tolerance ${(TOLERANCE * 100).toFixed(0)}%)\n`);
  console.log(`  ${'scenario'.padEnd(30)} ${'baseline'.padStart(10)} ${'actual'.padStart(10)}  delta`);

  for (const [name, gas] of Object.entries(measurements)) {
    const base = baseline[name];
    if (base === undefined) {
      unknown += 1;
      console.log(`  ${name.padEnd(30)} ${'—'.padStart(10)} ${gas.toLocaleString('en-US').padStart(10)}  new`);
      continue;
    }
    const delta = (gas - base) / base;
    const pct = `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(2)}%`;
    const over = delta > TOLERANCE;
    console.log(
      `  ${name.padEnd(30)} ${base.toLocaleString('en-US').padStart(10)} ` +
        `${gas.toLocaleString('en-US').padStart(10)}  ${pct}${over ? '  <-- OVER' : ''}`
    );
    if (over) {
      regressions.push(`${name}: ${base} -> ${gas} (${pct}, tolerance ${TOLERANCE * 100}%)`);
    }
  }

  // A scenario that vanished means the baseline and the contract disagree
  // about what exists — treat it as a failure, not as a silent pass.
  const missing = Object.keys(baseline).filter((k) => !(k in measurements));

  console.log('');

  if (unknown > 0) {
    console.log(`${unknown} new scenario(s) not in the baseline — run "npm run gas:update".`);
  }
  if (missing.length > 0) {
    console.error(`Baseline has scenarios that were not measured: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  if (regressions.length > 0) {
    console.error('Gas regression:\n' + regressions.map((r) => `  - ${r}`).join('\n'));
    console.error('\nIf the increase is intended, run "npm run gas:update" and justify it in the PR.');
    process.exitCode = 1;
    return;
  }

  console.log('Gas within budget.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
