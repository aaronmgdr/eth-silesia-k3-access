import { Redis } from '@upstash/redis';

function stripQuotes(s: string | undefined): string | undefined {
  if (!s) return s;
  return s.replace(/^["']|["']$/g, '');
}

export function makeRedis(): Redis {
  const url   = stripQuotes(process.env.UPSTASH_REDIS_REST_URL);
  const token = stripQuotes(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url)   throw new Error('UPSTASH_REDIS_REST_URL is not set');
  if (!token) throw new Error('UPSTASH_REDIS_REST_TOKEN is not set');
  return new Redis({ url, token });
}
