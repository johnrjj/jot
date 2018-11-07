import { RedisClient } from 'redis';
import { Logger } from 'winston';

export interface RedisClientConfiguration {
  redisClient: RedisClient;
  logger?: Logger;
}

export class RedisBasicClient {
  private redisClient: RedisClient;
  private logger?: Logger;

  constructor({ redisClient, logger }: RedisClientConfiguration) {
    this.redisClient = redisClient;
    this.logger = logger;
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
