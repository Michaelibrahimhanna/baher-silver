/**
 * Baher Silver Portal — Cryptographic Session Service
 *
 * Implements server-side session generation, HMAC-SHA256 signature verification,
 * tamper detection, session expiry, and seed accounts with strict tenant isolation.
 */

import crypto from 'crypto';
import { AuthSession, SafeUser, DbUserRecord, UserRole } from './types';
import { hashPassword, verifyPassword } from './passwords';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.MIP_SESSION_SECRET ||
  'baher-silver-portal-production-session-secret-key-32';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory persistent state across serverless/dev invocations
class AuthDataStore {
  private static instance: AuthDataStore | null = null;
  public users: Map<string, DbUserRecord> = new Map();
  public sessions: Map<string, AuthSession> = new Map();
  public revokedTokens: Set<string> = new Set();
  private initialized = false;

  public static getInstance(): AuthDataStore {
    if (!AuthDataStore.instance) {
      AuthDataStore.instance = new AuthDataStore();
    }
    return AuthDataStore.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Seed authoritative enterprise accounts for Baher Silver Portal (Tenant: org_baher_silver)
    const adminPass = await hashPassword('BaherAdmin2026!');
    const managerPass = await hashPassword('BaherManager2026!');
    const cashierPass = await hashPassword('BaherCashier2026!');
    const viewerPass = await hashPassword('BaherViewer2026!');

    // Primary Tenant Users
    this.users.set('admin@bahersilver.com', {
      id: 'usr_admin_001',
      email: 'admin@bahersilver.com',
      name: 'Michael Hanna (Admin)',
      role: 'Admin',
      organizationId: 'org_baher_silver',
      branchId: 'branch_cairo_main',
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash: adminPass
    });

    this.users.set('storemanager@bahersilver.com', {
      id: 'usr_mgr_002',
      email: 'storemanager@bahersilver.com',
      name: 'Store Manager (Baher)',
      role: 'StoreManager',
      organizationId: 'org_baher_silver',
      branchId: 'branch_cairo_main',
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash: managerPass
    });

    this.users.set('cashier@bahersilver.com', {
      id: 'usr_csh_003',
      email: 'cashier@bahersilver.com',
      name: 'Cashier Terminal 1',
      role: 'Cashier',
      organizationId: 'org_baher_silver',
      branchId: 'branch_cairo_main',
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash: cashierPass
    });

    this.users.set('viewer@bahersilver.com', {
      id: 'usr_viw_004',
      email: 'viewer@bahersilver.com',
      name: 'Auditor Viewer',
      role: 'Viewer',
      organizationId: 'org_baher_silver',
      branchId: 'branch_cairo_main',
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash: viewerPass
    });

    // Foreign Tenant Users (For strict Cross-Tenant isolation testing)
    const foreignAdminPass = await hashPassword('ForeignAdmin2026!');
    this.users.set('foreign_admin@othercorp.com', {
      id: 'usr_foreign_999',
      email: 'foreign_admin@othercorp.com',
      name: 'Foreign Corp Admin',
      role: 'Admin',
      organizationId: 'org_foreign_corp',
      branchId: 'branch_alex_foreign',
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash: foreignAdminPass
    });

    this.initialized = true;
  }
}

export class SessionService {
  private static store = AuthDataStore.getInstance();

  /**
   * Initializes seed accounts if not already initialized.
   */
  public static async ensureInitialized(): Promise<void> {
    await this.store.initialize();
  }

