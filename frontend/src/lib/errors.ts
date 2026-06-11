/**
 * Error narrowing helpers for browser code.
 *
 * MetaMask / EIP-1193 providers throw errors with numeric `.code` fields
 * (e.g. 4001 = user rejected, -32002 = pending request). Native JS
 * errors expose `.message` only. These helpers normalize both without
 * resorting to `catch (error: any)`.
 */

export function getErrorMessage(error: unknown, fallback = 'Erro desconhecido'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  // Many libraries throw plain objects instead of Error instances —
  // notably EIP-1193 / JSON-RPC providers like MetaMask, which throw
  // { code: number, message: string }. Without this branch we'd hide
  // the real reason (e.g., "User rejected the request") behind the
  // generic fallback.
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

/** Read a numeric `.code` (EIP-1193 / JSON-RPC errors use these). */
export function getEipErrorCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'number') return code;
  }
  return undefined;
}
