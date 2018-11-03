import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import { Logger } from 'winston';
import Automerge from 'automerge';
import uuid from 'uuid/v4';
import { DocumentRepository } from './document-repository';

interface ConnectionContext {
  socket: WebSocket;
  initialized: boolean;
  agentId?: string;
  subscriptions: Array<string>;
  subscriptionCount: number;
  subscriptionIdMap: Map<string, number>;
}

type MessageType =
  | 'keepalive'
  | 'automerge-connection-send'
  | 'remote-agent-setselection'
  | 'join-document'
  | 'undefined';

type ChannelType = 'keepalive';

export interface AutomergeUpdatePayload {
  clientId: string;
  docId: string;
  message: string;
}

export interface RemoteAgentSetSelectionPayload {
  clientId: string;
  docId: string;
  message: {
    anchor: any;
    focus: any;
    mark: any;
  };
}

export interface JoinDocumentRequestPayload {
  clientId: string;
  docId: string;
  message: string;
}

export interface WebSocketMessage<
  T extends AutomergeUpdatePayload | JoinDocumentRequestPayload | RemoteAgentSetSelectionPayload
> {
  type: MessageType;
  channel?: ChannelType;
  payload: T;
}

export interface AutomergeConnection {
  open: () => void;
  close: () => void;
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
    let isClientConnected: boolean = false;
    let agentId: string | null = null;

    return async (message: string | object) => {
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
      let data: WebSocketMessage<any> = { type: 'undefined', payload: {} };
      try {
        data = JSON.parse(message.toString());
      } catch {
        data = message as WebSocketMessage<any>;
      }
      switch (data.type as MessageType) {
        case 'automerge-connection-send':
          const autoConnectionMessage = data as WebSocketMessage<AutomergeUpdatePayload>;
          this.log('verbose', 'automerge-connection-send', autoConnectionMessage.payload);
          isClientConnected = await this.handleRecieveAutomergeServerUpdate(
            autoConnectionMessage,
            isClientConnected
          );
          break;
        case 'remote-agent-setselection':
          this.log('debug', `Received remote-agent-setselection from agentId ${agentId}`, data);
          if (!agentId) {
            this.log(
              'error',
              `remote-agent-setselection message recieved but no agentId assigned, this shouldn't happen`
            );
          }
          const remoteAgentSelectionMessage = data as WebSocketMessage<
            RemoteAgentSetSelectionPayload
          >;
          const handleRemoteSelectionRes = await this.handleReceiveRemoteAgentSetSelection(
            remoteAgentSelectionMessage,
            agentId as string,
            isClientConnected
          );
          break;
        case 'join-document':
          this.log('debug', `WebSocket subscribe request received`, data);
          const joinDocumentRequestMessage = data as WebSocketMessage<JoinDocumentRequestPayload>;
          const res = await this.handleReceiveJoinDocumentRequest(
            connectionContext,
            joinDocumentRequestMessage
          );
          agentId = res.agentId;
          break;
        default:
          this.log(
            'debug',
            `Unrecognized message type ${data.type} received from client websocket`,
            data
          );
          break;
      }
    };
  }

  private async handleReceiveRemoteAgentSetSelection(
    setSelectionMessage: WebSocketMessage<RemoteAgentSetSelectionPayload>,
    agentId: string,
    isClientConnected: boolean
  ) {
    if (isClientConnected && agentId) {
      this.log('verbose', `${agentId} connected, going to broadcast cursor selection`);
      this.connections.forEach(c => {
        c.socket.send(
          JSON.stringify({
            type: 'remote-agent-setselection-from-server',
            payload: setSelectionMessage.payload,
          })
        );
      });
    }
  }

  private async handleReceiveJoinDocumentRequest(
    connectionContext: ConnectionContext,
    joinRequestMessage: WebSocketMessage<JoinDocumentRequestPayload>
  ) {
    const subscribeRequest = joinRequestMessage;
    let { docId, clientId } = subscribeRequest.payload;
    const agentId: string = clientId;
    this.log('debug', `join-request, for docId: ${docId} , agentId(sent as clientId): ${agentId}`);
    let doc;
    try {
      // doc will autocreate a new doc for us!
      doc = await this.documentRepository.getDoc('1');
    } catch (e) {
      this.log('error', `error:join-document getting doc id ${agentId}`, e);
    }
    if (!this.connectionAutomerge.has(agentId)) {
      this.log('silly', `connectionAutomerge adding ${agentId}`);
      const connection = new (Automerge as any).Connection(
        this.documentRepository.getDocSet(),
        (message: any) => {
          this.log(
            'silly',
            `websocket node ${this.id}: connectionAutomerge sending message to ${agentId}`,
            message
          );
          connectionContext.socket.send(
            JSON.stringify({ type: 'server-update', payload: message })
          );
        }
      );
      this.connectionAutomerge.set(agentId, connection);
      this.log('silly', `connectionAutomerge opening connection for ${agentId}`);
      (this.connectionAutomerge.get(agentId) as AutomergeConnection).open();
      connectionContext.agentId = agentId;
    }
    return { agentId };
  }

  // private handleSendAutomergeOperation

  private handleRecieveAutomergeServerUpdate = (
    msg: WebSocketMessage<AutomergeUpdatePayload>,
    isClientConnected: boolean
  ): Promise<true> =>
    new Promise((accept, _reject) => {
      if (isClientConnected) {
        // const { clientId, docId, message } = (data as any).payload;
        const connection = this.connectionAutomerge.get(msg.payload.clientId);
        this.log(
          'verbose',
          'websocket node connection received message from automerge-connection-send'
        );
        const updatedDoc = connection && connection.receiveMsg(msg.payload.message);
        return accept(true);
      } else {
        setTimeout(() => {
          const connection = this.connectionAutomerge.get(msg.payload.clientId);
          this.log(
            'verbose',
            'websocket node connection received message from automerge-connection-send'
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
        }: ${this.getConnectionsCount()} total active connections remaining. (removed 1)`
      );
    };
  };

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
