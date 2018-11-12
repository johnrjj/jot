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

const RedisMessageCreator = {
  createDocumentActiveUserListUpdateMessage,
};

export { RedisMessageCreator };
