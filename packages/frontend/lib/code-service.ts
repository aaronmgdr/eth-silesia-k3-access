import { Redis } from '@upstash/redis';

/**
 * Code Service - Abstracts access code management
 *
 * Uses Redis with O(1) lookups:
 * - kolektyw3:codes:queue - FIFO queue of unclaimed codes
 * - kolektyw3:claims - Hash mapping identifier -> claimed code
 *
 * Identifiers can be either:
 * - Email address (from Stripe checkout)
 * - Wallet address (0x... format from blockchain flow)
 */

export interface CodeRecord {
  code: string;
  expires: string; // ISO date
}

interface CodeServiceInterface {
  /**
   * Get a code for an identifier (idempotent).
   *
   * 1. Check if identifier already claimed a code (O(1))
   * 2. If yes, return existing code
   * 3. If no, pop fresh code from queue (O(1))
   * 4. Record claim mapping, return code
   *
   * @param identifier - Email or wallet address (0x...)
   * @returns Access code or null if none available
   */
  dequeueCode(identifier: string): Promise<string | null>;

  /**
   * Store codes in Redis queue, replacing existing codes
   * Called by admin endpoint when uploading new CSV
   *
   * @param codes - Array of code records
   */
  setCodes(codes: CodeRecord[]): Promise<void>;
}

/**
 * Redis implementation using O(1) operations
 */
class RedisCodeService implements CodeServiceInterface {
  private redis: Redis;
  private queueKey = 'kolektyw3:codes:queue';
  private claimsKey = 'kolektyw3:claims';

  constructor() {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    if (!redisUrl) {
      throw new Error('UPSTASH_REDIS_REST_URL environment variable is required');
    }
    this.redis = new Redis({
      url: redisUrl,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  async dequeueCode(identifier: string): Promise<string | null> {
    // 1. Check if identifier already claimed a code (O(1))
    const existingCode = await this.redis.hget(this.claimsKey, identifier);
    if (existingCode) {
      console.log(`Identifier ${identifier} already claimed code`,existingCode);
      // @ts-expect-error - handle both string and object formats
      return typeof existingCode === 'string' ? existingCode : existingCode.code;
    }

    // 2. Get fresh code from queue (O(1))
    const codeData = await this.redis.lpop(this.queueKey);
    if (!codeData) {
      return null;
    }

    const record = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
    const code = (record as CodeRecord).code;

    // 3. Record the claim mapping
    await this.redis.hset(this.claimsKey, {
      [identifier]: code,
    });

    return code;
  }

  async setCodes(codes: CodeRecord[]): Promise<void> {
    // Clear both queue and claims
    await this.redis.del(this.queueKey);
    await this.redis.del(this.claimsKey);

    // Add new codes to queue as JSON strings
    if (codes.length > 0) {
      const serialized = codes.map((c) => JSON.stringify(c));
      await this.redis.rpush(this.queueKey, ...serialized);
    }
  }
}

// Lazy-load singleton instance to avoid requiring env vars at build time
let codeServiceInstance: CodeServiceInterface | null = null;

function getCodeService(): CodeServiceInterface {
  if (!codeServiceInstance) {
    codeServiceInstance = new RedisCodeService();
  }
  return codeServiceInstance;
}

export const codeService: CodeServiceInterface = {
  async dequeueCode(identifier: string): Promise<string | null> {
    return getCodeService().dequeueCode(identifier);
  },
  async setCodes(codes: CodeRecord[]): Promise<void> {
    return getCodeService().setCodes(codes);
  },
};
