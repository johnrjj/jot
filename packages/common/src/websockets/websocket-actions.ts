// export type MessageType =
//   | 'keepalive'
//   | 'automerge-connection-send'
//   | 'remote-agent-setselection-from-server'
//   | 'remote-agent-setselection'
//   | 'join-document'
//   | 'server-update'
//   | 'keepalive'
//   | 'undefined';

// export interface AutomergeUpdatePayload {
//   clientId: string;
//   docId: string;
//   message: string;
// }

// export interface AutomergeUpdateFromServerPayload {
//     message: any;
// }

// export interface RemoteAgentSetSelectionPayload {
//   clientId: string;
//   docId: string;
//   message: {
//     anchor: any;
//     focus: any;
//     mark: any;
//   };
// }

// export interface KeepalivePayload {}

// export interface JoinDocumentRequestPayload {
//   clientId: string;
//   docId: string;
//   message: string;
// }

// export interface WebSocketMessage<
//   T extends
//   | AutomergeUpdatePayload
//   | JoinDocumentRequestPayload
//   | RemoteAgentSetSelectionPayload
//   | AutomergeUpdateFromServerPayload
//   | KeepalivePayload
// > {
//   type: MessageType;
//   payload: T;
// }

export interface AutomergeUpdateToServerMessage {
  type: 'automerge-connection-send';
  payload: {
    clientId: string;
    docId: string;
    message: any;
  };
}

export interface JoinDocumentRequestMessage {
  type: 'join-document';
  payload: {
    clientId: string;
    docId: string;
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

export type WebsocketClientMessages =
  | AutomergeUpdateToServerMessage
  | JoinDocumentRequestMessage;

export type WebsocketServerMessages = KeepaliveFromServerMessage;

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
  createUpdateClientSelectionMessage,
};

const WebSocketServerMessageCreator = {
  createKeepaliveFromServerMessage,
};

export { WebSocketClientMessageCreator, WebSocketServerMessageCreator };
