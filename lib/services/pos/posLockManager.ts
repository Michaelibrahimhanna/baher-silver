/**
 * Baher Silver — POS Concurrency & Lock Management
 * 
 * Provides mutex locking for critical POS operations:
 *   - piece:{serialNumber}   -> prevents double-selling serialized pieces
 *   - shift:{shiftId}         -> serializes till cash movements and shift closings
 *   - return:{saleId}         -> prevents race conditions on duplicate returns
 *   - idemp:{key}             -> ensures atomic idempotency reservations
 * 
 * ARCHITECTURE BOUNDARY & UPGRADE PATH:
 *   - Single-Instance Node.js: Uses InMemoryLockProvider (Promise-chain mutex with TTL).
 *   - Clustered / Multi-Pod Deployments: Replace InMemoryLockProvider with a distributed
 *     lock provider (e.g. Redis Redlock or PostgreSQL Advisory Locks via ILockProvider).
 */

export interface ILockProvider {
  acquireLock(resourceKey: string, ttlMs?: number): Promise<() => Promise<void>>;
  isLocked(resourceKey: string): boolean;
}

class InMemoryLockProvider implements ILockProvider {
  private activeLocks: Map<string, { queue: Array<() => void>; expiresAt: number }> = new Map();
  private readonly defaultTtlMs = 10000; // 10s deadlock protection

  public isLocked(resourceKey: string): boolean {
    const entry = this.activeLocks.get(resourceKey);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.forceRelease(resourceKey);
      return false;
    }
    return true;
  }

  public async acquireLock(resourceKey: string, ttlMs: number = this.defaultTtlMs): Promise<() => Promise<void>> {
    const now = Date.now();
    const entry = this.activeLocks.get(resourceKey);

    // If locked and not expired, wait in queue
    if (entry && now < entry.expiresAt) {
      await new Promise<void>((resolve) => {
        entry.queue.push(resolve);
      });
    }

    // Acquire lock
    const expiresAt = Date.now() + ttlMs;
    const currentEntry = this.activeLocks.get(resourceKey) || { queue: [], expiresAt };
    currentEntry.expiresAt = expiresAt;
    this.activeLocks.set(resourceKey, currentEntry);

    let released = false;
    const releaseFn = async () => {
      if (released) return;
      released = true;
      const cur = this.activeLocks.get(resourceKey);
      if (!cur) return;

      if (cur.queue.length > 0) {
        const next = cur.queue.shift();
        cur.expiresAt = Date.now() + ttlMs;
        if (next) next();
      } else {
        this.activeLocks.delete(resourceKey);
      }
    };

    return releaseFn;
  }

  private forceRelease(resourceKey: string) {
    const cur = this.activeLocks.get(resourceKey);
    if (cur) {
      if (cur.queue.length > 0) {
        const next = cur.queue.shift();
        cur.expiresAt = Date.now() + this.defaultTtlMs;
        if (next) next();
      } else {
        this.activeLocks.delete(resourceKey);
      }
    }
  }
}

export class POSLockManager {
  private static provider: ILockProvider = new InMemoryLockProvider();

  public static setProvider(customProvider: ILockProvider) {
    this.provider = customProvider;
  }

  public static async withLock<T>(resourceKey: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const release = await this.provider.acquireLock(resourceKey, ttlMs);
    try {
      return await fn();
    } finally {
      await release();
    }
  }

  public static async withLocks<T>(resourceKeys: string[], fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    // Sort keys to prevent circular deadlocks
    const sortedKeys = [...new Set(resourceKeys)].sort();
    const releases: Array<() => Promise<void>> = [];

    try {
      for (const key of sortedKeys) {
        const release = await this.provider.acquireLock(key, ttlMs);
        releases.push(release);
      }
      return await fn();
    } finally {
      for (const release of releases.reverse()) {
        await release();
      }
    }
  }
}
