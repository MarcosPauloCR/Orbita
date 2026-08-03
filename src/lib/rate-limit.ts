/**
 * Rate limiter em memória, por IP. Suficiente pra desencorajar força bruta
 * casual no código secreto do portão. Não é robusto contra ataque
 * distribuído nem sobrevive a cold starts em serverless (cada instância
 * tem seu próprio contador) — se isso virar um problema real, trocar por
 * Upstash Redis (@upstash/ratelimit).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const MAX_ATTEMPTS = 10;

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - bucket.count };
}
