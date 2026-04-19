import { makeRedis } from './redis';
import type { Redis } from '@upstash/redis';

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

export const CODE_TYPES = ['DAY', 'VIBER', 'HACKER'] as const;
export type CodeType = typeof CODE_TYPES[number];

export interface CodeRecord {
  code: string;
  expires: string; // ISO date — YYYY-MM-DD or YYYY-MM-DD HH:MM
  type: CodeType;
}

export interface CodeStatus {
  available: CodeRecord[];
  claims: Record<string, string>;
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

  /** Return all queued (available) codes and all claim mappings. */
  getStatus(): Promise<CodeStatus>;
}

// Upstash REST client auto-deserializes JSON — a stored string like "223456"
// may come back as the number 223456. This normalizes any return type to string.
function coerceToString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && 'code' in val) return String((val as Record<string, unknown>).code);
  return null;
}

/**
 * Redis implementation using O(1) operations
 */
class RedisCodeService implements CodeServiceInterface {
  private redis: Redis;
  private queueKey = 'kolektyw3:codes:queue';
  private claimsKey = 'kolektyw3:claims';

  constructor() {
    this.redis = makeRedis();
  }

  async dequeueCode(identifier: string): Promise<string | null> {
    // 1. Check if identifier already claimed a code (O(1))
    const existingCode = await this.redis.hget(this.claimsKey, identifier);
    if (existingCode !== null && existingCode !== undefined) {
      return coerceToString(existingCode);
    }

    // 2. Get fresh code from queue (O(1))
    const codeData = await this.redis.lpop(this.queueKey);
    if (!codeData) return null;

    const record = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
    const code = coerceToString((record as CodeRecord).code);
    if (!code) return null;

    // 3. Record the claim mapping
    await this.redis.hset(this.claimsKey, { [identifier]: code });

    return code;
  }

  async getStatus(): Promise<CodeStatus> {
    const [rawQueue, rawClaims] = await Promise.all([
      this.redis.lrange(this.queueKey, 0, -1),
      this.redis.hgetall(this.claimsKey),
    ]);

    const available: CodeRecord[] = (rawQueue as string[]).map((item) => {
      const parsed = typeof item === 'string' ? JSON.parse(item) : item;
      return { code: parsed.code, expires: parsed.expires, type: (parsed.type ?? 'DAY') as CodeType };
    });

    const claims: Record<string, string> = {};
    if (rawClaims) {
      for (const [k, v] of Object.entries(rawClaims)) {
        const code = coerceToString(v);
        if (code) claims[k] = code;
      }
    }

    return { available, claims };
  }

  async setCodes(codes: CodeRecord[]): Promise<void> {
    const codeRe   = /^\d{4,8}$/;
    const expireRe = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2})?/;
    const invalid = codes.filter(
      (c) => !codeRe.test(c.code) || !expireRe.test(c.expires) || !CODE_TYPES.includes(c.type as CodeType)
    );
    if (invalid.length > 0) {
      throw new Error(
        `Invalid codes rejected (${invalid.length}): ` +
        invalid.slice(0, 3).map((c) => `"${c.code}" / "${c.expires}"`).join(', ') +
        (invalid.length > 3 ? ` … +${invalid.length - 3} more` : '')
      );
    }

    // Clear queue; keep claims so people can still view their current code
    await this.redis.del(this.queueKey);

    if (codes.length > 0) {
      const serialized = codes.map((c) => JSON.stringify({ code: c.code, expires: c.expires }));
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
  async getStatus(): Promise<CodeStatus> {
    return getCodeService().getStatus();
  },
};
