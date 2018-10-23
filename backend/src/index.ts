import express from 'express';
import expressLogger from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import expressWsFactory from 'express-ws';
import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { Pool } from 'pg';
import { ConsoleLoggerFactory } from './util/logger';
import Automerge from 'automerge';
import Plain from 'slate-plain-serializer';
import { WebSocketNode } from './core/websocket-node';
import { DocumentRepository } from './core/document-repository';
import { Logger } from 'winston';
// import { Editor } from 'slate-react';
// import { Value } from 'slate';

import { v0ApiRouterFactory } from './core/rest-api';

const config = {
  PORT: parseInt(process.env.PORT || '', 10) || 3001,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  DATA_STORE: process.env.DATA_STORE || 'postgres',
  DATABASE_URL: process.env.DATABASE_URL,
  PGUSER: process.env.PGUSER || 'johnjohnson',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPASSWORD: process.env.PGPASSWORD,
  PGDATABASE: 'jot',
  PG_APP_TABLE_NAME: 'app',
  PGPORT: parseInt(process.env.PGPORT || '', 10) || 5432,
  REDIS_URL: process.env.REDIS_URL,
};

interface ResponseError extends Error {
  status?: number;
}

const logger: Logger = ConsoleLoggerFactory({ level: 'silly' });

logger.log('info', `Config dump:\n${JSON.stringify(config)}`, config);

// const fromJSON = (json: any) => {
//   return Automerge.change(Automerge.init(), 'init', (proxyDoc: any) => {
//     // Object.assign(proxyDoc, json);
//     // assign(proxyDoc, json);
//     // // Object.keys(json).forEach(key => {
//     // //   proxyDoc[key] = json[key];
//     // // });
//   });
// };

const serverActorId: string = 'server-1234';

const createNewDocument = function(docId: string) {
  return Automerge.load(s);
  // let doc = Automerge.init(serverActorId);
  // const initialValue = Plain.deserialize('type here').toJSON();
  // doc = Automerge.change(doc, 'Initialize Slate state', doc => {
  //   Object.assign(doc, initialValue);
  // });
  // return doc;
};

