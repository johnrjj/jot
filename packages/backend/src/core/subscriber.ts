import { RedisClient } from 'redis';
import { Logger } from 'winston';

export interface Subscriber {
  // subscribe(channelName: string, payload: any): Promise<number>;
  // unsubscribe(subscriptionId: number): void;
}

export interface RedisSubscriberConfig {
  redisSubscriber: RedisClient;
  logger?: Logger;
}

export class RedisSubscriber implements Subscriber {
  private subscriber: RedisClient;
  private logger?: Logger;
  constructor({ redisSubscriber, logger }: RedisSubscriberConfig) {
    this.subscriber = redisSubscriber;
    this.logger = logger;
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
