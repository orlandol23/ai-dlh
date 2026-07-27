/**
 * Wallet connection and login-message signing, on top of viem.
 *
 * Kept free of React so the whole flow is unit-testable against a fake
 * EIP-1193 provider: `useAuth` only wires this to state and toasts.
 *
 * viem instead of ethers here for two concrete reasons:
 *   1. Tree-shaking. We use exactly two provider calls, and viem ships them
 *      without the rest of a full-node client library.
 *   2. Error fidelity. ethers v6 rewrites the EIP-1193 rejection into its own
 *      `ACTION_REJECTED` string code, which silently broke the numeric
 *      `code === 4001` check this app used to do. viem preserves the provider
 *      error and exposes a typed `UserRejectedRequestError`.
 */
import {
  ResourceUnavailableRpcError,
  UserRejectedRequestError,
  createWalletClient,
  custom,
  type Address,
  type EIP1193Provider,
  type Hex,
} from 'viem';

export interface WalletLogin {
  /** Checksummed address returned by the wallet. */
  address: Address;
  /** Exact message that was signed, sent verbatim to the backend. */
  message: string;
  signature: Hex;
}

/** Bytes of entropy in a login nonce. */
const NONCE_BYTES = 24;

/**
 * Fresh base64url nonce. The backend stores it under a unique
 * `(nonce, wallet)` index, so a replayed signature loses at the database
 * level rather than in application logic.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds the exact grammar the backend parses. Field order and labels are
 * part of the contract with `server/services/auth.service.ts`: changing them
 * breaks login, so this lives in one place and is asserted by tests.
 *
 * Domain binding is what stops a signature captured on another site from
 * being replayed here; the timestamp bounds how long it stays valid.
 */
export function buildLoginMessage(params: {
  address: Address;
  domain: string;
  timestamp: number;
  nonce: string;
}): string {
  return (
    `AI-DLH Authentication\n` +
    `Domain: ${params.domain}\n` +
    `Address: ${params.address}\n` +
    `Timestamp: ${params.timestamp}\n` +
    `Nonce: ${params.nonce}`
  );
}

/**
 * Walks the `cause` chain looking for a numeric JSON-RPC code.
 *
 * viem wraps provider errors, so the original `{ code: 4001 }` is usually one
 * or two levels down rather than on the thrown object. Checking only the top
 * level is precisely the bug this replaces.
 */
export function findRpcErrorCode(error: unknown, depth = 0): number | undefined {
  if (depth > 5 || !error || typeof error !== 'object') return undefined;

  if ('code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'number') return code;
  }

  return findRpcErrorCode((error as { cause?: unknown }).cause, depth + 1);
}

/** User dismissed the wallet prompt (EIP-1193 code 4001). */
export function isUserRejection(error: unknown): boolean {
  return error instanceof UserRejectedRequestError || findRpcErrorCode(error) === 4001;
}

/** A previous request is still open in the wallet UI (code -32002). */
export function isRequestPending(error: unknown): boolean {
  return error instanceof ResourceUnavailableRpcError || findRpcErrorCode(error) === -32002;
}

/**
 * Requests account access and signs the login message.
 *
 * Throws if the wallet returns no accounts, which is what a locked wallet or
 * a dismissed permission dialog looks like on some providers.
 */
export async function connectAndSign(
  provider: EIP1193Provider,
  options: { domain: string; now?: () => number } = { domain: '' },
): Promise<WalletLogin> {
  const client = createWalletClient({ transport: custom(provider) });

  const [address] = await client.requestAddresses();
  if (!address) throw new Error('Wallet returned no accounts');

  const message = buildLoginMessage({
    address,
    domain: options.domain,
    timestamp: (options.now ?? Date.now)(),
    nonce: generateNonce(),
  });

  const signature = await client.signMessage({ account: address, message });

  return { address, message, signature };
}
