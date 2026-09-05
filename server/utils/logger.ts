import winston from 'winston';
import { config } from './env.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format.
//
// `errors({ stack: true })` lifts an Error passed as the message into
// `info.message` + `info.stack` so we can render the stack trace.
// `splat()` makes the spread/`%s`-style args available, and the printf
// below also pulls any leftover metadata fields (including Error
// instances embedded in objects) into a JSON tail. Without this, log
// calls like `logger.error('msg', { error })` would silently drop the
// error details — exactly the kind of opaque failure mode that hurts
// incident response.
/**
 * Field and header names whose value must never reach a log line.
 *
 * The case that motivated this: passing an AxiosError as metadata puts the
 * whole request config in `meta`, and that config carries
 * `headers.Authorization: Bearer <provider api key>`. Redacting by key here
 * means a call site cannot leak a credential by being careless, which is the
 * only guarantee that survives someone adding a new `logger.warn(msg, err)`
 * a year from now.
 */
const SENSITIVE_KEY =
  /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|secret|token|password|private[-_]?key|jwt)$/i;

const REDACTED = '[redacted]';
/** Beyond this a log line is noise; the tail is dropped, not the record. */
const MAX_META_CHARS = 2000;

/**
 * `JSON.stringify` that cannot throw and cannot print a credential.
 *
 * A plain `JSON.stringify` throws `TypeError: Converting circular structure
 * to JSON` on any Node request/socket object, and an AxiosError carries one.
 * Thrown from inside a `printf`, that propagated out of the `logger.warn`
 * call itself, which meant a log line could abort the `catch` block that
 * contained it. A logger is allowed to lose detail; it is not allowed to
 * change control flow.
 *
 * Repeated (non-circular) references to the same object also render as
 * `[circular]`. That is the standard trade-off for the one-pass version and
 * is fine for logs.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  let out: string;
  try {
    out =
      JSON.stringify(value, (key, val: unknown) => {
        if (SENSITIVE_KEY.test(key)) return REDACTED;
        if (typeof val === 'bigint') return val.toString();
        if (typeof val === 'function') return '[function]';
        if (val instanceof Error) return { name: val.name, message: val.message };
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[circular]';
          seen.add(val);
        }
        return val;
      }) ?? '[undefined]';
  } catch {
    return '[unserializable]';
  }
  return out.length > MAX_META_CHARS ? `${out.slice(0, MAX_META_CHARS)}…[truncated]` : out;
}

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...rest } = info as Record<string, unknown>;
    try {
      const meta: Record<string, unknown> = {};
      for (const key of Object.keys(rest)) {
        const value = (rest as Record<string, unknown>)[key];
        if (SENSITIVE_KEY.test(key)) {
          meta[key] = REDACTED;
        } else if (value instanceof Error) {
          meta[key] = { name: value.name, message: value.message, stack: value.stack };
        } else if (value !== undefined) {
          meta[key] = value;
        }
      }
      const metaString = Object.keys(meta).length ? ` ${safeStringify(meta)}` : '';
      const stackString = stack ? `\n${stack}` : '';
      return `${timestamp} ${level}: ${message}${metaString}${stackString}`;
    } catch {
      // Last resort: a formatting bug must not take down the caller.
      return `${String(timestamp)} ${String(level)}: ${String(message)} [log formatting failed]`;
    }
  })
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console(),

  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log'
  }),
];

// Create logger instance
export const logger = winston.createLogger({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

// Create a stream for Morgan HTTP logger
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
