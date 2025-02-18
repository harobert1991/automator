// logger.js

import { createLogger, format, transports } from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path for the log file
const logFilePath = path.join(__dirname, 'scraper.log');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'starter-service' },
  transports: [
    // Write all logs with level `info` and below to `scraper.log`
    new transports.File({ filename: logFilePath }),
    // Also log to the console
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    }),
  ],
});

export default logger;
