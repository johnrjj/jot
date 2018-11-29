import express from 'express';
import { Request, Response, NextFunction, Express } from 'express';
import expressLogger from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import expressWsFactory from 'express-ws';
import compression from 'compression';
import { Logger } from 'winston';
import { Pool } from 'pg';
import { createClient } from 'redis';
import Automerge from 'automerge';
import { RedisBasicClient } from './core/redis-client';
import { v0ApiRouterFactory } from './core/rest-api';
import { DocumentRepository } from './core/document-repository';
import { WebSocketNode } from './core/websocket-node';
import { RedisSubscriber } from './core/redis-subscriber';
import { RedisPublisher } from './core/redis-publisher';
import { ConsoleLoggerFactory } from './util/logger';
import { generateSampleAutomergeDocFromIpsum } from './util/import-export';
import { AppConfig } from './config';

const createApp = async (config: AppConfig): Promise<Express> => {
  const logger: Logger = ConsoleLoggerFactory({ level: config.LOG_LEVEL });
  const initialDocSet = new (Automerge as any).DocSet();
  const { doc, docId } = generateSampleAutomergeDocFromIpsum('1');
  initialDocSet.setDoc(docId, doc);

  // Set up Redis
  logger.log('verbose', '🛠️ Setting up Redis instances');
  // Create dedicated Redis Publisher instance
  const redisPublisher = config.REDIS_CONNECTION_STRING ? createClient(config.REDIS_CONNECTION_STRING) : createClient();
  logger.log('verbose', '🛠️ Redis publisher setup\t(1 of 3 redis instances)');
  // Create dedicated Redis Subscriber instance
  const redisSubscriber = config.REDIS_CONNECTION_STRING
    ? createClient(config.REDIS_CONNECTION_STRING)
    : createClient();
  logger.log('verbose', '🛠️ Redis subscriber setup\t(2 of 3 redis instances)');
  // Create generic redis client for non pub/sub stuff (ZSET, SET, EXPIRES, etc)
  const redisClient = config.REDIS_CONNECTION_STRING ? createClient(config.REDIS_CONNECTION_STRING) : createClient();
  logger.log('verbose', '🛠️ Redis basic client setup\t(3 of 3 redis instances)');
  logger.log('verbose', '🛠️ Redis instances setup and clients created');

  const subscriber = new RedisSubscriber({ redisSubscriber, logger });
  const publisher = new RedisPublisher({ redisPublisher, logger });
  const basicRedisClient = new RedisBasicClient({ redisClient, logger });

  const documentRepository = new DocumentRepository({
    initialDocSet,
    publisher,
    subscriber,
    redisClient: basicRedisClient,
    logger,
  });
  logger.log('verbose', '🛠️ DocumentRepository setup');

  const app = express();
  const expressWs = expressWsFactory(app);
  app.set('trust proxy', true);
  app.use('/', express.static(__dirname + '/public'));
  app.use(expressLogger('dev'));
  app.use(helmet());
  app.use(cors());
  app.use(compression()); // automerge crdt ops gzip really well
  app.get('/', (_, res) => res.send('Welcome to Jot ✍️'));
  app.get('/healthcheck', (_, res) => res.status(200).json({ health: 1 }));

  // REST API
  app.use('/api/v0', v0ApiRouterFactory(documentRepository, logger));
  logger.log('verbose', '🛠️ REST API /api/v0 endpoint setup');

  // WS API
  const wss = expressWs.getWss();
  const webSocketNode = new WebSocketNode({
    wss,
    logger,
    documentRepository,
  });
  (app as any).ws('/ws', async (ws, req, next) => webSocketNode.connectionHandler(ws, req, next));
  logger.log('verbose', '🛠️ Websocket /ws endpoint setup');

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    const err = new Error('Not Found') as any;
    err.status = 404;
    next(err);
  });

  app.use((error: ResponseError | Error | any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.status || 500);
    res.json({ ...error });
  });
  logger.log('debug', `✅ Jot configured successfully, ready to start`);
  return app;
};

interface ResponseError extends Error {
  status?: number;
}

export default createApp;
