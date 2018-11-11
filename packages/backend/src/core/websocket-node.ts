import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import { Logger } from 'winston';
import Automerge from 'automerge';
import uuid from 'uuid/v4';
import { DocumentRepository } from './document-repository';
import { WebSocketServerMessageCreator } from '@jot/common';
import { AutomergeConnection } from '@jot/common/src/types/automerge';
import {
  WebsocketClientMessages,
  UpdateClientSelectionMessage,
  RemoteAgentCursorUpdateFromServerMessage,
  JoinDocumentRequestMessage,
  AutomergeUpdateFromServerMessage,
  AutomergeUpdateToServerMessage,
  WebsocketServerMessages,
} from '@jot/common/dist/websockets/websocket-actions';

interface ConnectionContext {
  socket: WebSocket;
  initialized: boolean;
  agentId?: string;
  isClientConnected: boolean;
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
    documentRepository: DocumentRepository;
    logger?: Logger;
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
    _req: Request,
    _next: NextFunction,
  ): Promise<void> {
    this.log('verbose', `WebSocket client connected to WebSocket Server node ${this.id}`);
    const connectionContext: ConnectionContext = {
      socket,
      initialized: false,
      isClientConnected: false,
    };
    socket.on('error', err => this.log('error', JSON.stringify(err)));
    socket.on('close', this.handleDisconnectFromClientSocket(connectionContext));
    socket.on('message', this.onMessageFromClientSocket(connectionContext));
    this.connections.add(connectionContext);
    this.log(
      'debug',
      `WebsocketNode: Connection added. ${this.getConnectionsCount()} total connections.`,
    );
  }

  private initialize = connectionContext => {
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
    return connectionContext;
  };

  private onMessageFromClientSocket(ctx: ConnectionContext) {
    let connectionContext = ctx;
    return async (message: string | object) => {
      // initialize
      if (!connectionContext.initialized) {
        connectionContext = this.initialize(ctx);
      }
      let data: WebsocketClientMessages;
      try {
        data = JSON.parse(message.toString()) as WebsocketClientMessages;
      } catch {
        data = message as WebsocketClientMessages;
      }
      if (!data) {
        this.log('verbose', `WebSocket Server node ${this.id} received empty message`);
        return;
      }
      switch (data.type) {
        case 'automerge-connection-send':
          const autoConnectionMessage = data;
          const isClientConnected = await this.handleRecieveAutomergeServerUpdate(
            autoConnectionMessage,
            connectionContext.isClientConnected,
          );
          connectionContext.isClientConnected = isClientConnected;
          break;
        case 'remote-agent-setselection':
          if (!connectionContext.agentId) {
            this.log('error', `no agentId assigned, this shouldn't happen`);
          }
          const remoteAgentSelectionMessage = data;
          await this.handleReceiveRemoteAgentSetSelection(
            remoteAgentSelectionMessage,
            connectionContext.agentId as string,
            connectionContext.isClientConnected,
          );
          break;
        case 'join-document':
          this.log('debug', `WebSocket subscribe request received`, data);
          const joinDocumentRequestMessage = data;
          const res = await this.handleReceiveJoinDocumentRequest(
            connectionContext,
            joinDocumentRequestMessage,
          );
          connectionContext.agentId = res.agentId;
          break;
        default:
          this.log(
            'debug',
            `Unrecognized message received from client websocket ${connectionContext.agentId}`,
            data,
          );
          break;
      }
    };
  }

  private async handleReceiveRemoteAgentSetSelection(
    setSelectionMessage: UpdateClientSelectionMessage,
    agentId: string,
    isClientConnected: boolean,
  ) {
    if (isClientConnected && agentId) {
      this.log(
        'verbose',
        `${agentId} sent websocket server a set selection, going to broadcast cursor selection`,
      );
      const msg: RemoteAgentCursorUpdateFromServerMessage = WebSocketServerMessageCreator.createRemoteAgentCursorUpdateFromServerMessage(
        setSelectionMessage.payload,
      );
      this.connections.forEach(c => {
        c.socket.send(JSON.stringify(msg));
      });
    }
  }

  private async handleReceiveJoinDocumentRequest(
    connectionContext: ConnectionContext,
    joinRequestMessage: JoinDocumentRequestMessage,
  ) {
    const subscribeRequest = joinRequestMessage;
    let { docId, clientId } = subscribeRequest.payload;
    const agentId: string = clientId;
    this.log('debug', `join-request, for docId: ${docId} , agentId(sent as clientId): ${agentId}`);
    try {
      await this.documentRepository.getDoc(docId);
      await this.documentRepository.joinDocument(docId, clientId);
    } catch (e) {
      this.log('error', `error:join-document getting doc id ${docId} agentId:${agentId}`, e);
    }
    if (!this.connectionAutomerge.has(agentId)) {
      this.log('silly', `connectionAutomerge adding ${agentId}`);
      const connection = new (Automerge as any).Connection(
        this.documentRepository.getDocSet(),
        (message: any) => {
          this.log(
            'silly',
            `websocket node ${this.id}: connectionAutomerge sending message to ${agentId}`,
          );
          const msg: AutomergeUpdateFromServerMessage = WebSocketServerMessageCreator.createAutomergeUpdateFromServerMessage(
            message,
          );
          connectionContext.socket.send(JSON.stringify(msg));
        },
      );
      this.connectionAutomerge.set(agentId, connection);
      this.log('silly', `connectionAutomerge opening connection for ${agentId}`);
      (this.connectionAutomerge.get(agentId) as AutomergeConnection).open();
      connectionContext.agentId = agentId;
    }
    return { agentId };
  }

  private handleRecieveAutomergeServerUpdate = (
    msg: AutomergeUpdateToServerMessage,
    isClientConnected: boolean,
  ): Promise<boolean> =>
    new Promise((accept, _reject) => {
      if (isClientConnected) {
        // const { clientId, docId, message } = (data as any).payload;
        const connection = this.connectionAutomerge.get(msg.payload.clientId);
        this.log(
          'verbose',
          'websocket node connection received message from automerge-connection-send',
        );
        const updatedDoc = connection && connection.receiveMsg(msg.payload.message);
        return accept(true);
      } else {
        setTimeout(() => {
          const connection = this.connectionAutomerge.get(msg.payload.clientId);
          this.log(
            'verbose',
            'websocket node connection received message from automerge-connection-send',
          );
          const updatedDoc = connection && connection.receiveMsg(msg.payload.message);
          isClientConnected = true;
          return accept(true);
        }, 1000);
      }
    });

  private handleDisconnectFromClientSocket = (context: ConnectionContext) => {
    return (code: number, reason: string) => {
      this.log('verbose', `WebSocket connection closed with code ${code}`, reason);
      // Close automerge connection, or else will throw error
      this.log('silly', `connectionAutomerge close connection for ${context.agentId}`);
      if (context.agentId && this.connectionAutomerge.has(context.agentId)) {
        this.log('silly', `Cleaning up agentId ${context.agentId} automerge connection`);
        (this.connectionAutomerge.get(context.agentId) as AutomergeConnection).close();
      }
      this.connections.delete(context);
      this.log(
        'debug',
        `WebSocket Server ${
          this.id
        }: ${this.getConnectionsCount()} total active connections remaining. (removed 1)`,
      );
    };
  };

  private sendKeepAlive(connectionContext: ConnectionContext): void {
    const msg = WebSocketServerMessageCreator.createKeepaliveFromServerMessage();
    this.sendMessage(connectionContext, msg);
  }

  private sendMessage(
    connectionContext: ConnectionContext,
    message: WebsocketServerMessages,
  ): void {
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
