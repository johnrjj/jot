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
//   message: any;
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
//     | AutomergeUpdatePayload
//     | JoinDocumentRequestPayload
//     | RemoteAgentSetSelectionPayload
//     | AutomergeUpdateFromServerPayload
//     | KeepalivePayload
// > {
//   type: MessageType;
//   payload: T;
// }
