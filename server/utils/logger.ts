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

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
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
