import express from 'express';
import { Request, Response, NextFunction, Express } from 'express';
import expressLogger from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import expressWsFactory from 'express-ws';
import compression from 'compression';
import { Logger, config } from 'winston';
import { Pool } from 'pg';
import { createClient } from 'redis';
import Automerge from 'automerge';
import { v0ApiRouterFactory } from './core/rest-api';
import { DocumentRepository } from './core/document-repository';
import { WebSocketNode } from './core/websocket-node';
import { ConsoleLoggerFactory } from './util/logger';
import { initialAutomergeDocExample } from './test-data/initial-doc';
import { AppConfig } from './config';
import { RedisSubscriber } from './core/subscriber';
import { RedisPublisher } from './core/publisher';

const createApp = async (config: AppConfig): Promise<Express> => {
  const logger: Logger = ConsoleLoggerFactory({ level: config.LOG_LEVEL });
  const docSet = new (Automerge as any).DocSet();
  const { doc, docId: testDocId } = getSampleDoc();
  docSet.setDoc(testDocId, doc);

  // Set up Redis
  const redisPublisher = config.REDIS_URL ? createClient(config.REDIS_URL) : createClient();
  logger.log('verbose', '🛠️ Redis Publisher setup');
  const redisSubscriber = config.REDIS_URL ? createClient(config.REDIS_URL) : createClient();
  logger.log('verbose', '🛠️ Redis Subscriber setup');
  logger.log('verbose', '🛠️ Connected to Redis instance');
  const subscriber = new RedisSubscriber({ redisSubscriber, logger });
  const publisher = new RedisPublisher({ redisPublisher, logger });

  const documentRepo = new DocumentRepository({
    initialDocSet: docSet,
    publisher,
    subscriber,
    logger,
  });

  const app = express();
  const expressWs = expressWsFactory(app);
  app.set('trust proxy', true);
  app.use('/', express.static(__dirname + '/public'));
  app.use(expressLogger('dev'));
  app.use(helmet());
  app.use(cors());
  app.use(compression()); // automerge crdt ops gzip really well
  app.get('/', (_, res) => res.send('Welcome to Jot ✍️'));
  app.get('/healthcheck', (_, res) => res.sendStatus(200));

  // REST API
  app.use('/api/v0', v0ApiRouterFactory(documentRepo, logger));
  logger.log('verbose', '🛠️ REST API /api/v0 endpoint setup');

  const wss = expressWs.getWss();
  const webSocketNode = new WebSocketNode({
    wss,
    logger,
    documentRepository: documentRepo,
  });
  (app as any).ws('/ws', (ws: any, req: any, next: any) =>
    webSocketNode.connectionHandler(ws, req, next),
  );
  logger.log('verbose', '🛠️ Websocket /ws endpoint setup');

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    const err = new Error('Not Found') as any;
    err['status'] = 404;
    next(err);
  });

  app.use(
    (error: ResponseError | Error | any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(error.status || 500);
      res.json({ ...error });
    },
  );
  logger.log('debug', `✅ Jot configured successfully, ready to start`);
  return app;
};

interface ResponseError extends Error {
  status?: number;
}

const getSampleDoc = () => {
  const docId = '1';
  const doc = Automerge.load(initialAutomergeDocExample);
  return {
    doc,
    docId,
  };
};

export default createApp;
