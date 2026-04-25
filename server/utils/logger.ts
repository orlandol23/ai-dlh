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
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...rest } = info as Record<string, unknown>;
    const meta: Record<string, unknown> = {};
    for (const key of Object.keys(rest)) {
      const value = (rest as Record<string, unknown>)[key];
      if (value instanceof Error) {
        meta[key] = { name: value.name, message: value.message, stack: value.stack };
      } else if (value !== undefined) {
        meta[key] = value;
      }
    }
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackString = stack ? `\n${stack}` : '';
    return `${timestamp} ${level}: ${message}${metaString}${stackString}`;
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
