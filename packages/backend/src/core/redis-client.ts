import { RedisClient } from 'redis';
import { Logger } from 'winston';

export interface IRedisBasicClient {
  getClient(): RedisClient;
}

export interface RedisClientConfiguration {
  redisClient: RedisClient;
  logger?: Logger;
}

export class RedisBasicClient implements IRedisBasicClient {
  private redisClient: RedisClient;
  private logger?: Logger;

  constructor({ redisClient, logger }: RedisClientConfiguration) {
    this.redisClient = redisClient;
    this.logger = logger;
  }

  // redis async-ified convenience functions
  // feel free to use the normal redisClient
  public sadd = (topic: string, keyToAddToSet: string): Promise<number> =>
    new Promise((accept, reject) =>
      this.redisClient.sadd(topic, keyToAddToSet, (err, val) => (err ? reject(err) : accept(val))),
    );

  public srem = (topic: string, keyToRemoveFromSet: string): Promise<number> =>
    new Promise((accept, reject) =>
      this.redisClient.srem(
        topic,
        keyToRemoveFromSet,
        (err, val) => (err ? reject(err) : accept(val)),
      ),
    );

  public smembers = (topic: string): Promise<Array<string>> =>
    new Promise((accept, reject) =>
      this.redisClient.smembers(topic, (err, val) => (err ? reject(err) : accept(val))),
    );

  public getClient(): RedisClient {
    return this.redisClient;
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
