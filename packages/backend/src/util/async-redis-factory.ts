import { createClient, RedisClient } from 'redis';

// Async-ified redis client
const createRedisClient = (...args): Promise<RedisClient> =>
  new Promise((accept, reject) => {
    const client = createClient(...args);
    client.on('ready', () => accept(client));
    client.on('error', e => reject(e));
  });

export { createRedisClient };
