import { createClient, type RedisClientType } from 'redis'

export class RedisModule {
  private static redis: RedisClientType;
  static async init(): Promise<void> {
    this.redis = createClient()
    this.redis.on('error', (err) => {
      console.log('Redis Client Error', err);
    })
    await this.redis.connect();
  }

  static async hget(key: string, field: string): Promise<string | null> {
    return await this.redis.HGET(key, field);
  }

  static async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.HSET(key, field, value);
    await this.redis.HEXPIRE(key, field, 3);
  }
}
