import Automerge from 'automerge';
import { Logger } from 'winston';
import { Publisher } from './redis-publisher';
import { Subscriber } from './redis-subscriber';
import { RedisBasicClient } from './redis-client';

const DOCUMENT_EVENT_STREAM_TOPIC_WILDCARD = 'jot:doc:*';
const DEFAULT_DOC_INACTIVE_TIME_IN_SECONDS = 3600;
const DOCUMENT_REDIS_TOPICS = {
  ACTIVE_USERS: 'active-users',
};

export type CRDTDocument = Automerge.AutomergeRoot;

export interface DocumentMetadata {
  activeUsers: Set<string>;
  activeAgentCount: number;
}

export interface IDocumentRepositoryConfig {
  initialDocSet?: DocSet;
  publisher: Publisher;
  subscriber: Subscriber;
  redisClient: RedisBasicClient;
  logger?: Logger;
}

export interface DocSet {
  getDoc: (docId: string) => CRDTDocument | null;
  applyChanges: Function;
}

export interface IDocumentRepository {
  getDoc(id: string): Promise<CRDTDocument | null>;
}

export class DocumentRepository implements IDocumentRepository {
  docSet: DocSet;
  publisher: Publisher;
  subscriber: Subscriber;
  redisClient: RedisBasicClient;
  logger?: Logger;
  docStreamListeners: Set<any>;
  constructor({ initialDocSet, logger, publisher, subscriber, redisClient }: IDocumentRepositoryConfig) {
    this.publisher = publisher;
    this.subscriber = subscriber;
    this.redisClient = redisClient;
    this.docSet = initialDocSet || new (Automerge as any).DocSet();
    this.docStreamListeners = new Set();
    this.logger = logger;

    this.subscribeToRedisDocStream();
    this.testPublishDocEventStream();
  }

  public addDocStreamListener = (cbFn: Function): Function => {
    this.docStreamListeners.add(cbFn);
    const removeFn = () => this.docStreamListeners.delete(cbFn);
    return removeFn;
  };

  public joinDocument = async (docId: string, userId: string) => {
    await this.addUserToDocActiveList(docId, userId);
    this.log('verbose', `DocumentRepository:joinDocument:User ${userId} joined doc ${docId}`);
  };

  public leaveDocument = async (docId: string, userId: string) => {
    await this.removeUserToDocActiveList(docId, userId);
    this.log('verbose', `DocumentRepository:leaveDocument:User ${userId} left doc ${docId}`);
  };

  public async getDoc(id: string): Promise<CRDTDocument | null> {
    this.log('debug', `DocumentRepository:getDoc(${id}):Fetching doc`);
    const doc = this.docSet.getDoc(id);
    if (!doc) {
      this.log('silly', `DocumentRepository:getDoc(${id}):Doc does not exist, returning`);
      return null;
    }
    this.log('silly', `DocumentRepository:getDoc(${id}):Doc exists, returning`);
    return doc as CRDTDocument;
  }

  // antipattern need to find a better way
  public getDocSet = () => {
    return this.docSet;
  };

  private subscribeToRedisDocStream = async () => {
    // Handler for getting pattern message from DOC_EVENT_STREAM_TOPIC_WILDCARD
    this.subscriber.getSubscriber().on('pmessage', (pattern, channel, message) => {
      this.log('verbose', `DocStream message received from channel ${channel} (triggered via pattern ${pattern})`);
      this.log('silly', `Calling all ${this.docStreamListeners.size} docStreamListeners with message`);
      this.docStreamListeners.forEach(f => f(message));
    });
    // Handler triggered on new redis psubscriptions
    // this.subscriber.getSubscriber().on('psubscribe', (pattern, _count) => {
    //   this.log('verbose', `Redis psubscription for DocumentRepository's Doc event stream setup using pattern ${pattern}`)
    // });
    this.subscriber.getSubscriber().psubscribe(DOCUMENT_EVENT_STREAM_TOPIC_WILDCARD);
  };

  private testPublishDocEventStream = () => {
    setTimeout(() => this.publisher.publish('jot:doc:yeeeeet', { skirt: 'skurt' }), 500);
  };

  private addUserToDocActiveList = async (docId: string, userId: string) => {
    const topic = `jot:doc:${docId}:${DOCUMENT_REDIS_TOPICS.ACTIVE_USERS}`;
    await this.redisClient.sadd(topic, userId);
    await this.redisClient.expire(topic, DEFAULT_DOC_INACTIVE_TIME_IN_SECONDS);
    this.log(
      'verbose',
      `DocumentRepository:addUserToDocActiveList:Added user ${userId} to active user list for doc ${docId}`,
    );
  };

  private removeUserToDocActiveList = async (docId: string, userId: string) => {
    const topic = `jot:doc:${docId}:${DOCUMENT_REDIS_TOPICS.ACTIVE_USERS}`;
    await this.redisClient.srem(topic, userId);
    this.log(
      'verbose',
      `DocumentRepository:removeUserToDocActiveList:Removed user ${userId} from active user list for doc ${docId}`,
    );
  };

  private getActiveUserListForDoc = async (docId: string) => {
    const topic = `jot:doc:${docId}:${DOCUMENT_REDIS_TOPICS.ACTIVE_USERS}`;
    return this.redisClient.smembers(topic);
  };

  private async createNewDoc(docId: string): Promise<CRDTDocument> {
    return Automerge.change(Automerge.init(), doc => {
      doc.docId = docId;
    });
  }

  private log(level: string, e: string, metadata?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, e, metadata);
  }
}

const serializeDoc = (doc: CRDTDocument): string => {
  return Automerge.save(doc);
};

export { serializeDoc };
