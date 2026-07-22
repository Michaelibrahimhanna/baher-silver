export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  check(identifier: string, maxLimit = 5, windowSeconds = 60): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxLimit - 1, resetSeconds: windowSeconds };
    }

    if (record.count >= maxLimit) {
      const resetSeconds = Math.ceil((record.resetTime - now) / 1000);
      return { allowed: false, remaining: 0, resetSeconds };
    }

    record.count += 1;
    this.requests.set(identifier, record);
    return {
      allowed: true,
      remaining: maxLimit - record.count,
      resetSeconds: Math.ceil((record.resetTime - now) / 1000),
    };
  }
}

export const rateLimiter = new RateLimiter();
