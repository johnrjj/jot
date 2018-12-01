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
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      colorize: true,
    },
    options || {},
  );
  return winston.createLogger(logOptions);
}

export function JSONLoggerFactory(options?: any): winston.Logger {
  const logOptions: any = Object.assign(
    {
      level: 'debug',
      transports: [new winston.transports.Console()],
      format: winston.format.combine(winston.format.simple(), winston.format.json()),
    },
    options || {},
  );
  return winston.createLogger(logOptions);
}

export const NullLogger = {
  log(_level: string, _message: string, _meta?: any): void {
    /* no-op */
  },
  error(_err: Error): void {
    /* no-op */
  },
};