const s =
  '["~#iL",[["~#iM",["ops",["^0",[["^1",["action","set","obj","00000000-0000-0000-0000-000000000000","key","object","value","value"]],["^1",["action","makeMap","obj","698323cb-d8db-433d-b896-f80b173b15d9"]],["^1",["action","set","obj","698323cb-d8db-433d-b896-f80b173b15d9","key","object","value","document"]],["^1",["action","makeMap","obj","583a569e-7913-4a09-8e28-c4bef8621553"]],["^1",["action","link","obj","698323cb-d8db-433d-b896-f80b173b15d9","key","data","value","583a569e-7913-4a09-8e28-c4bef8621553"]],["^1",["action","makeList","obj","3ec325ac-eddb-437a-97a5-7436174c9bdb"]],["^1",["action","ins","obj","3ec325ac-eddb-437a-97a5-7436174c9bdb","key","_head","elem",1]],["^1",["action","makeMap","obj","a8f92bff-f165-48c1-92d0-0c9917e6768f"]],["^1",["action","set","obj","a8f92bff-f165-48c1-92d0-0c9917e6768f","key","object","value","block"]],["^1",["action","makeMap","obj","9835907b-df1e-4fb4-896b-28ed7bdb234a"]],["^1",["action","link","obj","a8f92bff-f165-48c1-92d0-0c9917e6768f","key","data","value","9835907b-df1e-4fb4-896b-28ed7bdb234a"]],["^1",["action","makeList","obj","8f99c006-76e4-4a60-a7aa-4ff00a93d6c3"]],["^1",["action","ins","obj","8f99c006-76e4-4a60-a7aa-4ff00a93d6c3","key","_head","elem",1]],["^1",["action","makeMap","obj","1325197e-9be5-4d0a-abc2-686fb63576dd"]],["^1",["action","set","obj","1325197e-9be5-4d0a-abc2-686fb63576dd","key","object","value","text"]],["^1",["action","makeList","obj","3a66be91-0869-4640-a949-cf6ff900e5d6"]],["^1",["action","ins","obj","3a66be91-0869-4640-a949-cf6ff900e5d6","key","_head","elem",1]],["^1",["action","makeMap","obj","481f45fb-718b-47ec-aa92-cd06af9bfea8"]],["^1",["action","set","obj","481f45fb-718b-47ec-aa92-cd06af9bfea8","key","object","value","leaf"]],["^1",["action","makeList","obj","69b74083-fcde-4b15-808c-a0c3784fb6dc"]],["^1",["action","link","obj","481f45fb-718b-47ec-aa92-cd06af9bfea8","key","marks","value","69b74083-fcde-4b15-808c-a0c3784fb6dc"]],["^1",["action","makeList","obj","b77800e5-bb55-4528-9602-e4268c178025"]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","_head","elem",1]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","value","t"]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","elem",2]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:2","value","y"]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:2","elem",3]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:3","value","p"]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:3","elem",4]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:4","value","e"]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:4","elem",5]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:5","value"," "]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:5","elem",6]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:6","value","h"]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:6","elem",7]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:7","value","e"]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:7","elem",8]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:8","value","r"]],["^1",["action","ins","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:8","elem",9]],["^1",["action","set","obj","b77800e5-bb55-4528-9602-e4268c178025","key","deb6af66-3f50-4706-96b1-2ba67705a04b:9","value","e"]],["^1",["action","link","obj","481f45fb-718b-47ec-aa92-cd06af9bfea8","key","text","value","b77800e5-bb55-4528-9602-e4268c178025"]],["^1",["action","link","obj","3a66be91-0869-4640-a949-cf6ff900e5d6","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","value","481f45fb-718b-47ec-aa92-cd06af9bfea8"]],["^1",["action","link","obj","1325197e-9be5-4d0a-abc2-686fb63576dd","key","leaves","value","3a66be91-0869-4640-a949-cf6ff900e5d6"]],["^1",["action","link","obj","8f99c006-76e4-4a60-a7aa-4ff00a93d6c3","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","value","1325197e-9be5-4d0a-abc2-686fb63576dd"]],["^1",["action","link","obj","a8f92bff-f165-48c1-92d0-0c9917e6768f","key","nodes","value","8f99c006-76e4-4a60-a7aa-4ff00a93d6c3"]],["^1",["action","set","obj","a8f92bff-f165-48c1-92d0-0c9917e6768f","key","type","value","line"]],["^1",["action","link","obj","3ec325ac-eddb-437a-97a5-7436174c9bdb","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","value","a8f92bff-f165-48c1-92d0-0c9917e6768f"]],["^1",["action","link","obj","00000000-0000-0000-0000-000000000000","key","document","value","698323cb-d8db-433d-b896-f80b173b15d9"]],["^1",["action","makeList","obj","10be76b3-93aa-4e8a-a28e-1d8b4e6e654d"]],["^1",["action","ins","obj","10be76b3-93aa-4e8a-a28e-1d8b4e6e654d","key","_head","elem",1]],["^1",["action","makeMap","obj","cbb720e3-69e8-482b-94a2-32c6aba02c1f"]],["^1",["action","set","obj","cbb720e3-69e8-482b-94a2-32c6aba02c1f","key","object","value","block"]],["^1",["action","makeMap","obj","886b0d9f-5019-464b-93d5-d58b379a8cd2"]],["^1",["action","link","obj","cbb720e3-69e8-482b-94a2-32c6aba02c1f","key","data","value","886b0d9f-5019-464b-93d5-d58b379a8cd2"]],["^1",["action","makeList","obj","e1fd2c90-c948-4078-8bfa-35f95e0c01d5"]],["^1",["action","ins","obj","e1fd2c90-c948-4078-8bfa-35f95e0c01d5","key","_head","elem",1]],["^1",["action","makeMap","obj","a4b299db-91aa-4db5-ae13-eeaeea54c2f8"]],["^1",["action","set","obj","a4b299db-91aa-4db5-ae13-eeaeea54c2f8","key","object","value","text"]],["^1",["action","makeList","obj","1299291b-5602-4bda-9566-46fb71b3b268"]],["^1",["action","ins","obj","1299291b-5602-4bda-9566-46fb71b3b268","key","_head","elem",1]],["^1",["action","makeMap","obj","f6a8750d-5d3a-4f78-a459-f2dea437437d"]],["^1",["action","set","obj","f6a8750d-5d3a-4f78-a459-f2dea437437d","key","object","value","leaf"]],["^1",["action","makeList","obj","11b18e49-c4a4-4edd-a8c9-44873fe3f3ec"]],["^1",["action","link","obj","f6a8750d-5d3a-4f78-a459-f2dea437437d","key","marks","value","11b18e49-c4a4-4edd-a8c9-44873fe3f3ec"]],["^1",["action","makeList","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071"]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","_head","elem",1]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","value","t"]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","elem",2]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:2","value","y"]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:2","elem",3]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:3","value","p"]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:3","elem",4]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:4","value","e"]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:4","elem",5]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:5","value"," "]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:5","elem",6]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:6","value","h"]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:6","elem",7]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:7","value","e"]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:7","elem",8]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:8","value","r"]],["^1",["action","ins","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:8","elem",9]],["^1",["action","set","obj","a18c8e10-5c33-49d5-ab7e-169664cb8071","key","deb6af66-3f50-4706-96b1-2ba67705a04b:9","value","e"]],["^1",["action","link","obj","f6a8750d-5d3a-4f78-a459-f2dea437437d","key","text","value","a18c8e10-5c33-49d5-ab7e-169664cb8071"]],["^1",["action","link","obj","1299291b-5602-4bda-9566-46fb71b3b268","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","value","f6a8750d-5d3a-4f78-a459-f2dea437437d"]],["^1",["action","link","obj","a4b299db-91aa-4db5-ae13-eeaeea54c2f8","key","leaves","value","1299291b-5602-4bda-9566-46fb71b3b268"]],["^1",["action","link","obj","e1fd2c90-c948-4078-8bfa-35f95e0c01d5","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","value","a4b299db-91aa-4db5-ae13-eeaeea54c2f8"]],["^1",["action","link","obj","cbb720e3-69e8-482b-94a2-32c6aba02c1f","key","nodes","value","e1fd2c90-c948-4078-8bfa-35f95e0c01d5"]],["^1",["action","set","obj","cbb720e3-69e8-482b-94a2-32c6aba02c1f","key","type","value","line"]],["^1",["action","link","obj","10be76b3-93aa-4e8a-a28e-1d8b4e6e654d","key","deb6af66-3f50-4706-96b1-2ba67705a04b:1","value","cbb720e3-69e8-482b-94a2-32c6aba02c1f"]],["^1",["action","link","obj","698323cb-d8db-433d-b896-f80b173b15d9","key","nodes","value","10be76b3-93aa-4e8a-a28e-1d8b4e6e654d"]]]],"actor","deb6af66-3f50-4706-96b1-2ba67705a04b","seq",1,"deps",["^1",[]],"message","init"]]]]';

