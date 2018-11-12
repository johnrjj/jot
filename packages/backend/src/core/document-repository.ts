import Automerge from 'automerge';
import { Logger } from 'winston';
import { Publisher } from './redis-publisher';
import { Subscriber } from './redis-subscriber';
import { RedisBasicClient } from './redis-client';
import { RedisMessageCreator, DocumentRedisMessages } from './redis-types';

const DOCUMENT_TOPIC_ROOT = 'jot:doc';
const DOCUMENT_EVENT_STREAM_TOPIC_WILDCARD = 'jot:doc:*';
const DEFAULT_DOC_INACTIVE_TIME_IN_SECONDS = 3600;
const DOCUMENT_REDIS_TOPICS = {
  DOCUMENT_ACTIVE_USER_LIST_UPDATE: 'active-users:update',
  DOCUMENT_ACTIVE_USERS_SET: '_state:active-users',
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
  docStreamListeners: Set<(DocumentRedisMessages) => void>;
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

  public addDocStreamListener = (cbFn: (DocumentRedisMessages) => void): (() => void) => {
    this.docStreamListeners.add(cbFn);
    const unsubscribe = () => this.docStreamListeners.delete(cbFn);
    return unsubscribe;
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

  private handleRedisDocStreamMessage = (pattern: string, channel: string, message: string) => {
    if (!pattern.startsWith(DOCUMENT_TOPIC_ROOT)) {
      this.log('warn', 'DocumentRepository Redis subscription recieved a message from an unrelated stream');
      this.log('warn', 'This is not inherently bad, just ensure we are not crossing data topic streams poorly');
      return;
    }
    this.log('verbose', `DocStream message received from channel ${channel} (triggered via pattern ${pattern})`);
    this.log('silly', `Calling all ${this.docStreamListeners.size} docStreamListeners with message`);

    let msgJson: DocumentRedisMessages;
    try {
      msgJson = JSON.parse(message);
    } catch (e) {
      this.log('error', 'Error parsing redis message', message);
      throw e;
    }
    this.docStreamListeners.forEach(f => f(msgJson));
  };

  private subscribeToRedisDocStream = (): void => {
    // Set up redis handler
    this.subscriber.getSubscriber().on('pmessage', this.handleRedisDocStreamMessage);
    // Initiate redis doc stream subscription
    this.subscriber.getSubscriber().psubscribe(DOCUMENT_EVENT_STREAM_TOPIC_WILDCARD);
  };

  private testPublishDocEventStream = () => {
    setTimeout(() => this.publisher.publish('jot:doc:baz', { foo: 'bar' }), 500);
  };

  private addUserToDocActiveList = async (docId: string, userId: string) => {
    const userListTopic = `jot:doc:${docId}:${DOCUMENT_REDIS_TOPICS.DOCUMENT_ACTIVE_USERS_SET}`;
    await this.redisClient.sadd(userListTopic, userId);
    await this.redisClient.expire(userListTopic, DEFAULT_DOC_INACTIVE_TIME_IN_SECONDS);
    const activeUserList = (await this.redisClient.smembers(userListTopic)) || [];
    const updateEventTopic = `${userListTopic}:update`;
    const activeUserListUpdateMessage = RedisMessageCreator.createDocumentActiveUserListUpdateMessage({
      docId,
      addedIds: [userId],
      removedIds: [],
      activeIds: activeUserList,
      channel: updateEventTopic,
    });
    this.publisher.publish(`${userListTopic}:update`, activeUserListUpdateMessage);
    this.log(
      'verbose',
      `DocumentRepository:addUserToDocActiveList:Added user ${userId} to active user list for doc ${docId}`,
    );
  };

  private removeUserToDocActiveList = async (docId: string, userId: string) => {
    const topic = `jot:doc:${docId}:${DOCUMENT_REDIS_TOPICS.DOCUMENT_ACTIVE_USERS_SET}`;
    await this.redisClient.srem(topic, userId);
    this.log(
      'verbose',
      `DocumentRepository:removeUserToDocActiveList:Removed user ${userId} from active user list for doc ${docId}`,
    );
  };

  private getActiveUserListForDoc = async (docId: string) => {
    const topic = `jot:doc:${docId}:${DOCUMENT_REDIS_TOPICS.DOCUMENT_ACTIVE_USERS_SET}`;
    return this.redisClient.smembers(topic);
  };

  private async createNewDoc(docId: string): Promise<CRDTDocument> {
    return Automerge.change(Automerge.init(), doc => {
      doc.docId = docId;
    });
  }

  private log = (level: string, e: string, metadata?: any) => {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, e, metadata);
  };
}

const serializeDoc = (doc: CRDTDocument): string => {
  return Automerge.save(doc);
};

export { serializeDoc };