  /**
   * Authenticates user credentials and issues a cryptographic session token.
   */
  public static async authenticate(
    email: string,
    password: string
  ): Promise<{ user: SafeUser; sessionToken: string; session: AuthSession }> {
    await this.ensureInitialized();

    const normalizedEmail = (email || '').trim().toLowerCase();
    const userRecord = this.store.users.get(normalizedEmail);

    if (!userRecord || userRecord.status !== 'active') {
      const err: any = new Error('Invalid email or password.');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

    const isValid = await verifyPassword(password, userRecord.passwordHash);
    if (!isValid) {
      const err: any = new Error('Invalid email or password.');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

    const { passwordHash: _, ...safeUser } = userRecord;
    const { sessionToken, session } = await this.createSession(safeUser);

    return { user: safeUser, sessionToken, session };
  }

  /**
   * Generates a signed cryptographic session token.
   */
  public static async createSession(
    user: SafeUser
  ): Promise<{ sessionToken: string; session: AuthSession }> {
    await this.ensureInitialized();

    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;
    const nonce = crypto.randomBytes(16).toString('hex');
    const sessionId = 'mip_sess_' + crypto.randomBytes(24).toString('hex');

    const session: AuthSession = {
      sessionId,
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
      createdAt: now,
      expiresAt,
      nonce
    };

    // Store active session in memory/store
    this.store.sessions.set(sessionId, session);

    // Cryptographic HMAC-SHA256 Token Format:
    // mip_sess_<base64Payload>.<hmacSignature>
    const payloadJson = JSON.stringify(session);
    const payloadBase64 = Buffer.from(payloadJson, 'utf8').toString('base64url');

    const signature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    const sessionToken = `mip_sess_${payloadBase64}.${signature}`;

    return { sessionToken, session };
  }

  /**
   * Authoritatively validates a session token against expiration, signature integrity, and revocation.
   */
  public static async validateSession(
    sessionToken: string
  ): Promise<{ session: AuthSession; user: SafeUser } | null> {
    if (!sessionToken || typeof sessionToken !== 'string') return null;
    await this.ensureInitialized();

    if (this.store.revokedTokens.has(sessionToken)) {
      return null;
    }

    if (!sessionToken.startsWith('mip_sess_')) {
      return null;
    }

    const tokenBody = sessionToken.slice('mip_sess_'.length);
    const dotIndex = tokenBody.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payloadBase64 = tokenBody.slice(0, dotIndex);
    const providedSig = tokenBody.slice(dotIndex + 1);

    // Verify HMAC signature
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    const sigA = Buffer.from(providedSig, 'utf8');
    const sigB = Buffer.from(expectedSig, 'utf8');

    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null; // Cryptographic tampering detected
    }

    try {
      const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
      const session: AuthSession = JSON.parse(payloadJson);

      // Verify expiration
      if (Date.now() > session.expiresAt) {
        return null; // Session expired
      }

      // Check if session was explicitly revoked in session store
      if (this.store.revokedTokens.has(session.sessionId) || this.store.revokedTokens.has(sessionToken)) {
        return null;
      }

      // Retrieve and verify current user status
      const userRecord = Array.from(this.store.users.values()).find((u) => u.id === session.userId);
      if (userRecord && userRecord.status !== 'active') {
        return null;
      }

      const safeUser: SafeUser = {
        id: session.userId,
        email: session.email,
        name: userRecord ? userRecord.name : (session.email === 'admin@bahersilver.com' ? 'Michael Hanna (Admin)' : session.email),
        role: session.role,
        organizationId: session.organizationId,
        branchId: userRecord?.branchId || (session as any).branchId,
        status: 'active',
        createdAt: new Date(session.createdAt).toISOString()
      };

      return { session, user: safeUser };
    } catch {
      return null;
    }
  }

  /**
   * Invalidates and revokes a session.
   */
  public static async invalidateSession(sessionToken: string): Promise<void> {
    if (!sessionToken) return;
    this.store.revokedTokens.add(sessionToken);

    if (sessionToken.startsWith('mip_sess_')) {
      const tokenBody = sessionToken.slice('mip_sess_'.length);
      const dotIndex = tokenBody.lastIndexOf('.');
      if (dotIndex !== -1) {
        const payloadBase64 = tokenBody.slice(0, dotIndex);
        try {
          const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
          const session: AuthSession = JSON.parse(payloadJson);
          this.store.sessions.delete(session.sessionId);
        } catch {
          // Ignored
        }
      }
    }
  }

  /**
   * Creates a user in the store (for testing or registration).
   */
  public static async createUser(params: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    organizationId: string;
    branchId?: string;
  }): Promise<SafeUser> {
    await this.ensureInitialized();
    const normalizedEmail = params.email.trim().toLowerCase();

    if (this.store.users.has(normalizedEmail)) {
      const err: any = new Error('User already exists with this email.');
      err.code = 'DUPLICATE_EMAIL';
      err.status = 409;
      throw err;
    }

    const passwordHash = await hashPassword(params.password);
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');

    const record: DbUserRecord = {
      id,
      email: normalizedEmail,
      name: params.name,
      role: params.role,
      organizationId: params.organizationId,
      branchId: params.branchId,
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash
    };

    this.store.users.set(normalizedEmail, record);
    const { passwordHash: _, ...safeUser } = record;
    return safeUser;
  }
}
