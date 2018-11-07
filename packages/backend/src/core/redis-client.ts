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