const newDocId = '1';
let docSet = new (Automerge as any).DocSet(); // can't figure out how to type this properly
docSet.registerHandler((id: any, doc: any) => console.log('handler', id, JSON.stringify(doc)));
const doc = createNewDocument(newDocId);

// console.log('\n');

// console.log((Automerge as any).save(doc));
// console.log('\n');

docSet.setDoc(newDocId, doc);

logger.log('info', 'docset', docSet);

const checkAccess = async () => true;
const loadDocument = async () => {};
const saveDocument = async (figurethisout: any, soon: any) => {};

const documentRepo = new DocumentRepository({
  checkAccess,
  loadDocument,
  saveDocument,
  initialDocSet: docSet,
  logger,
});

console.log(doc);
const valString = (Automerge as any).save(doc);

logger.log('info', 'initial automerge val', valString);

console.log(valString);
const app = express();
const expressWs = expressWsFactory(app);
app.set('trust proxy', true);
app.use('/', express.static(__dirname + '/public'));
app.use(expressLogger('dev'));
app.use(helmet());
app.use(cors());
app.use(compression());
app.get('/', (_, res) => res.send('Welcome to the Conduit Relay API'));
app.get('/healthcheck', (_, res) => res.sendStatus(200));

// Set up Redis
const redisPublisher = config.REDIS_URL ? createClient(config.REDIS_URL) : createClient();
logger.log('verbose', 'Redis Publisher setup');
const redisSubscriber = config.REDIS_URL ? createClient(config.REDIS_URL) : createClient();
logger.log('verbose', 'Redis Subscriber setup');
logger.log('debug', 'Connected to Redis instance');

// rest api
app.use('/api/v0', v0ApiRouterFactory(documentRepo, logger));

const wss = expressWs.getWss();
const webSocketNode = new WebSocketNode({
  wss,
  logger,
  documentRepository: documentRepo,
});
(app as any).ws('/ws', (ws: any, req: any, next: any) =>
  webSocketNode.connectionHandler(ws, req, next)
);

logger.log('verbose', 'Configured WebSocket endpoints');

app.use((req: Request, res: Response, next: NextFunction) => {
  const err = new Error('Not Found') as any;
  err['status'] = 404;
  next(err);
});

app.use((error: ResponseError | Error | any, req: Request, res: Response, next: NextFunction) => {
  res.status(error.status || 500);
  res.json({ ...error });
});

logger.log('info', 'meow', { foo: 'bar' });

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

app.listen(config.PORT), logger.log('info', `Conduit started on port ${config.PORT}`);
