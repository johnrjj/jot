import Automerge from 'automerge';
import { Logger } from 'winston';
import { Publisher } from './redis-publisher';
import { Subscriber } from './redis-subscriber';
import { RedisBasicClient } from './redis-client';

const DOC_EVENT_STREAM_TOPIC_WILDCARD = 'jot:doc:*';
const DEFAULT_DOC_INACTIVE_TIME_IN_SECONDS = 3600;
const TOPICS = {
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
  serializeDoc(doc: CRDTDocument): string;
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

  public serializeDoc(doc: CRDTDocument): string {
    return Automerge.save(doc);
  }

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
    this.subscriber.getSubscriber().psubscribe(DOC_EVENT_STREAM_TOPIC_WILDCARD);
  };

  private testPublishDocEventStream = () => {
    setTimeout(() => this.publisher.publish('jot:doc:yeeeeet', { skirt: 'skurt' }), 500);
  };

  private addUserToDocActiveList = async (docId: string, userId: string) => {
    const topic = `jot:doc:${docId}:${TOPICS.ACTIVE_USERS}`;
    await this.redisClient.sadd(topic, userId);
    await this.redisClient.expire(topic, DEFAULT_DOC_INACTIVE_TIME_IN_SECONDS);
    this.log(
      'verbose',
      `DocumentRepository:addUserToDocActiveList:Added user ${userId} to active user list for doc ${docId}`,
    );
  };

  private removeUserToDocActiveList = async (docId: string, userId: string) => {
    const topic = `jot:doc:${docId}:${TOPICS.ACTIVE_USERS}`;
    await this.redisClient.srem(topic, userId);
    this.log(
      'verbose',
      `DocumentRepository:removeUserToDocActiveList:Removed user ${userId} from active user list for doc ${docId}`,
    );
  };

  private getActiveUserListForDoc = async (docId: string) => {
    const topic = `jot:doc:${docId}:${TOPICS.ACTIVE_USERS}`;
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

  // handleSocket(ws, req) {
  //   console.log('open')
  //   const docSet = new DocSet()

  //   docSet.registerHandler((id, doc) => console.log('handler', id, doc))

  //   let subscribedDocuments = [] // Document[]
  //   let subscribingDocuments = [] // { id: string, cancel: boolean }[]
  //   const removeFromSubscribedDocuments = id => {
  //     subscribingDocuments = subscribingDocuments.filter(d => d.id !== id)
  //     subscribedDocuments = subscribedDocuments.filter(d => d.id !== id)
  //   }

  //   const send = (action, data) =>
  //     console.log('sending', action, data) ||
  //     ws.send(JSON.stringify({ action, ...data }))

  //   const autocon = new Automerge.Connection(docSet, data => {
  //     send('automerge', { data })
  //   })

  //   const subscribeToDoc = id => {
  //     if (
  //       subscribingDocuments.some(a => a.id === id) ||
  //       subscribedDocuments.some(a => a.id === id)
  //     ) {
  //       send('error', {
  //         message: 'Already subscribed or subscribing',
  //         id,
  //       })
  //       return
  //     }
  //     subscribingDocuments.push({ id, cancel: false })

  //     this.checkAccess(id, req)
  //       .then(access => {
  //         if (access) {
  //           return this.getDoc(id)
  //         } else {
  //           send('error', {
  //             message: 'Access denied',
  //             id,
  //           })
  //           removeFromSubscribedDocuments(id)
  //           return null
  //         }
  //       })
  //       .then(doc => {
  //         if (doc === null) return
  //         if (doc === false) {
  //           // 404
  //           send('error', {
  //             message: 'Document not found',
  //             id,
  //           })
  //           removeFromSubscribedDocuments(id)
  //         } else {
  //           const { cancel } = subscribingDocuments.find(d => d.id === id)
  //           if (!cancel) {
  //             doc.addToSet(docSet)
  //             subscribedDocuments.push(doc)
  //             send('subscribed', { id })
  //           }
  //           subscribingDocuments = subscribingDocuments.filter(d => d.id !== id)
  //         }
  //       })
  //       .catch(e => {
  //         removeFromSubscribedDocuments(id)
  //         send('error', {
  //           message: 'Internal server error',
  //           id,
  //         })
  //         console.error('Error occurred while checking access for ' + id)
  //         console.error(e)
  //       })
  //   }

  //   const unsubscribe = id => {
  //     const subscribing = subscribingDocuments.find(d => d.id === id)
  //     if (subscribing) {
  //       subscribing.cancel = true
  //     } else {
  //       const subscribed = subscribedDocuments.find(d => d.id === id)
  //       subscribed.removeFromSet(docSet)
  //       subscribedDocuments = subscribedDocuments.filter(d => d.id !== id)
  //     }
  //   }

  //   const automergeMessage = data => {
  //     console.log(data)
  //     if (subscribedDocuments.some(doc => doc.id === data.docId)) {
  //       autocon.receiveMsg(data)
  //     } else {
  //       send('error', {
  //         message: 'Sending changes to doc which you are not subscribed to',
  //       })
  //     }
  //   }

  //   const handleFrame = frame => {
  //     console.log('handling', frame)
  //     if (frame.action === 'automerge') {
  //       automergeMessage(frame.data)
  //     } else if (frame.action === 'error') {
  //       console.error('Recieved error frame from client', frame)
  //     } else if (frame.action === 'subscribe') {
  //       frame.ids.forEach(id => subscribeToDoc(id))
  //     } else if (frame.action === 'unsubscribe') {
  //       frame.ids.forEach(id => unsubscribe(id))
  //     } else {
  //       send('error', {
  //         message: 'Unknown action ' + frame.action,
  //       })
  //     }
  //   }

  //   ws.on('message', message => {
  //     try {
  //       const frame = JSON.parse(message.toString())
  //       if (typeof frame === 'object' && frame !== null) {
  //         handleFrame(frame)
  //       }
  //     } catch (e) {
  //       console.error(e)
  //     }
  //   })

  //   autocon.open()

  //   ws.on('close', () => {
  //     console.log('close')
  //     autocon.close()
  //     subscribedDocuments.forEach(doc => doc.removeFromSet(docSet))
  //   })
  // }
}

// class Document {
//   doc: any;
//   id: string;
//   sets: Array<any>;
//   onChange: Function;
//   constructor(id: string, onChange: Function) {
//     this.sets = [] // { set, handler }
//     this.id = id
//     this.onChange = onChange
//   }

//   set(doc: any) {
//     this.doc = doc
//     this.onChange(this.id, this.doc)

//     for (const set of this.sets) {
//       set.setDoc(this.id, this.doc)
//     }
//     return this
//   }

//   addToSet(docSet: any) {
//     if (this.sets.some(set => set.set === docSet)) {
//       // prevent adding twice
//       return
//     }

//     docSet.setDoc(this.id, this.doc)

//     const handler = (docId: string, doc: any) => {
//       console.log('handler', docId, doc)
//       if (docId !== this.id) return // not this doc
//       if (doc === this.doc) return // already handled
//       this.doc = doc
//       this.onChange(this.id, this.doc)

//       for (const other of this.sets) {
//         if (other.set === docSet) continue
//         other.set.setDoc(docId, doc)
//       }
//     }
//     docSet.registerHandler(handler)
//     this.sets.push({ set: docSet, handler })
//   }

//   removeFromSet(docSet: any) {
//     const set = this.sets.find(set => set.set === docSet)
//     if (!set) return // this doc is not in specified set

//     docSet.unregisterHandler(set.handler)
//     this.sets = this.sets.filter(set => set.set !== docSet)
//   }
// }
