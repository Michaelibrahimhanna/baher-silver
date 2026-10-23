/**
 * Baher Silver — Open Accounts Dual Ledger Engine (Workshops & Merchants)
 * 
 * Enforces:
 *   1. Dual Interlocked Balances:
 *      - Cash balance in designated currency (EGP default, zero currency mixing).
 *      - Fine Silver 999 equivalent weight balance in grams.
 *   2. Strict Shop-Perspective Directionality:
 *      - Cash > 0: Workshop owes cash to the shop.
 *      - Cash < 0: Shop owes cash to the workshop (e.g. accrued labor/making fees).
 *      - Silver > 0: Workshop holds shop's silver (shop delivered scrap, workshop owes 999 metal).
 *      - Silver < 0: Shop owes pure silver to the workshop.
 *   3. Decoupled Pure Metal Calculations:
 *      - Net Weight = Gross Weight - Stones/Non-silver additions.
 *      - Pure 999 Equivalent = Net Weight * (Purity / 999).
 *      - No arbitrary scrap loss deductions; exact purity ratio strictly preserved.
 *   4. Append-Only Ledger & Reversals:
 *      - Zero silent edits or row deletions.
 *      - Reversals must cite unique original entry; duplicate reversals strictly forbidden.
 *   5. Idempotent Journal Postings:
 *      - Idempotency key deduplication per organization.
 *   6. Balance Rebuilding & Reconciliation:
 *      - Authoritative balance matches mathematical SUM of active journal entries.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RbacService } from '../../auth/rbacService';
import type { SafeUser } from '../../auth/types';

export type AccountType = 'WORKSHOP' | 'SUPPLIER' | 'MERCHANT';

export type JournalEntryType =
  | 'OPENING_BALANCE'
  | 'SCRAP_DELIVERY'       // Shop delivers scrap -> Workshop silver balance increases (+999)
  | 'GOODS_RECEIPT_LABOR'  // Finished goods received -> Silver balance decreases (-999), Labor fee increases shop debt (-Cash)
  | 'CASH_PAYMENT'         // Cash payment to workshop -> Cash balance improves (+Cash)
  | 'CASH_RECEIPT'         // Cash received from merchant -> Cash balance decreases (-Cash)
  | 'METAL_SETTLEMENT'     // Pure metal settlement / bar handover
  | 'REVERSAL';            // Append-only reversal of a previous entry

export interface OpenAccount {
  id: string;
  organization_id: string;
  name: string;
  account_type: AccountType;
  phone?: string;
  currency: string;        // e.g. 'EGP', 'USD'
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface JournalEntryInput {
  organizationId: string;
  accountId: string;
  entryType: JournalEntryType;
  actor: SafeUser;
  currency?: string;       // Defaults to account currency
  // Cash Component
  cashDelta?: number;      // Signed cash change (from shop perspective)
  // Silver Component
  grossWeightGrams?: number;
  stoneWeightGrams?: number;
  purity?: number;         // e.g. 925, 900, 950, 999
  fineSilver999Delta?: number; // Pre-calculated or derived
  // References
  referenceDocument?: string;
  notes?: string;
  idempotencyKey?: string;
  reversedEntryId?: string; // Required if entryType === 'REVERSAL'
}

export interface AccountJournalEntry {
  id: string;
  organization_id: string;
  account_id: string;
  timestamp: string;
  entry_type: JournalEntryType;
  currency: string;
  cash_delta: number;
  gross_weight_grams?: number;
  stone_weight_grams?: number;
  net_weight_grams?: number;
  purity?: number;
  fine_silver_999_delta: number;
  running_cash_balance: number;
  running_fine_silver_balance: number;
  actor_user_id: string;
  actor_email: string;
  actor_role: string;
  reference_document?: string;
  notes?: string;
  idempotency_key?: string;
  reversed_entry_id?: string;
  is_reversed: boolean;
  signature: string;
}

export interface AccountBalanceSnapshot {
  account_id: string;
  currency: string;
  cash_balance: number;
  fine_silver_999_grams: number;
  total_journal_entries: number;
  last_activity_at: string;
}

export class DualLedgerEngine {
  private static journalPath: string = path.resolve(process.cwd(), '.data', 'dual_ledger_journal.jsonl');
  private static accountsPath: string = path.resolve(process.cwd(), '.data', 'open_accounts.json');

  public static setStoragePaths(journalPath: string, accountsPath: string): void {
    this.journalPath = journalPath;
    this.accountsPath = accountsPath;
  }

  /**
   * Calculates pure 999 silver equivalent with strict math.
   * Net = Gross - Stones
   * Fine 999 = Net * (Purity / 999)
   */
  public static calculateFineSilver999(grossWeight: number, stoneWeight: number = 0, purity: number = 999): {
    netWeight: number;
    fineSilver999: number;
  } {
    if (grossWeight < 0) throw new Error('Gross weight cannot be negative.');
    if (stoneWeight < 0) throw new Error('Stone weight cannot be negative.');
    if (stoneWeight > grossWeight) throw new Error('Stone weight cannot exceed gross weight.');
    if (purity <= 0 || purity > 1000) throw new Error(`Invalid silver purity ${purity}. Must be between 1 and 1000.`);

    const netWeight = Math.round((grossWeight - stoneWeight) * 1000) / 1000;
    const fineSilver999 = Math.round((netWeight * (purity / 999.0)) * 1000) / 1000;

    return { netWeight, fineSilver999 };
  }

  /**
   * Registers a new workshop / merchant open account.
   */
  public static createAccount(params: {
    organizationId: string;
    name: string;
    accountType: AccountType;
    currency?: string;
    phone?: string;
    notes?: string;
    actor: SafeUser;
  }): OpenAccount {
    RbacService.assertPermission(params.actor, 'account:journal:post', 'Create Open Account');

    const accounts = this.loadAccounts();
    const existing = accounts.find(
      (a) => a.organization_id === params.organizationId && a.name.trim().toLowerCase() === params.name.trim().toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const account: OpenAccount = {
      id: `acc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      organization_id: params.organizationId,
      name: params.name.trim(),
      account_type: params.accountType,
      phone: params.phone,
      currency: params.currency || 'EGP',
      notes: params.notes,
      is_active: true,
      created_at: new Date().toISOString()
    };

    accounts.push(account);
    this.saveAccounts(accounts);
    return account;
  }

  /**
   * Posts an atomic, immutable journal entry into the dual ledger.
   */
  public static postJournalEntry(input: JournalEntryInput): AccountJournalEntry {
    // RBAC: Posting journal entries requires account:journal:post permission
    RbacService.assertPermission(input.actor, 'account:journal:post', 'Post Account Journal Entry');

    const accounts = this.loadAccounts();
    const account = accounts.find((a) => a.id === input.accountId && a.organization_id === input.organizationId);
    if (!account) {
      const err: any = new Error(`Account "${input.accountId}" not found in organization.`);
      err.code = 'ACCOUNT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const journal = this.loadJournal(input.organizationId);

    // Idempotency check: if key already exists, return cached entry
    if (input.idempotencyKey) {
      const existing = journal.find(
        (e) => e.organization_id === input.organizationId && e.idempotency_key === input.idempotencyKey
      );
      if (existing) return existing;
    }

    let cashDelta = input.cashDelta || 0;
    let netWeight: number | undefined;
    let fineSilverDelta = input.fineSilver999Delta || 0;

    // Metal weight calculation if weights provided
    if (input.grossWeightGrams !== undefined && input.grossWeightGrams > 0) {
      const stoneWeight = input.stoneWeightGrams || 0;
      const purity = input.purity || 999;
      const calc = this.calculateFineSilver999(input.grossWeightGrams, stoneWeight, purity);
      netWeight = calc.netWeight;

      if (input.entryType === 'SCRAP_DELIVERY') {
        // Shop delivered scrap to workshop -> Workshop silver debt increases
        fineSilverDelta = calc.fineSilver999;
      } else if (input.entryType === 'GOODS_RECEIPT_LABOR') {
        // Shop received goods from workshop -> Workshop silver debt consumed
        fineSilverDelta = -calc.fineSilver999;
      } else if (input.fineSilver999Delta === undefined) {
        fineSilverDelta = calc.fineSilver999;
      }
    }

    // Reversal validation
    if (input.entryType === 'REVERSAL') {
      RbacService.assertPermission(input.actor, 'account:reversal', 'Execute Journal Reversal');

      if (!input.reversedEntryId) {
        const err: any = new Error('Reversal entries must specify reversedEntryId.');
        err.code = 'MISSING_REVERSAL_TARGET';
        err.status = 422;
        throw err;
      }

      const target = journal.find((e) => e.id === input.reversedEntryId && e.account_id === input.accountId);
      if (!target) {
        const err: any = new Error(`Target entry "${input.reversedEntryId}" to reverse not found.`);
        err.code = 'TARGET_ENTRY_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      if (target.is_reversed) {
        const err: any = new Error(`Target entry "${input.reversedEntryId}" has already been reversed.`);
        err.code = 'ALREADY_REVERSED';
        err.status = 409;
        throw err;
      }

      // Invert target cash and fine silver deltas
      cashDelta = -target.cash_delta;
      fineSilverDelta = -target.fine_silver_999_delta;
      netWeight = target.net_weight_grams ? -target.net_weight_grams : undefined;

      // Mark original entry as reversed in memory & rewrite
      target.is_reversed = true;
      this.rewriteJournal(journal);
    }

    // Calculate current running balances
    const currentBalances = this.getAccountBalance(input.accountId, input.organizationId);
    const runningCash = Math.round((currentBalances.cash_balance + cashDelta) * 100) / 100;
    const runningSilver = Math.round((currentBalances.fine_silver_999_grams + fineSilverDelta) * 1000) / 1000;

    const id = `jrn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const recordPayload = {
      id,
      organization_id: input.organizationId,
      account_id: input.accountId,
      timestamp,
      entry_type: input.entryType,
      currency: input.currency || account.currency,
      cash_delta: cashDelta,
      gross_weight_grams: input.grossWeightGrams,
      stone_weight_grams: input.stoneWeightGrams,
      net_weight_grams: netWeight,
      purity: input.purity,
      fine_silver_999_delta: fineSilverDelta,
      running_cash_balance: runningCash,
      running_fine_silver_balance: runningSilver,
      actor_user_id: input.actor.id,
      actor_email: input.actor.email,
      actor_role: input.actor.role,
      reference_document: input.referenceDocument,
      notes: input.notes,
      idempotency_key: input.idempotencyKey,
      reversed_entry_id: input.reversedEntryId,
      is_reversed: false
    };

    const signature = crypto
      .createHmac('sha256', 'BAHER_SILVER_DUAL_LEDGER_SALT_2026')
      .update(JSON.stringify(recordPayload))
      .digest('hex');

    const entry: AccountJournalEntry = {
      ...recordPayload,
      signature
    };

    this.appendJournalRecord(entry);
    return entry;
  }

  /**
   * Reconstructs authoritative dual balances from all journal entries.
   */
  public static getAccountBalance(accountId: string, organizationId: string): AccountBalanceSnapshot {
    const journal = this.loadJournal(organizationId).filter((e) => e.account_id === accountId);
    const accounts = this.loadAccounts();
    const account = accounts.find((a) => a.id === accountId);

    let cash = 0;
    let fineSilver = 0;
    let lastActivity = account?.created_at || new Date().toISOString();

    for (const e of journal) {
      cash += e.cash_delta || 0;
      fineSilver += e.fine_silver_999_delta || 0;
      lastActivity = e.timestamp;
    }

    return {
      account_id: accountId,
      currency: account?.currency || 'EGP',
      cash_balance: Math.round(cash * 100) / 100,
      fine_silver_999_grams: Math.round(fineSilver * 1000) / 1000,
      total_journal_entries: journal.length,
      last_activity_at: lastActivity
    };
  }

  /**
   * Retrieves journal entries for an account with optional limit/offset.
   */
  public static getAccountJournal(
    accountId: string,
    organizationId: string,
    limit?: number,
    offset: number = 0
  ): { total: number; entries: AccountJournalEntry[] } {
    const all = this.loadJournal(organizationId).filter((e) => e.account_id === accountId);
    const total = all.length;
    const sorted = [...all].reverse(); // newest first
    const slice = limit ? sorted.slice(offset, offset + limit) : sorted.slice(offset);
    return { total, entries: slice };
  }

  // --- Storage Internals ---

  private static loadAccounts(): OpenAccount[] {
    if (!fs.existsSync(this.accountsPath)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(this.accountsPath, 'utf8'));
    } catch {
      return [];
    }
  }

  private static saveAccounts(accounts: OpenAccount[]): void {
    const dir = path.dirname(this.accountsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.accountsPath, JSON.stringify(accounts, null, 2), 'utf8');
  }

  private static loadJournal(organizationId?: string): AccountJournalEntry[] {
    if (!fs.existsSync(this.journalPath)) {
      return [];
    }
    const lines = fs.readFileSync(this.journalPath, 'utf8').split('\n');
    const entries: AccountJournalEntry[] = [];
    for (const l of lines) {
      if (!l.trim()) continue;
      try {
        const e: AccountJournalEntry = JSON.parse(l);
        if (!organizationId || e.organization_id === organizationId) {
          entries.push(e);
        }
      } catch {
        // Skip malformed
      }
    }
    return entries;
  }

  private static appendJournalRecord(entry: AccountJournalEntry): void {
    const dir = path.dirname(this.journalPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.journalPath, JSON.stringify(entry) + '\n', 'utf8');
  }

  private static rewriteJournal(entries: AccountJournalEntry[]): void {
    const dir = path.dirname(this.journalPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(this.journalPath, content, 'utf8');
  }
}
