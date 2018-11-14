import { DocumentRepository } from './document-repository';

export interface ActiveUserListUpdateMessage {
  channel: string;
  type: 'jot:doc:activeuserlist:update';
  payload: {
    docId: string;
    addedIds: Array<string>;
    removedIds: Array<string>;
    activeIds: Array<string>;
  };
}

export type DocumentRedisMessages = ActiveUserListUpdateMessage;

const createDocumentActiveUserListUpdateMessage = ({
  docId,
  addedIds,
  removedIds,
  activeIds,
  channel,
}): ActiveUserListUpdateMessage => {
  return {
    channel,
    type: `jot:doc:activeuserlist:update`,
    payload: {
      docId,
      addedIds,
      removedIds,
      activeIds,
    },
  };
};

const DOCUMENT_TOPIC_ROOT = 'jot:doc';
const DOCUMENT_EVENT_STREAM_TOPIC_WILDCARD = 'jot:doc:*';
const DOCUMENT_ACTIVE_USERS_SET = '_state:active-users';

const getActiveUserListSetTopic = (docId: string): string =>
  `${DOCUMENT_TOPIC_ROOT}:${docId}:${DOCUMENT_ACTIVE_USERS_SET}`;
const getActiveUserListUpdateEventTopic = (docId: string): string =>
  `${DOCUMENT_TOPIC_ROOT}:${docId}:${DOCUMENT_ACTIVE_USERS_SET}:update`;

const RedisDocumentTopics = {
  getActiveUserListSetTopic,
  getActiveUserListUpdateEventTopic,
  DOCUMENT_TOPIC_ROOT,
  DOCUMENT_EVENT_STREAM_TOPIC_WILDCARD,
};

const RedisMessageCreator = {
  createDocumentActiveUserListUpdateMessage,
};

export { RedisMessageCreator, RedisDocumentTopics };
