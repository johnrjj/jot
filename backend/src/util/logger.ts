// import { Logger as WinstonLogger, LoggerInstance, transports } from 'winston';
// import { transports, Logger} from 'winston';
// import { LoggerInstance } from 'winston';
import winston from 'winston';
export interface ILogger {
  log(level: string, message: string, meta?: any): void;
  error(err: any): void;
}

export function ConsoleLoggerFactory(options?: any): winston.Logger {
  const logOptions: any = Object.assign(
    {
      level: 'debug',
      transports: [new winston.transports.Console()],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
        // winston.format.json() uncomment for json
      ),
      colorize: true,
    },
    options || {}
  );
  return winston.createLogger(logOptions);
}

export const NullLogger = {
  log(level: string, message: string, meta?: any): void {
    /* no-op */
  },
  error(err: Error): void {
    /* no-op */
  },
};
