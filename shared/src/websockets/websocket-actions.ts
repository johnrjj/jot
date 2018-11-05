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
    type: 'automerge-connection-send',
    payload: {
        clientId: string,
        docId: string,
        message: any,
    },
};

export type WebsocketClientMessages = 
    | AutomergeUpdateToServerMessage
;


const createAutomergeUpdateToServerMessage = ({ clientId, docId, message }): AutomergeUpdateToServerMessage => {
    return {
        type: 'automerge-connection-send',
        payload: {
            clientId: clientId,
            docId: docId,
            message: message,
        },
    }
};

const WebSocketMessageCreator = {
    createAutomergeUpdateToServerMessage,
};

export {
    WebSocketMessageCreator,
}