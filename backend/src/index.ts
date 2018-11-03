import { config as readEnvConfig } from 'dotenv';
readEnvConfig();
import createApp from './app';
import config from './config';
import { ConsoleLoggerFactory } from './util/logger';

const PORT = config.PORT;
const logger = ConsoleLoggerFactory({ level: config.LOG_LEVEL });

const start = async () => {
  try {
    logger.log('info', `⏳ Jot Starting... ⏳`);
    const app = await createApp(config);
    app.listen(PORT), logger.log('info', `✍️ Jot started on port ${config.PORT}`);
  } catch (e) {
    logger.error('Error starting app', e);
  }
};

const setupProcessCleanup = () => {
  process.on('exit', () => {
    (process as NodeJS.EventEmitter).emit('cleanup');
  });
  process.on('SIGINT', () => {
    console.log('ctrl-c');
    process.exit(2);
  });
  process.on('uncaughtException', e => {
    console.log('Uncaught Exception...');
    console.log(e.stack);
    process.exit(99);
  });
  process.on('unhandledRejection', (reason, p) => {
    console.log('Possibly Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  });
};

setupProcessCleanup();
start();
