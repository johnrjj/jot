export interface AutomergeUpdateToServerMessage {
  type: 'automerge-connection-send';
  payload: {
    clientId: string;
    docId: string;
    message: any;
  };
}

export interface AutomergeUpdateFromServerMessage {
  type: 'server-update';
  payload: {
    message: any;
    changes?: Array<any>;
  };
}

export interface JoinDocumentRequestMessage {
  type: 'join-document';
  payload: {
    clientId: string;
    docId: string;
  };
}

export interface LeaveDocumentRequestMessage {
  type: 'leave-document';
  payload: {
    clientId: string;
    docId: string;
    agentId: string;
  };
}

export interface LeaveDocumentSuccessMessage {
  type: 'leave-document-success';
  payload: {
    clientId: string;
    docId: string;
    agentId: string;
  };
}

export interface JoinDocumentSuccessMessage {
  type: 'join-document-success';
  payload: {
    docId: string;
    clientId: string;
    agentId: string;
  };
}

export interface UpdateClientSelectionMessage {
  type: 'remote-agent-setselection';
  payload: {
    clientId: string;
    docId: string;
    message: {
      anchor: any;
      focus: any;
      mark: {
        type: string;
      };
    };
  };
}

export interface KeepaliveFromServerMessage {
  type: 'keepalive';
  payload: {};
}

export interface RemoteAgentCursorUpdateFromServerMessage {
  type: 'remote-agent-setselection-from-server';
  payload: {
    clientId: string;
    docId: string;
    message: {
      anchor: any;
      focus: any;
      mark: {
        type: string;
      };
    };
  };
}

export type WebsocketClientMessages =
  | AutomergeUpdateToServerMessage
  | JoinDocumentRequestMessage
  | LeaveDocumentRequestMessage
  | UpdateClientSelectionMessage;

export type WebsocketServerMessages =
  | KeepaliveFromServerMessage
  | JoinDocumentSuccessMessage
  | LeaveDocumentSuccessMessage
  | RemoteAgentCursorUpdateFromServerMessage
  | AutomergeUpdateFromServerMessage;

export type WebsocketMessages = WebsocketServerMessages | WebsocketClientMessages;

const createKeepaliveFromServerMessage = (): KeepaliveFromServerMessage => {
  return {
    type: 'keepalive',
    payload: {},
  };
};

const createAutomergeUpdateToServerMessage = ({
  clientId,
  docId,
  message,
}: {
  clientId: string;
  docId: string;
  message: any;
}): AutomergeUpdateToServerMessage => {
  return {
    type: 'automerge-connection-send',
    payload: {
      clientId: clientId,
      docId: docId,
      message: message,
    },
  };
};

const createAutomergeUpdateFromServerMessage = (payload_TYPEME: any): AutomergeUpdateFromServerMessage => {
  return {
    type: 'server-update',
    payload: payload_TYPEME,
  };
};

const createJoinDocumentRequestMessage = ({
  clientId,
  docId,
}: {
  clientId: string;
  docId: string;
}): JoinDocumentRequestMessage => {
  return {
    type: 'join-document',
    payload: {
      clientId: clientId,
      docId: docId,
    },
  };
};

const createLeaveDocumentRequestMessage = ({
  clientId,
  docId,
  agentId,
}: {
  clientId: string;
  docId: string;
  agentId: string;
}): LeaveDocumentRequestMessage => {
  return {
    type: 'leave-document',
    payload: {
      docId,
      clientId,
      agentId,
    },
  };
};

const createRemoteAgentCursorUpdateFromServerMessage = (payload): RemoteAgentCursorUpdateFromServerMessage => {
  return {
    type: 'remote-agent-setselection-from-server',
    payload: payload,
  };
};

const createJoinDocumentSuccessMessage = ({
  docId,
  clientId,
  agentId,
}: {
  docId: string;
  clientId: string;
  agentId: string;
}): JoinDocumentSuccessMessage => {
  return {
    type: 'join-document-success',
    payload: {
      docId,
      clientId,
      agentId,
    },
  };
};

const createLeaveDocumentSuccessMessage = ({
  docId,
  clientId,
  agentId,
}: {
  docId: string;
  clientId: string;
  agentId: string;
}): LeaveDocumentSuccessMessage => {
  return {
    type: 'leave-document-success',
    payload: {
      docId,
      clientId,
      agentId,
    },
  };
};

const createUpdateClientSelectionMessage = ({
  clientId,
  docId,
  decoration,
}: {
  clientId: string;
  docId: string;
  decoration: any;
}): UpdateClientSelectionMessage => {
  return {
    type: 'remote-agent-setselection',
    payload: {
      clientId: clientId,
      docId: docId,
      message: {
        ...decoration,
        mark: {
          type: `remote-agent-setselection-${clientId}`,
        },
      },
    },
  };
};

const WebSocketClientMessageCreator = {
  createAutomergeUpdateToServerMessage,
  createJoinDocumentRequestMessage,
  createLeaveDocumentRequestMessage,
  createUpdateClientSelectionMessage,
};

const WebSocketServerMessageCreator = {
  createKeepaliveFromServerMessage,
  createAutomergeUpdateFromServerMessage,
  createRemoteAgentCursorUpdateFromServerMessage,
  createJoinDocumentSuccessMessage,
  createLeaveDocumentSuccessMessage,
};

export { WebSocketClientMessageCreator, WebSocketServerMessageCreator };
