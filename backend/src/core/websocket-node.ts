import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import { Logger } from 'winston';
import Automerge from 'automerge';
import { fromJS } from 'immutable';
import uuid from 'uuid/v4';
import { DocumentRepository } from './document-repository';

interface ConnectionContext {
  socket: WebSocket;
  initialized: boolean;
  subscriptions: Array<string>;
  subscriptionCount: number;
  subscriptionIdMap: Map<string, number>;
}

// todo type
type MessageType = 'keepalive';
type ChannelType = 'keepalive';

export interface WebSocketMessage<T> {
  type: MessageType;
  channel: ChannelType;
  channelId?: number;
  payload: T;
}

export interface AutomergeConnection {
  open: () => void;
  receiveMsg: (msg: any) => void;
}

export class WebSocketNode {
  private wsServerRef: WebSocket.Server;
  private logger?: Logger;
  private documentRepository: DocumentRepository;
  private connections: Set<ConnectionContext>;
  private connectionAutomerge: Map<string, AutomergeConnection>;
  private id: string;

  constructor({
    wss,
    logger,
    documentRepository,
  }: {
    wss: WebSocket.Server;
    logger?: Logger;
    documentRepository: DocumentRepository;
  }) {
    this.wsServerRef = wss;
    this.logger = logger;
    this.documentRepository = documentRepository;
    this.connections = new Set();
    this.connectionAutomerge = new Map();
    this.id = `ws-node-${uuid()}`;
    this.log('verbose', `WebSocket Server node ${this.id} online`);
  }

  private getConnectionsCount() {
    return this.connections.size;
  }

  public async connectionHandler(
    socket: WebSocket,
    req: Request,
    next: NextFunction
  ): Promise<void> {
    this.log('verbose', `WebSocket client connected to WebSocket Server node ${this.id}`);

    const connectionContext: ConnectionContext = {
      socket,
      subscriptions: [],
      initialized: false,
      subscriptionCount: 0,
      subscriptionIdMap: new Map(),
    };
    socket.on('error', err => this.log('error', JSON.stringify(err)));
    socket.on('close', this.handleDisconnectFromClientSocket(connectionContext));
    socket.on('message', this.onMessageFromClientSocket(connectionContext));
    this.connections.add(connectionContext);
    this.log(
      'debug',
      `WebSocket Server ${
        this.id
      }: ${this.getConnectionsCount()} total active connections. (added 1)`
    );
  }

  private onMessageFromClientSocket(connectionContext: ConnectionContext) {
    let isClientConnected = false;

    return async (message: any) => {
      // initialize
      if (!connectionContext.initialized) {
        this.sendKeepAlive(connectionContext);
        const keepAliveTimer = setInterval(() => {
          if (connectionContext.socket.readyState === WebSocket.OPEN) {
            this.sendKeepAlive(connectionContext);
          } else {
            clearInterval(keepAliveTimer);
            if (this.connections.has(connectionContext)) {
              this.log('debug', 'Keepalive found a stale connection, removing');
              this.handleDisconnectFromClientSocket(connectionContext);
            }
          }
        }, 20000);
        connectionContext.initialized = true;
      }

      this.log(
        'verbose',
        `WebSocket Server node ${this.id} received message from a client WebSocket`,
        message
      );
      let data = { type: 'default' };
      try {
        data = JSON.parse(message.toString());
      } catch {
        data = message;
      }
      switch (data.type) {
        case 'automerge-connection-send':
          this.log('verbose', 'automerge-connection-send', (data as any).payload);

          if (isClientConnected) {
            // const { clientId, docId, message } = (data as any).payload;
            const connection = this.connectionAutomerge.get((data as any).payload.clientId);
            this.log(
              'verbose',
              'websocket node connection received message from automerge-connection-send'
            );
            const updatedDoc = connection && connection.receiveMsg((data as any).payload.message);
          } else {
            setTimeout(() => {
              // const { clientId, docId, message } = (data as any).payload;
              const connection = this.connectionAutomerge.get((data as any).payload.clientId);
              this.log(
                'verbose',
                'websocket node connection received message from automerge-connection-send'
              );
              const updatedDoc = connection && connection.receiveMsg((data as any).payload.message);
            }, 1000);
          }
          break;
        case 'send-operation':
          this.log('debug', 'applying operation', data);
          const appliedChanges = this.documentRepository
            .getDocSet()
            .applyChanges('1', fromJS((data as any).payload.changes));
          break;
        case 'join-document':
          this.log('debug', `WebSocket subscribe request received`, data);
          const subscribeRequest = data as WebSocketMessage<any>;
          let { docId, clientId } = subscribeRequest.payload;
          this.log('debug', `join-request, for docId: ${docId} , clientId: ${clientId}`);
          let doc;
          try {
            // doc will autocreate a new doc for us!
            doc = await this.documentRepository.getDoc(docId);
          } catch (e) {
            this.log('error', `error:join-document getting doc id ${docId}`, e);
          }
          if (!this.connectionAutomerge.has(clientId)) {
            this.log('silly', `connectionAutomerge adding ${clientId}`);
            this.connectionAutomerge.set(
              clientId,
              new (Automerge as any).Connection(
                this.documentRepository.getDocSet(),
                (message: any) => {
                  this.log(
                    'silly',
                    `websocket node ${this.id}: connectionAutomerge sending message to ${clientId}`,
                    message
                  );
                  connectionContext.socket.send(
                    JSON.stringify({ type: 'server-update', payload: message })
                  );
                }
              )
            );
            this.log('silly', `connectionAutomerge opening connection for ${clientId}`);
            (this.connectionAutomerge.get(clientId) as AutomergeConnection).open();
          }
          break;
        default:
          this.log(
            'debug',
            `Unrecognized message type ${data.type} received from client websocket`
          );
          break;
      }
    };
  }

  private handleDisconnectFromClientSocket(context: ConnectionContext) {
    return (code: number, reason: string) => {
      this.log('verbose', `WebSocket connection closed with code ${code}`, reason);
      this.connections.delete(context);
      this.log(
        'debug',
        `WebSocket Server ${
          this.id
        }: ${this.getConnectionsCount()} total active connections remaining. (removed 1)`
      );
    };
  }

  private sendKeepAlive(connectionContext: ConnectionContext): void {
    this.sendMessage(connectionContext, { type: 'keepalive', channel: 'keepalive', payload: {} });
  }

  private sendMessage(connectionContext: ConnectionContext, message: WebSocketMessage<any>): void {
    if (message && connectionContext.socket.readyState === WebSocket.OPEN) {
      connectionContext.socket.send(JSON.stringify(message));
    }
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
