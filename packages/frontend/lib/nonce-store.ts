import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const PREFIX = 'kolektyw3:nonce:';
const TTL_SECONDS = 5 * 60;

export const nonceStore = {
  async set(nonce: string): Promise<void> {
    await redis.set(`${PREFIX}${nonce}`, '1', { ex: TTL_SECONDS });
  },
  async exists(nonce: string): Promise<boolean> {
    const val = await redis.get(`${PREFIX}${nonce}`);
    return val !== null;
  },
  async delete(nonce: string): Promise<void> {
    await redis.del(`${PREFIX}${nonce}`);
  },
};
