/**
 * Error narrowing helpers used by tRPC handlers and services.
 *
 * The goal is to replace `catch (error: any)` (which throws away type
 * information and lets us read whatever property we feel like) with
 * `catch (error)` followed by typed accessors that surface unexpected
 * shapes instead of silently coercing them.
 */

/** Pull a human-readable message off any thrown value. */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  // Many libraries throw plain objects instead of Error instances —
  // Postgres / drizzle errors come through as { code, message, detail },
  // ethers' contract errors as { code, reason, message }, etc. The
  // docstring promises this works for "any thrown value", so explicitly
  // pull `.message` off whatever shape we got before falling back.
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

/**
 * Reads a string `.code` property if present on the thrown value.
 * Useful for Postgres errors (e.g. `'23505'` for unique-violation),
 * Node FS errors (`'ENOENT'`), and ethers errors (`'CALL_EXCEPTION'`).
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}
