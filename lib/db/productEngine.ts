import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { products as initialProducts } from '../products';
import { categories as initialCategories } from '../categories';
import type { Product, IndividualPiece, PieceLifecycleStatus, ProductProfileType, SilverPurity } from '../types';
import type { Category } from '../types';
import type {
  CanonicalStockMovementType,
  StockLedgerEvent,
  DerivedStockBalance,
  StockReconciliationReport,
  StockReconciliationDivergence
} from '../../types/erp';
import { generateSKU, generateEAN13Barcode, generatePieceSerialNumber } from '../catalog-identifiers';

export interface EnterpriseCollection {
  id: string;
  name: { en: string; ar: string };
  slug: string;
  image?: string;
}

const initialCollections: EnterpriseCollection[] = [
  { id: 'col-1', name: { en: 'Heritage Collection', ar: 'المجموعة التراثية' }, slug: 'heritage-collection', image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800' },
  { id: 'col-2', name: { en: 'Minimalist Modern', ar: 'الحداثة البسيطة' }, slug: 'minimalist-modern', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800' },
  { id: 'col-3', name: { en: 'Royal Zircon', ar: 'الزركون الملكي' }, slug: 'royal-zircon', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800' },
  { id: 'col-4', name: { en: 'Luxe Earrings', ar: 'الأقراط الفاخرة' }, slug: 'luxe-earrings', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800' },
];

/**
 * Approved Silver Purities for Baher Silver Jewelry domain.
 * Supports 925, 900, 950, 999, and optionally 800 for heritage/classic items. Gold karats and non-precious metals are strictly forbidden.
 */
export const APPROVED_SILVER_PURITIES = ['800', '900', '925', '950', '999'] as const;
export type ApprovedSilverPurity = typeof APPROVED_SILVER_PURITIES[number];

export function assertValidSilverPurity(purity: any): asserts purity is ApprovedSilverPurity {
  const clean = String(purity || '').trim();
  if (!APPROVED_SILVER_PURITIES.includes(clean as any)) {
    const err: any = new Error(
      `Invalid silver purity "${purity}". Baher Silver supports 800, 900, 925, 950, or 999. Gold karats and non-precious metals are strictly forbidden.`
    );
    err.code = 'INVALID_SILVER_PURITY';
    err.status = 422;
    throw err;
  }
}

/**
 * Calculates a cryptographic SHA-256 HMAC of a stock ledger event for tamper evidence.
 */
export function calculateEventHash(data: Record<string, any>): string {
  const { event_hash, ...rest } = data;
  const sortedKeys = Object.keys(rest).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = rest[k];
  }
  const serialized = JSON.stringify(sortedObj);
  return crypto.createHmac('sha256', 'BAHER_CANONICAL_LEDGER_SALT_2026').update(serialized).digest('hex');
}

/**
 * Initializes and enriches products with canonical barcode, SKU, serialization, commercial profiles, and piece lineage.
 */
function enrichInitialProducts(prods: Product[]): Product[] {
  return prods.map((p, index) => {
    const isNonSilverCategory =
      p.category === 'accessories' ||
      p.category === 'packaging' ||
      p.category === 'watches' ||
      p.category === 'eyeglasses';
    const profile_type: ProductProfileType =
      p.profile_type || (isNonSilverCategory ? 'NON_SILVER_RETAIL' : 'SILVER_JEWELRY');
    const skuPrefix = profile_type === 'NON_SILVER_RETAIL' ? 'RET' : 'SIL';
    const sku = p.sku || generateSKU(p.category, skuPrefix, 100 + index);
    const barcode = p.barcode || generateEAN13Barcode(10000 + index);
    const orgId = p.organization_id || 'org_baher_silver';
    const isSerialized = p.is_serialized ?? (profile_type === 'SILVER_JEWELRY');
    const weight = profile_type === 'SILVER_JEWELRY' ? (p.weight_grams || 7.5) : undefined;
    const pkgWeight = profile_type === 'NON_SILVER_RETAIL' ? (p.package_weight_grams || p.weight_grams || 50) : undefined;
    const costPrice = p.cost_price || Math.round(p.price * 0.6);
    const laborCost = profile_type === 'SILVER_JEWELRY' ? (p.labor_cost || 25) : 0;
    const purity = profile_type === 'SILVER_JEWELRY' ? (p.purity || '925') : undefined;

    const initialPieces: IndividualPiece[] = isSerialized
      ? [
          {
            id: `pc_${p.id}_01`,
            product_id: p.id,
            sku,
            serial_number: generatePieceSerialNumber(profile_type === 'NON_SILVER_RETAIL' ? 'RET' : 'BHR', 100 + index),
            barcode,
            organization_id: orgId,
            warehouse_id: 'wh-cairo-main',
            location_code: index % 2 === 0 ? 'SHOWCASE-01' : 'VAULT-A1',
            current_weight_grams: weight || pkgWeight || 7.5,
            lifecycle_status: index % 2 === 0 ? 'IN_SHOWCASE' : 'IN_VAULT',
            cost_basis: costPrice,
            retail_price: p.price,
            created_at: new Date('2026-09-01T00:00:00.000Z').toISOString(),
            updated_at: new Date('2026-09-01T00:00:00.000Z').toISOString()
          }
        ]
      : [];

    return {
      ...p,
      profile_type,
      sku,
      barcode,
      organization_id: orgId,
      is_serialized: isSerialized,
      purity,
      weight_grams: weight,
      package_weight_grams: pkgWeight,
      labor_cost: laborCost,
      cost_price: costPrice,
      selling_price: p.price,
      metal: profile_type === 'SILVER_JEWELRY' ? 'silver' : undefined,
      pieces: p.pieces && p.pieces.length > 0 ? p.pieces : initialPieces
    };
  });
}

/**
 * Generates genesis stock ledger intake records for initial piece inventory.
 */
function createGenesisLedger(prods: Product[]): StockLedgerEvent[] {
  const events: StockLedgerEvent[] = [];
  for (const p of prods) {
    if (p.pieces && p.pieces.length > 0) {
      for (const pc of p.pieces) {
        const isShowcase = pc.lifecycle_status === 'IN_SHOWCASE';
        const intakeEvent: StockLedgerEvent = {
          id: `led_genesis_${pc.id}`,
          organization_id: pc.organization_id || 'org_baher_silver',
          timestamp: pc.created_at || '2026-09-01T00:00:00.000Z',
          movement_type: 'RECEIPT',
          product_id: p.id,
          sku: pc.sku,
          barcode: pc.barcode,
          piece_id: pc.id,
          serial_number: pc.serial_number,
          dest_warehouse_id: pc.warehouse_id || 'wh-cairo-main',
          dest_location_code: 'VAULT-A1',
          quantity_delta: 1,
          weight_grams_delta: pc.current_weight_grams,
          unit_cost: pc.cost_basis,
          total_cost: pc.cost_basis,
          balance_after_transaction: 1,
          actor_user_id: 'system_genesis',
          actor_role: 'SuperAdmin',
          reference_id: 'GENESIS_INTAKE',
          reference_type: 'SYSTEM',
          reason: 'Initial catalog inventory genesis receipt',
          event_hash: ''
        };
        intakeEvent.event_hash = calculateEventHash(intakeEvent);
        events.push(intakeEvent);

        if (isShowcase) {
          const moveEvent: StockLedgerEvent = {
            id: `led_genesis_show_${pc.id}`,
            organization_id: pc.organization_id || 'org_baher_silver',
            timestamp: pc.updated_at || '2026-09-01T01:00:00.000Z',
            movement_type: 'VAULT_TO_SHOWCASE',
            product_id: p.id,
            sku: pc.sku,
            barcode: pc.barcode,
            piece_id: pc.id,
            serial_number: pc.serial_number,
            source_warehouse_id: pc.warehouse_id || 'wh-cairo-main',
            source_location_code: 'VAULT-A1',
            dest_warehouse_id: pc.warehouse_id || 'wh-cairo-main',
            dest_location_code: pc.location_code || 'SHOWCASE-01',
            quantity_delta: 0,
            weight_grams_delta: 0,
            unit_cost: pc.cost_basis,
            total_cost: pc.cost_basis,
            balance_after_transaction: 1,
            actor_user_id: 'system_genesis',
            actor_role: 'SuperAdmin',
            reference_id: 'GENESIS_SHOWCASE_SETUP',
            reference_type: 'SYSTEM',
            reason: 'Initial showcase placement',
            event_hash: ''
          };
          moveEvent.event_hash = calculateEventHash(moveEvent);
          events.push(moveEvent);
        }
      }
    }
  }
  return events;
}

// In-Memory Global State with LocalStorage & File Persistence Bridge
let globalProducts: Product[] = enrichInitialProducts([...initialProducts]);
let globalCategories: Category[] = [...initialCategories];
let globalCollections: EnterpriseCollection[] = [...initialCollections];
let globalStockLedger: StockLedgerEvent[] = createGenesisLedger(globalProducts);

// Synchronize with LocalStorage (Browser) or Disk Files (Node.js Server)
const DATA_DIR = typeof process !== 'undefined' && process.cwd ? path.resolve(process.cwd(), '.data') : '';
const PRODUCTS_FILE = DATA_DIR ? path.join(DATA_DIR, 'canonical_products.json') : '';
const LEDGER_FILE = DATA_DIR ? path.join(DATA_DIR, 'canonical_stock_ledger.json') : '';

if (typeof window !== 'undefined') {
  try {
    const savedProducts = localStorage.getItem('baher_silver_db_products');
    if (savedProducts) globalProducts = JSON.parse(savedProducts);

    const savedCategories = localStorage.getItem('baher_silver_db_categories');
    if (savedCategories) globalCategories = JSON.parse(savedCategories);

    const savedCollections = localStorage.getItem('baher_silver_db_collections');
    if (savedCollections) globalCollections = JSON.parse(savedCollections);

    const savedLedger = localStorage.getItem('baher_silver_db_stock_ledger');
    if (savedLedger) globalStockLedger = JSON.parse(savedLedger);
  } catch (e) {
    console.error('Failed to load database from localStorage', e);
  }
} else if (DATA_DIR && typeof fs !== 'undefined' && fs.existsSync) {
  try {
    if (PRODUCTS_FILE && fs.existsSync(PRODUCTS_FILE)) {
      const savedProducts = fs.readFileSync(PRODUCTS_FILE, 'utf8');
      if (savedProducts) globalProducts = JSON.parse(savedProducts);
    }
    if (LEDGER_FILE && fs.existsSync(LEDGER_FILE)) {
      const savedLedger = fs.readFileSync(LEDGER_FILE, 'utf8');
      if (savedLedger) globalStockLedger = JSON.parse(savedLedger);
    }
  } catch (e: any) {
    console.error('Failed to load database from server disk store', e.message);
  }
}

function persistStore() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('baher_silver_db_products', JSON.stringify(globalProducts));
      localStorage.setItem('baher_silver_db_categories', JSON.stringify(globalCategories));
      localStorage.setItem('baher_silver_db_collections', JSON.stringify(globalCollections));
      localStorage.setItem('baher_silver_db_stock_ledger', JSON.stringify(globalStockLedger));
    } catch (e) {
      console.error('Failed to persist database to localStorage', e);
    }
  } else if (DATA_DIR && typeof fs !== 'undefined' && fs.writeFileSync) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (PRODUCTS_FILE) fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(globalProducts, null, 2), 'utf8');
      if (LEDGER_FILE) fs.writeFileSync(LEDGER_FILE, JSON.stringify(globalStockLedger, null, 2), 'utf8');
    } catch (e: any) {
      console.error('Failed to persist database to server disk store', e.message);
    }
  }
}

// =============================================================================
// UNIQUENESS ENFORCEMENT ENGINE
// =============================================================================

export function assertBarcodeUnique(
  barcode: string,
  organizationId: string,
  excludeProductId?: string,
  excludePieceId?: string
): void {
  const clean = barcode.trim();
  if (!clean) return;

  // 1. Check Product-level Barcodes
  const conflictProduct = globalProducts.find(
    (p) =>
      (p.organization_id === organizationId || !p.organization_id) &&
      p.barcode === clean &&
      p.id !== excludeProductId
  );

  if (conflictProduct) {
    const err: any = new Error(
      `Barcode "${clean}" is already assigned to product "${conflictProduct.name.en}" (${conflictProduct.sku}).`
    );
    err.code = 'DUPLICATE_BARCODE';
    err.status = 409;
    throw err;
  }

  // 2. Check Piece-level Barcodes
  for (const prod of globalProducts) {
    if (prod.organization_id === organizationId || !prod.organization_id) {
      const conflictPiece = prod.pieces?.find(
        (pc) => pc.barcode === clean && pc.id !== excludePieceId
      );
      if (conflictPiece && conflictPiece.product_id !== excludeProductId) {
        const err: any = new Error(
          `Barcode "${clean}" is already assigned to physical piece "${conflictPiece.serial_number}".`
        );
        err.code = 'DUPLICATE_BARCODE';
        err.status = 409;
        throw err;
      }
    }
  }
}

export function assertSkuUnique(
  sku: string,
  organizationId: string,
  excludeProductId?: string
): void {
  const clean = sku.trim().toUpperCase();
  if (!clean) return;

  const conflict = globalProducts.find(
    (p) =>
      (p.organization_id === organizationId || !p.organization_id) &&
      p.sku?.toUpperCase() === clean &&
      p.id !== excludeProductId
  );

  if (conflict) {
    const err: any = new Error(`SKU "${clean}" is already in use by product "${conflict.name.en}".`);
    err.code = 'DUPLICATE_SKU';
    err.status = 409;
    throw err;
  }
}

export function assertSerialUnique(
  serialNumber: string,
  organizationId: string,
  excludePieceId?: string
): void {
  const clean = serialNumber.trim().toUpperCase();
  if (!clean) return;

  for (const prod of globalProducts) {
    if (prod.organization_id === organizationId || !prod.organization_id) {
      const conflict = prod.pieces?.find(
        (pc) => pc.serial_number.toUpperCase() === clean && pc.id !== excludePieceId
      );
      if (conflict) {
        const err: any = new Error(`Serial number "${clean}" is already assigned to an existing piece.`);
        err.code = 'DUPLICATE_SERIAL';
        err.status = 409;
        throw err;
      }
    }
  }
}

// =============================================================================
// FIRST-CLASS BARCODE & SERIAL RESOLUTION ENGINE
// =============================================================================

export interface BarcodeLookupResult {
  found: boolean;
  match_type: 'piece' | 'product';
  product: Product;
  piece?: IndividualPiece;
  sku: string;
  barcode: string;
  profile_type: ProductProfileType;
  location?: string;
  lifecycle_status?: PieceLifecycleStatus;
  stock_count: number;
  manufacturing_lineage?: {
    order_id?: string;
    wip_lot_id?: string;
    batch_id?: string;
  };
}

export function lookupByBarcode(
  barcode: string,
  organizationId?: string
): BarcodeLookupResult | null {
  if (!barcode) return null;
  const clean = barcode.trim();

  // 1. Search for Direct Piece Match (Serialized Piece Level)
  for (const prod of globalProducts) {
    if (organizationId && prod.organization_id && prod.organization_id !== organizationId) {
      continue; // Strict Tenant Isolation
    }

    const matchingPiece = prod.pieces?.find(
      (pc) => pc.barcode === clean || pc.serial_number === clean
    );

    if (matchingPiece) {
      return {
        found: true,
        match_type: 'piece',
        product: prod,
        piece: matchingPiece,
        sku: prod.sku || matchingPiece.sku,
        barcode: matchingPiece.barcode,
        profile_type: prod.profile_type || 'SILVER_JEWELRY',
        location: matchingPiece.location_code,
        lifecycle_status: matchingPiece.lifecycle_status,
        stock_count: prod.pieces?.length || 1,
        manufacturing_lineage: {
          order_id: matchingPiece.manufacturing_order_id,
          wip_lot_id: matchingPiece.wip_lot_id,
          batch_id: matchingPiece.batch_id
        }
      };
    }
  }

  // 2. Search for Product Barcode or SKU Match
  for (const prod of globalProducts) {
    if (organizationId && prod.organization_id && prod.organization_id !== organizationId) {
      continue; // Strict Tenant Isolation
    }

    if (prod.barcode === clean || prod.sku === clean) {
      return {
        found: true,
        match_type: 'product',
        product: prod,
        sku: prod.sku || '',
        barcode: prod.barcode || clean,
        profile_type: prod.profile_type || 'SILVER_JEWELRY',
        stock_count: prod.pieces?.length || (prod.stockStatus === 'IN_STOCK' ? 10 : 0),
        location: prod.pieces?.[0]?.location_code || 'MAIN-WAREHOUSE',
        lifecycle_status: prod.pieces?.[0]?.lifecycle_status || 'FINISHED_GOODS'
      };
    }
  }

  return null;
}

// =============================================================================
// PIECE LIFECYCLE OPERATIONS
// =============================================================================

export function createPieceForProduct(params: {
  product_id: string;
  serial_number?: string;
  barcode?: string;
  warehouse_id?: string;
  location_code?: string;
  weight_grams?: number;
  lifecycle_status?: PieceLifecycleStatus;
  manufacturing_order_id?: string;
  wip_lot_id?: string;
  batch_id?: string;
  gemstone_lot_ids?: string[];
  cost_basis?: number;
  retail_price?: number;
  organization_id: string;
  actor_user_id?: string;
  actor_role?: string;
  reason?: string;
  idempotency_key?: string;
}): IndividualPiece {
  const prod = globalProducts.find((p) => p.id === params.product_id);
  if (!prod) {
    const err: any = new Error(`Product "${params.product_id}" not found.`);
    err.status = 404;
    throw err;
  }

  if (prod.organization_id && prod.organization_id !== params.organization_id) {
    const err: any = new Error('Cross-tenant piece creation is strictly forbidden.');
    err.status = 403;
    throw err;
  }

  // Hard Manufacturing Lineage Guard
  if (prod.profile_type === 'NON_SILVER_RETAIL' && (params.manufacturing_order_id || params.wip_lot_id || params.batch_id)) {
    const err: any = new Error(
      'Non-silver retail merchandise cannot enter manufacturing operations or be assigned to a manufacturing order.'
    );
    err.code = 'NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED';
    err.status = 422;
    throw err;
  }

  const serialPrefix = prod.profile_type === 'NON_SILVER_RETAIL' ? 'RET' : 'BHR';
  const serial = params.serial_number || generatePieceSerialNumber(serialPrefix);
  assertSerialUnique(serial, params.organization_id);

  const barcode = params.barcode || generateEAN13Barcode();
  assertBarcodeUnique(barcode, params.organization_id);

  const piece: IndividualPiece = {
    id: `pc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    product_id: prod.id,
    sku: prod.sku || '',
    serial_number: serial,
    barcode,
    organization_id: params.organization_id,
    warehouse_id: params.warehouse_id || 'wh-cairo-main',
    location_code: params.location_code || 'VAULT-A1',
    current_weight_grams: params.weight_grams || prod.weight_grams || 7.5,
    lifecycle_status: params.lifecycle_status || 'IN_VAULT',
    manufacturing_order_id: params.manufacturing_order_id,
    wip_lot_id: params.wip_lot_id,
    batch_id: params.batch_id,
    gemstone_lot_ids: params.gemstone_lot_ids || [],
    cost_basis: params.cost_basis || prod.cost_price || 75,
    retail_price: params.retail_price || prod.price || 120,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!prod.pieces) prod.pieces = [];
  prod.pieces.push(piece);

  // Append Canonical Ledger Event
  const movementType: CanonicalStockMovementType = params.manufacturing_order_id ? 'PRODUCTION_COMPLETION' : 'RECEIPT';
  appendStockLedgerEvent({
    organization_id: params.organization_id,
    movement_type: movementType,
    product_id: prod.id,
    sku: prod.sku || '',
    barcode,
    piece_id: piece.id,
    serial_number: serial,
    batch_id: params.batch_id,
    manufacturing_order_id: params.manufacturing_order_id,
    wip_lot_id: params.wip_lot_id,
    gemstone_lot_ids: params.gemstone_lot_ids,
    dest_warehouse_id: piece.warehouse_id,
    dest_location_code: piece.location_code,
    quantity_delta: 1,
    weight_grams_delta: piece.current_weight_grams,
    unit_cost: piece.cost_basis,
    total_cost: piece.cost_basis,
    actor_user_id: params.actor_user_id || 'system_piece_intake',
    actor_role: params.actor_role || 'InventorySpecialist',
    reference_id: params.manufacturing_order_id || 'MINT_PIECE',
    reference_type: params.manufacturing_order_id ? 'PRODUCTION' : 'SYSTEM',
    reason: params.reason || 'Serialized piece intake',
    idempotency_key: params.idempotency_key
  });

  persistStore();
  return piece;
}

export function updatePieceLifecycle(
  serialOrId: string,
  newStatus: PieceLifecycleStatus,
  locationCode?: string,
  organizationId?: string,
  options?: {
    actor_user_id?: string;
    actor_role?: string;
    reason?: string;
    reference_id?: string;
    reference_type?: 'ORDER' | 'TRANSFER' | 'RESERVATION' | 'COUNT' | 'PRODUCTION' | 'SYSTEM';
    idempotency_key?: string;
    dest_warehouse_id?: string;
  }
): IndividualPiece {
  for (const prod of globalProducts) {
    if (organizationId && prod.organization_id && prod.organization_id !== organizationId) {
      continue;
    }

    const piece = prod.pieces?.find(
      (pc) => pc.serial_number === serialOrId || pc.id === serialOrId
    );

    if (piece) {
      const prevStatus = piece.lifecycle_status;
      const prevLoc = piece.location_code;
      const prevWh = piece.warehouse_id;

      // Determine movement type
      let movementType: CanonicalStockMovementType;
      let qtyDelta = 0;

      if (newStatus === 'IN_SHOWCASE') {
        movementType = 'VAULT_TO_SHOWCASE';
      } else if (newStatus === 'IN_VAULT') {
        movementType = prevStatus === 'RESERVED' ? 'RESERVATION_RELEASE' : 'SHOWCASE_TO_VAULT';
      } else if (newStatus === 'RESERVED') {
        movementType = 'RESERVATION_HOLD';
      } else if (newStatus === 'SOLD') {
        movementType = 'SALE';
        qtyDelta = -1;
      } else if (newStatus === 'RETURNED') {
        movementType = 'CUSTOMER_RETURN';
        qtyDelta = 1;
      } else if (newStatus === 'QUARANTINED' || newStatus === 'MAINTENANCE') {
        movementType = 'QUARANTINE_HOLD';
      } else if (newStatus === 'SCRAPPED') {
        movementType = 'SCRAP_RECOVERY';
        qtyDelta = -1;
      } else {
        movementType = 'ADJUSTMENT';
      }

      piece.lifecycle_status = newStatus;
      if (locationCode) piece.location_code = locationCode;
      if (options?.dest_warehouse_id) piece.warehouse_id = options.dest_warehouse_id;
      piece.updated_at = new Date().toISOString();

      // Check product stockStatus update
      if (newStatus === 'SOLD') {
        const remainingActive = prod.pieces?.filter((p) => p.lifecycle_status !== 'SOLD' && p.lifecycle_status !== 'SCRAPPED').length || 0;
        if (remainingActive === 0) {
          prod.stockStatus = 'OUT_OF_STOCK';
        }
      } else if (newStatus === 'RETURNED' || newStatus === 'IN_VAULT' || newStatus === 'IN_SHOWCASE') {
        prod.stockStatus = 'IN_STOCK';
      }

      // Append immutable ledger event
      appendStockLedgerEvent({
        organization_id: piece.organization_id || organizationId || 'org_baher_silver',
        movement_type: movementType,
        product_id: prod.id,
        sku: piece.sku,
        barcode: piece.barcode,
        piece_id: piece.id,
        serial_number: piece.serial_number,
        batch_id: piece.batch_id,
        manufacturing_order_id: piece.manufacturing_order_id,
        wip_lot_id: piece.wip_lot_id,
        gemstone_lot_ids: piece.gemstone_lot_ids,
        source_warehouse_id: prevWh,
        source_location_code: prevLoc,
        dest_warehouse_id: piece.warehouse_id,
        dest_location_code: piece.location_code,
        quantity_delta: qtyDelta,
        weight_grams_delta: qtyDelta !== 0 ? qtyDelta * piece.current_weight_grams : 0,
        unit_cost: piece.cost_basis,
        total_cost: piece.cost_basis,
        actor_user_id: options?.actor_user_id || 'system_piece_mutation',
        actor_role: options?.actor_role || 'InventorySpecialist',
        reference_id: options?.reference_id || serialOrId,
        reference_type: options?.reference_type || 'SYSTEM',
        reason: options?.reason || `Lifecycle state changed from ${prevStatus} to ${newStatus}`,
        idempotency_key: options?.idempotency_key
      });

      persistStore();
      return piece;
    }
  }

  const err: any = new Error(`Piece "${serialOrId}" not found.`);
  err.status = 404;
  throw err;
}

// =============================================================================
// CANONICAL UNIFIED STOCK LEDGER CORE FUNCTIONS (Phase 3)
// =============================================================================

export function appendStockLedgerEvent(
  params: Omit<StockLedgerEvent, 'id' | 'timestamp' | 'balance_after_transaction' | 'event_hash'> & {
    timestamp?: string;
    idempotency_key?: string;
    balance_after_transaction?: number;
  }
): StockLedgerEvent {
  // Idempotency check: return existing event if key matches in tenant
  if (params.idempotency_key) {
    const existing = globalStockLedger.find(
      (e) => e.organization_id === params.organization_id && e.idempotency_key === params.idempotency_key
    );
    if (existing) return existing;
  }

  const id = `led_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = params.timestamp || new Date().toISOString();

  // Calculate running balance for this product
  const prevEvents = globalStockLedger.filter(
    (e) => e.organization_id === params.organization_id && e.product_id === params.product_id
  );
  const runningBalance =
    params.balance_after_transaction !== undefined
      ? params.balance_after_transaction
      : prevEvents.reduce((acc, e) => acc + (e.quantity_delta || 0), 0) + (params.quantity_delta || 0);

  const event: StockLedgerEvent = {
    id,
    organization_id: params.organization_id,
    timestamp,
    movement_type: params.movement_type,
    product_id: params.product_id,
    sku: params.sku,
    barcode: params.barcode,
    piece_id: params.piece_id,
    serial_number: params.serial_number,
    batch_id: params.batch_id,
    gemstone_lot_ids: params.gemstone_lot_ids,
    manufacturing_order_id: params.manufacturing_order_id,
    wip_lot_id: params.wip_lot_id,
    source_warehouse_id: params.source_warehouse_id,
    source_location_code: params.source_location_code,
    dest_warehouse_id: params.dest_warehouse_id,
    dest_location_code: params.dest_location_code,
    quantity_delta: params.quantity_delta,
    weight_grams_delta: params.weight_grams_delta,
    unit_cost: params.unit_cost,
    total_cost: params.total_cost,
    balance_after_transaction: runningBalance,
    actor_user_id: params.actor_user_id,
    actor_role: params.actor_role,
    reference_id: params.reference_id,
    reference_type: params.reference_type,
    reason: params.reason,
    idempotency_key: params.idempotency_key,
    event_hash: ''
  };

  event.event_hash = calculateEventHash(event);
  globalStockLedger.push(event);
  persistStore();
  return event;
}

export function executePieceMovement(params: {
  piece_id?: string;
  serial_number?: string;
  movement_type: CanonicalStockMovementType;
  dest_warehouse_id?: string;
  dest_location_code?: string;
  actor_user_id: string;
  actor_role: string;
  reason: string;
  reference_id?: string;
  reference_type?: 'ORDER' | 'TRANSFER' | 'RESERVATION' | 'COUNT' | 'PRODUCTION' | 'SYSTEM';
  organization_id: string;
  idempotency_key?: string;
}): { piece: IndividualPiece; event: StockLedgerEvent } {
  // Idempotency check
  if (params.idempotency_key) {
    const existing = globalStockLedger.find(
      (e) => e.organization_id === params.organization_id && e.idempotency_key === params.idempotency_key
    );
    if (existing) {
      const pInfo = getPieceBySerial(existing.serial_number || existing.piece_id || '', params.organization_id);
      if (pInfo) return { piece: pInfo.piece, event: existing };
    }
  }

  const lookupKey = params.serial_number || params.piece_id;
  if (!lookupKey) {
    const err: any = new Error('Piece serial number or ID must be provided.');
    err.status = 400;
    throw err;
  }

  const pieceInfo = getPieceBySerial(lookupKey, params.organization_id);
  if (!pieceInfo) {
    const err: any = new Error(`Piece "${lookupKey}" not found in organization.`);
    err.status = 404;
    throw err;
  }

  const { piece, product } = pieceInfo;
  const prevStatus = piece.lifecycle_status;
  const prevWh = piece.warehouse_id;
  const prevLoc = piece.location_code;

  let newStatus: PieceLifecycleStatus = prevStatus;
  const targetWarehouse = params.dest_warehouse_id || prevWh;
  let targetLoc = params.dest_location_code || prevLoc;
  let qtyDelta = 0;

  switch (params.movement_type) {
    case 'VAULT_TO_SHOWCASE':
      if (prevStatus !== 'IN_VAULT') {
        const err: any = new Error(`Cannot move piece from vault to showcase in status "${prevStatus}". Piece must be IN_VAULT.`);
        err.status = 422;
        throw err;
      }
      newStatus = 'IN_SHOWCASE';
      targetLoc = params.dest_location_code || 'SHOWCASE-01';
      break;

    case 'SHOWCASE_TO_VAULT':
      if (prevStatus !== 'IN_SHOWCASE') {
        const err: any = new Error(`Cannot return piece to vault in status "${prevStatus}". Piece must be IN_SHOWCASE.`);
        err.status = 422;
        throw err;
      }
      newStatus = 'IN_VAULT';
      targetLoc = params.dest_location_code || 'VAULT-A1';
      break;

    case 'RESERVATION_HOLD':
      if (prevStatus !== 'IN_VAULT' && prevStatus !== 'IN_SHOWCASE') {
        const err: any = new Error(`Cannot reserve piece in status "${prevStatus}". Piece must be IN_VAULT or IN_SHOWCASE.`);
        err.status = 422;
        throw err;
      }
      newStatus = 'RESERVED';
      break;

    case 'RESERVATION_RELEASE':
      if (prevStatus !== 'RESERVED') {
        const err: any = new Error(`Cannot release reservation for piece in status "${prevStatus}". Piece must be RESERVED.`);
        err.status = 422;
        throw err;
      }
      newStatus = prevLoc.startsWith('SHOWCASE') ? 'IN_SHOWCASE' : 'IN_VAULT';
      break;

    case 'SALE':
      if (prevStatus !== 'IN_VAULT' && prevStatus !== 'IN_SHOWCASE' && prevStatus !== 'RESERVED') {
        const err: any = new Error(`Cannot sell piece in status "${prevStatus}". Piece must be available or reserved.`);
        err.status = 422;
        throw err;
      }
      newStatus = 'SOLD';
      qtyDelta = -1;
      break;

    case 'CUSTOMER_RETURN':
      if (prevStatus !== 'SOLD') {
        const err: any = new Error(`Cannot process customer return for piece in status "${prevStatus}". Piece must be SOLD.`);
        err.status = 422;
        throw err;
      }
      newStatus = 'IN_VAULT';
      targetLoc = params.dest_location_code || 'VAULT-A1';
      qtyDelta = 1;
      break;

    case 'QUARANTINE_HOLD':
      newStatus = 'QUARANTINED';
      targetLoc = 'QC-HOLD';
      break;

    case 'QUARANTINE_RELEASE':
      if (prevStatus !== 'QUARANTINED') {
        const err: any = new Error(`Cannot release from quarantine in status "${prevStatus}".`);
        err.status = 422;
        throw err;
      }
      newStatus = 'IN_VAULT';
      targetLoc = params.dest_location_code || 'VAULT-A1';
      break;

    case 'SCRAP_RECOVERY':
      newStatus = 'SCRAPPED';
      targetLoc = 'SCRAP-BIN';
      qtyDelta = -1;
      break;

    default:
      break;
  }

  piece.lifecycle_status = newStatus;
  piece.warehouse_id = targetWarehouse;
  piece.location_code = targetLoc;
  piece.updated_at = new Date().toISOString();

  const remainingActive = product.pieces?.filter((p) => p.lifecycle_status !== 'SOLD' && p.lifecycle_status !== 'SCRAPPED').length || 0;
  if (remainingActive === 0) {
    product.stockStatus = 'OUT_OF_STOCK';
  } else {
    product.stockStatus = 'IN_STOCK';
  }

  const event = appendStockLedgerEvent({
    organization_id: params.organization_id,
    movement_type: params.movement_type,
    product_id: product.id,
    sku: piece.sku,
    barcode: piece.barcode,
    piece_id: piece.id,
    serial_number: piece.serial_number,
    batch_id: piece.batch_id,
    gemstone_lot_ids: piece.gemstone_lot_ids,
    manufacturing_order_id: piece.manufacturing_order_id,
    wip_lot_id: piece.wip_lot_id,
    source_warehouse_id: prevWh,
    source_location_code: prevLoc,
    dest_warehouse_id: targetWarehouse,
    dest_location_code: targetLoc,
    quantity_delta: qtyDelta,
    weight_grams_delta: qtyDelta !== 0 ? qtyDelta * piece.current_weight_grams : 0,
    unit_cost: piece.cost_basis,
    total_cost: piece.cost_basis,
    actor_user_id: params.actor_user_id,
    actor_role: params.actor_role,
    reference_id: params.reference_id || piece.serial_number,
    reference_type: params.reference_type || 'SYSTEM',
    reason: params.reason,
    idempotency_key: params.idempotency_key
  });

  persistStore();
  return { piece, event };
}

export function executeWarehouseTransfer(params: {
  piece_id?: string;
  serial_number?: string;
  product_id?: string;
  quantity?: number;
  from_warehouse_id: string;
  to_warehouse_id: string;
  from_location_code?: string;
  to_location_code?: string;
  actor_user_id: string;
  actor_role: string;
  reason: string;
  organization_id: string;
  idempotency_key?: string;
}): { transfer_id: string; outbound_event: StockLedgerEvent; inbound_event: StockLedgerEvent; piece?: IndividualPiece } {
  if (params.from_warehouse_id === params.to_warehouse_id) {
    const err: any = new Error('Source and destination warehouses cannot be the same.');
    err.status = 400;
    throw err;
  }

  // Idempotency check
  if (params.idempotency_key) {
    const existingOut = globalStockLedger.find(
      (e) => e.organization_id === params.organization_id && e.idempotency_key === `${params.idempotency_key}_out`
    );
    const existingIn = globalStockLedger.find(
      (e) => e.organization_id === params.organization_id && e.idempotency_key === `${params.idempotency_key}_in`
    );
    if (existingOut && existingIn) {
      const pInfo = existingOut.piece_id ? getPieceBySerial(existingOut.piece_id, params.organization_id) : null;
      return {
        transfer_id: existingOut.reference_id || 'TRF-EXISTING',
        outbound_event: existingOut,
        inbound_event: existingIn,
        piece: pInfo?.piece
      };
    }
  }

  const transferId = `trf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const toLocation = params.to_location_code || 'VAULT-A1';

  // 1. Serialized piece transfer
  if (params.serial_number || params.piece_id) {
    const lookupKey = params.serial_number || params.piece_id!;
    const pieceInfo = getPieceBySerial(lookupKey, params.organization_id);
    if (!pieceInfo) {
      const err: any = new Error(`Piece "${lookupKey}" not found.`);
      err.status = 404;
      throw err;
    }
    const { piece, product } = pieceInfo;

    if (piece.warehouse_id !== params.from_warehouse_id) {
      const err: any = new Error(
        `Piece "${piece.serial_number}" is currently in warehouse "${piece.warehouse_id}", not in source warehouse "${params.from_warehouse_id}".`
      );
      err.status = 422;
      throw err;
    }

    if (piece.lifecycle_status === 'SOLD' || piece.lifecycle_status === 'SCRAPPED' || piece.lifecycle_status === 'QUARANTINED') {
      const err: any = new Error(`Cannot transfer piece in status "${piece.lifecycle_status}".`);
      err.status = 422;
      throw err;
    }

    const fromLoc = piece.location_code;

    const outboundEvent = appendStockLedgerEvent({
      organization_id: params.organization_id,
      movement_type: 'TRANSFER_OUT',
      product_id: product.id,
      sku: piece.sku,
      barcode: piece.barcode,
      piece_id: piece.id,
      serial_number: piece.serial_number,
      source_warehouse_id: params.from_warehouse_id,
      source_location_code: fromLoc,
      dest_warehouse_id: params.to_warehouse_id,
      dest_location_code: toLocation,
      quantity_delta: -1,
      weight_grams_delta: -piece.current_weight_grams,
      unit_cost: piece.cost_basis,
      total_cost: piece.cost_basis,
      actor_user_id: params.actor_user_id,
      actor_role: params.actor_role,
      reference_id: transferId,
      reference_type: 'TRANSFER',
      reason: `Transfer to warehouse ${params.to_warehouse_id}: ${params.reason}`,
      idempotency_key: params.idempotency_key ? `${params.idempotency_key}_out` : undefined
    });

    const inboundEvent = appendStockLedgerEvent({
      organization_id: params.organization_id,
      movement_type: 'TRANSFER_IN',
      product_id: product.id,
      sku: piece.sku,
      barcode: piece.barcode,
      piece_id: piece.id,
      serial_number: piece.serial_number,
      source_warehouse_id: params.from_warehouse_id,
      source_location_code: fromLoc,
      dest_warehouse_id: params.to_warehouse_id,
      dest_location_code: toLocation,
      quantity_delta: 1,
      weight_grams_delta: piece.current_weight_grams,
      unit_cost: piece.cost_basis,
      total_cost: piece.cost_basis,
      actor_user_id: params.actor_user_id,
      actor_role: params.actor_role,
      reference_id: transferId,
      reference_type: 'TRANSFER',
      reason: `Transfer from warehouse ${params.from_warehouse_id}: ${params.reason}`,
      idempotency_key: params.idempotency_key ? `${params.idempotency_key}_in` : undefined
    });

    piece.warehouse_id = params.to_warehouse_id;
    piece.location_code = toLocation;
    piece.updated_at = new Date().toISOString();
    persistStore();

    return { transfer_id: transferId, outbound_event: outboundEvent, inbound_event: inboundEvent, piece };
  }

  // 2. Non-serialized bulk product transfer
  if (!params.product_id) {
    const err: any = new Error('Product ID or piece identifier is required for warehouse transfer.');
    err.status = 400;
    throw err;
  }

  const prod = globalProducts.find((p) => p.id === params.product_id);
  if (!prod) {
    const err: any = new Error(`Product "${params.product_id}" not found.`);
    err.status = 404;
    throw err;
  }

  const qty = Number(params.quantity || 1);
  if (qty <= 0) {
    const err: any = new Error('Transfer quantity must be greater than zero.');
    err.status = 400;
    throw err;
  }

  // Verify stock in source warehouse
  const sourceEvents = globalStockLedger.filter(
    (e) =>
      e.organization_id === params.organization_id &&
      e.product_id === prod.id &&
      (e.dest_warehouse_id === params.from_warehouse_id || e.source_warehouse_id === params.from_warehouse_id)
  );
  const availableInSource = sourceEvents.reduce((sum, ev) => {
    if (ev.dest_warehouse_id === params.from_warehouse_id) return sum + ev.quantity_delta;
    if (ev.source_warehouse_id === params.from_warehouse_id && ev.movement_type === 'TRANSFER_OUT') return sum + ev.quantity_delta;
    return sum;
  }, 0);

  if (availableInSource < qty) {
    const err: any = new Error(`Insufficient stock in warehouse "${params.from_warehouse_id}". Available: ${availableInSource}, Requested: ${qty}`);
    err.status = 422;
    throw err;
  }

  const outboundEvent = appendStockLedgerEvent({
    organization_id: params.organization_id,
    movement_type: 'TRANSFER_OUT',
    product_id: prod.id,
    sku: prod.sku || '',
    barcode: prod.barcode || '',
    source_warehouse_id: params.from_warehouse_id,
    source_location_code: params.from_location_code || 'BULK-STORE',
    dest_warehouse_id: params.to_warehouse_id,
    dest_location_code: toLocation,
    quantity_delta: -qty,
    weight_grams_delta: -(qty * (prod.weight_grams || 1)),
    unit_cost: prod.cost_price,
    total_cost: (prod.cost_price || 0) * qty,
    actor_user_id: params.actor_user_id,
    actor_role: params.actor_role,
    reference_id: transferId,
    reference_type: 'TRANSFER',
    reason: `Transfer to warehouse ${params.to_warehouse_id}: ${params.reason}`,
    idempotency_key: params.idempotency_key ? `${params.idempotency_key}_out` : undefined
  });

  const inboundEvent = appendStockLedgerEvent({
    organization_id: params.organization_id,
    movement_type: 'TRANSFER_IN',
    product_id: prod.id,
    sku: prod.sku || '',
    barcode: prod.barcode || '',
    source_warehouse_id: params.from_warehouse_id,
    source_location_code: params.from_location_code || 'BULK-STORE',
    dest_warehouse_id: params.to_warehouse_id,
    dest_location_code: toLocation,
    quantity_delta: qty,
    weight_grams_delta: qty * (prod.weight_grams || 1),
    unit_cost: prod.cost_price,
    total_cost: (prod.cost_price || 0) * qty,
    actor_user_id: params.actor_user_id,
    actor_role: params.actor_role,
    reference_id: transferId,
    reference_type: 'TRANSFER',
    reason: `Transfer from warehouse ${params.from_warehouse_id}: ${params.reason}`,
    idempotency_key: params.idempotency_key ? `${params.idempotency_key}_in` : undefined
  });

  return { transfer_id: transferId, outbound_event: outboundEvent, inbound_event: inboundEvent };
}

export function recordQuantityMovement(params: {
  product_id: string;
  movement_type: CanonicalStockMovementType;
  warehouse_id: string;
  location_code?: string;
  quantity_delta: number;
  weight_grams_delta?: number;
  unit_cost?: number;
  actor_user_id: string;
  actor_role: string;
  reason: string;
  reference_id?: string;
  reference_type?: 'ORDER' | 'TRANSFER' | 'RESERVATION' | 'COUNT' | 'PRODUCTION' | 'SYSTEM';
  organization_id: string;
  idempotency_key?: string;
}): StockLedgerEvent {
  const prod = globalProducts.find((p) => p.id === params.product_id);
  if (!prod) {
    const err: any = new Error(`Product "${params.product_id}" not found.`);
    err.status = 404;
    throw err;
  }

  // Prevent negative stock for non-serialized items if deducting
  if (params.quantity_delta < 0) {
    const prevEvents = globalStockLedger.filter(
      (e) => e.organization_id === params.organization_id && e.product_id === prod.id
    );
    const currentBal = prevEvents.reduce((acc, e) => acc + (e.quantity_delta || 0), 0);
    if (currentBal + params.quantity_delta < 0) {
      const err: any = new Error(`Insufficient stock. Available: ${currentBal}, requested deduction: ${Math.abs(params.quantity_delta)}`);
      err.status = 422;
      throw err;
    }
  }

  return appendStockLedgerEvent({
    organization_id: params.organization_id,
    movement_type: params.movement_type,
    product_id: prod.id,
    sku: prod.sku || '',
    barcode: prod.barcode || '',
    dest_warehouse_id: params.warehouse_id,
    dest_location_code: params.location_code || 'MAIN-STORAGE',
    quantity_delta: params.quantity_delta,
    weight_grams_delta: params.weight_grams_delta || params.quantity_delta * (prod.weight_grams || 1),
    unit_cost: params.unit_cost || prod.cost_price,
    total_cost: (params.unit_cost || prod.cost_price || 0) * Math.abs(params.quantity_delta),
    actor_user_id: params.actor_user_id,
    actor_role: params.actor_role,
    reference_id: params.reference_id,
    reference_type: params.reference_type,
    reason: params.reason,
    idempotency_key: params.idempotency_key
  });
}

export function recordStockAdjustment(params: {
  product_id: string;
  piece_id?: string;
  serial_number?: string;
  warehouse_id: string;
  location_code?: string;
  physical_count: number;
  expected_count: number;
  actor_user_id: string;
  actor_role: string;
  reason: string;
  organization_id: string;
  idempotency_key?: string;
}): StockLedgerEvent {
  if (!params.reason || params.reason.trim().length < 5) {
    const err: any = new Error('A detailed justification reason (min 5 chars) is mandatory for physical count adjustments.');
    err.status = 422;
    throw err;
  }

  const delta = params.physical_count - params.expected_count;
  const prod = globalProducts.find((p) => p.id === params.product_id);
  if (!prod) {
    const err: any = new Error(`Product "${params.product_id}" not found.`);
    err.status = 404;
    throw err;
  }

  return appendStockLedgerEvent({
    organization_id: params.organization_id,
    movement_type: 'ADJUSTMENT',
    product_id: prod.id,
    sku: prod.sku || '',
    barcode: prod.barcode || '',
    piece_id: params.piece_id,
    serial_number: params.serial_number,
    dest_warehouse_id: params.warehouse_id,
    dest_location_code: params.location_code || 'AUDIT-ADJUSTMENT',
    quantity_delta: delta,
    weight_grams_delta: delta * (prod.weight_grams || 1),
    unit_cost: prod.cost_price,
    total_cost: (prod.cost_price || 0) * Math.abs(delta),
    actor_user_id: params.actor_user_id,
    actor_role: params.actor_role,
    reference_id: `CYCLE_COUNT_${Date.now()}`,
    reference_type: 'COUNT',
    reason: params.reason,
    idempotency_key: params.idempotency_key
  });
}

export function computeDerivedStock(params: {
  organization_id: string;
  warehouse_id?: string;
  product_id?: string;
  purity?: string;
}): DerivedStockBalance[] {
  let products = globalProducts.filter(
    (p) => !p.organization_id || p.organization_id === params.organization_id
  );

  if (params.product_id) {
    products = products.filter((p) => p.id === params.product_id);
  }
  if (params.purity) {
    products = products.filter((p) => p.purity === params.purity);
  }

  return products.map((prod) => {
    let pieces = prod.pieces || [];
    if (params.warehouse_id) {
      pieces = pieces.filter((pc) => pc.warehouse_id === params.warehouse_id);
    }

    const warehouseBreakdown: DerivedStockBalance['warehouse_breakdown'] = {};

    if (prod.is_serialized) {
      let totalOnHand = 0;
      let vaultStock = 0;
      let showcaseStock = 0;
      let reservedStock = 0;
      let quarantineStock = 0;
      let scrappedStock = 0;

      for (const pc of pieces) {
        const whId = pc.warehouse_id || 'wh-cairo-main';
        if (!warehouseBreakdown[whId]) {
          warehouseBreakdown[whId] = {
            warehouse_id: whId,
            warehouse_name: whId === 'wh-cairo-main' ? 'Cairo Central Vault' : whId === 'wh-alex-branch' ? 'Alexandria Vault' : whId,
            on_hand: 0,
            vault: 0,
            showcase: 0,
            reserved: 0,
            available: 0
          };
        }

        const wb = warehouseBreakdown[whId];

        if (pc.lifecycle_status !== 'SOLD' && pc.lifecycle_status !== 'SCRAPPED') {
          totalOnHand++;
          wb.on_hand++;
        }

        if (pc.lifecycle_status === 'IN_VAULT') {
          vaultStock++;
          wb.vault++;
          wb.available++;
        } else if (pc.lifecycle_status === 'IN_SHOWCASE') {
          showcaseStock++;
          wb.showcase++;
          wb.available++;
        } else if (pc.lifecycle_status === 'RESERVED') {
          reservedStock++;
          wb.reserved++;
        } else if (pc.lifecycle_status === 'QUARANTINED') {
          quarantineStock++;
        } else if (pc.lifecycle_status === 'SCRAPPED') {
          scrappedStock++;
        }
      }

      return {
        product_id: prod.id,
        sku: prod.sku || '',
        barcode: prod.barcode || '',
        name: prod.name,
        purity: prod.purity,
        category: prod.category,
        is_serialized: true,
        total_on_hand: totalOnHand,
        vault_stock: vaultStock,
        showcase_stock: showcaseStock,
        reserved_stock: reservedStock,
        available_stock: vaultStock + showcaseStock,
        quarantine_stock: quarantineStock,
        scrapped_stock: scrappedStock,
        warehouse_breakdown: warehouseBreakdown
      };
    } else {
      // Non-serialized item: aggregate from ledger
      const prodEvents = globalStockLedger.filter(
        (e) => e.organization_id === params.organization_id && e.product_id === prod.id
      );

      let totalQty = 0;
      for (const ev of prodEvents) {
        totalQty += ev.quantity_delta || 0;
        const whId = ev.dest_warehouse_id || ev.source_warehouse_id || 'wh-cairo-main';
        if (!warehouseBreakdown[whId]) {
          warehouseBreakdown[whId] = {
            warehouse_id: whId,
            warehouse_name: whId,
            on_hand: 0,
            vault: 0,
            showcase: 0,
            reserved: 0,
            available: 0
          };
        }
        warehouseBreakdown[whId].on_hand += ev.quantity_delta || 0;
        warehouseBreakdown[whId].available += ev.quantity_delta || 0;
      }

      return {
        product_id: prod.id,
        sku: prod.sku || '',
        barcode: prod.barcode || '',
        name: prod.name,
        purity: prod.purity,
        category: prod.category,
        is_serialized: false,
        total_on_hand: Math.max(0, totalQty),
        vault_stock: Math.max(0, totalQty),
        showcase_stock: 0,
        reserved_stock: 0,
        available_stock: Math.max(0, totalQty),
        quarantine_stock: 0,
        scrapped_stock: 0,
        warehouse_breakdown: warehouseBreakdown
      };
    }
  });
}

export function reconcileStock(organization_id: string, warehouse_id?: string): StockReconciliationReport {
  const divergences: StockReconciliationDivergence[] = [];
  const tenantProducts = globalProducts.filter(
    (p) => !p.organization_id || p.organization_id === organization_id
  );

  let totalPiecesEvaluated = 0;
  const tenantEvents = globalStockLedger.filter((e) => e.organization_id === organization_id);

  for (const prod of tenantProducts) {
    if (prod.is_serialized && prod.pieces) {
      for (const pc of prod.pieces) {
        if (warehouse_id && pc.warehouse_id !== warehouse_id) continue;
        totalPiecesEvaluated++;

        const pieceEvents = tenantEvents.filter((e) => e.piece_id === pc.id || e.serial_number === pc.serial_number);
        const ledgerPieceBalance = pieceEvents.reduce((acc, e) => acc + (e.quantity_delta || 0), 0);
        const projectedPieceBalance = (pc.lifecycle_status === 'SOLD' || pc.lifecycle_status === 'SCRAPPED') ? 0 : 1;

        if (ledgerPieceBalance !== projectedPieceBalance) {
          divergences.push({
            entity_id: pc.id,
            entity_type: 'PIECE',
            sku_or_serial: pc.serial_number,
            ledger_balance: ledgerPieceBalance,
            projected_balance: projectedPieceBalance,
            discrepancy: projectedPieceBalance - ledgerPieceBalance,
            reason: `Piece "${pc.serial_number}" in status "${pc.lifecycle_status}" has projected balance ${projectedPieceBalance} but ledger sum is ${ledgerPieceBalance}.`
          });
        }
      }
    } else {
      const prodEvents = tenantEvents.filter((e) => e.product_id === prod.id);
      const ledgerSum = prodEvents.reduce((acc, e) => acc + (e.quantity_delta || 0), 0);
      if (ledgerSum < 0) {
        divergences.push({
          entity_id: prod.id,
          entity_type: 'PRODUCT',
          sku_or_serial: prod.sku || prod.id,
          ledger_balance: ledgerSum,
          projected_balance: 0,
          discrepancy: -ledgerSum,
          reason: `Negative stock balance detected on non-serialized item (${ledgerSum}).`
        });
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    organization_id,
    warehouse_id,
    total_ledger_events: tenantEvents.length,
    total_pieces_evaluated: totalPiecesEvaluated,
    is_divergent: divergences.length > 0,
    divergences
  };
}

export function getStockLedger(params: {
  organization_id: string;
  product_id?: string;
  piece_id?: string;
  serial_number?: string;
  warehouse_id?: string;
  movement_type?: CanonicalStockMovementType;
  limit?: number;
  offset?: number;
}): { events: StockLedgerEvent[]; total: number } {
  let filtered = globalStockLedger.filter((e) => e.organization_id === params.organization_id);

  if (params.product_id) filtered = filtered.filter((e) => e.product_id === params.product_id);
  if (params.piece_id) filtered = filtered.filter((e) => e.piece_id === params.piece_id);
  if (params.serial_number) filtered = filtered.filter((e) => e.serial_number === params.serial_number);
  if (params.warehouse_id) {
    filtered = filtered.filter(
      (e) => e.dest_warehouse_id === params.warehouse_id || e.source_warehouse_id === params.warehouse_id
    );
  }
  if (params.movement_type) filtered = filtered.filter((e) => e.movement_type === params.movement_type);

  const sorted = [...filtered].reverse();
  const total = sorted.length;
  const offset = params.offset || 0;
  const limit = params.limit || 50;

  return {
    events: sorted.slice(offset, offset + limit),
    total
  };
}

export function getPieceBySerial(
  serialNumber: string,
  organizationId?: string
): { piece: IndividualPiece; product: Product } | null {
  for (const prod of globalProducts) {
    if (organizationId && prod.organization_id && prod.organization_id !== organizationId) {
      continue;
    }

    const piece = prod.pieces?.find(
      (pc) =>
        pc.serial_number === serialNumber ||
        pc.id === serialNumber ||
        pc.barcode === serialNumber
    );

    if (piece) {
      return { piece, product: prod };
    }
  }

  return null;
}

export function getPiecesForProduct(
  productId: string,
  organizationId?: string
): IndividualPiece[] {
  const prod = globalProducts.find((p) => p.id === productId);
  if (!prod) return [];
  if (organizationId && prod.organization_id && prod.organization_id !== organizationId) {
    return [];
  }
  return prod.pieces || [];
}

// =============================================================================
// CANONICAL PRODUCT ENGINE CRUD API
// =============================================================================

export function getProducts(options?: {
  category?: string;
  collection?: string;
  query?: string;
  status?: string;
  isBestSeller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  organizationId?: string;
  profile_type?: ProductProfileType;
}) {
  let result = [...globalProducts];

  // Tenant Isolation Filter (when specified)
  if (options?.organizationId) {
    result = result.filter(
      (p) => !p.organization_id || p.organization_id === options.organizationId
    );
  }

  if (options?.profile_type) {
    result = result.filter((p) => (p.profile_type || 'SILVER_JEWELRY') === options.profile_type);
  }

  if (options?.category && options.category !== 'all') {
    const cat = options.category.toLowerCase();
    result = result.filter((p) => p.category.toLowerCase() === cat);
  }

  if (options?.query) {
    const q = options.query.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.en.toLowerCase().includes(q) ||
        p.name.ar.includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.model_number && p.model_number.toLowerCase().includes(q)) ||
        (p.pieces && p.pieces.some((pc) => pc.serial_number.toLowerCase().includes(q)))
    );
  }

  if (options?.status && options.status !== 'all') {
    if (options.status === 'published') {
      result = result.filter((p) => p.stockStatus !== 'OUT_OF_STOCK');
    } else if (options.status === 'draft') {
      result = result.filter((p) => p.stockStatus === 'OUT_OF_STOCK');
    }
  }

  if (options?.isBestSeller) {
    result = result.filter((p) => p.isBestSeller);
  }

  if (options?.isNew) {
    result = result.filter((p) => p.isNew);
  }

  return result;
}

export function getProductBySlugOrId(idOrSlug: string, organizationId?: string): Product | undefined {
  const prod = globalProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
  if (!prod) return undefined;
  if (organizationId && prod.organization_id && prod.organization_id !== organizationId) {
    return undefined; // Tenant isolation
  }
  return prod;
}

export function createProduct(
  data: Partial<Product> & {
    name_en?: string;
    name_ar?: string;
    organization_id: string;
  }
): Product {
  const orgId = data.organization_id || 'org_baher_silver';
  const id = data.id || `prod-${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const slug =
    data.slug ||
    (data.name_en
      ? data.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : `product-${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  const profileType: ProductProfileType = data.profile_type || 'SILVER_JEWELRY';

  let purity: SilverPurity | undefined = undefined;
  let weight: number | undefined = undefined;
  let laborCost = 0;
  let metal: 'silver' | undefined = undefined;
  const brand = data.brand;
  const modelNumber = data.model_number;
  const warrantyPeriod = data.warranty_period;
  const materialDescription = data.material_description;
  const packageWeight = data.package_weight_grams ? Number(data.package_weight_grams) : undefined;
  const taxClassification = data.tax_classification;

  if (profileType === 'SILVER_JEWELRY') {
    // Silver purity validation
    const candidatePurity = data.purity || '925';
    assertValidSilverPurity(candidatePurity);
    purity = candidatePurity;
    metal = 'silver';
    weight = data.weight_grams ? Number(data.weight_grams) : 7.5;
    laborCost = data.labor_cost !== undefined ? Number(data.labor_cost) : 25;
  } else {
    // Non-Silver Retail merchandise validation: strictly cannot have silver purity
    if (data.purity) {
      const err: any = new Error('Non-silver retail merchandise cannot have a silver purity rating.');
      err.code = 'NON_SILVER_CANNOT_HAVE_PURITY';
      err.status = 422;
      throw err;
    }
    laborCost = 0;
    metal = undefined;
  }

  const category = data.category || (profileType === 'SILVER_JEWELRY' ? 'rings' : 'accessories');
  const defaultSkuPrefix = profileType === 'NON_SILVER_RETAIL' ? 'RET' : 'SIL';
  const sku = data.sku || generateSKU(category, defaultSkuPrefix);
  const barcode = data.barcode || generateEAN13Barcode();

  // Enforce Uniqueness
  assertBarcodeUnique(barcode, orgId, id);
  assertSkuUnique(sku, orgId, id);

  const isSerialized = data.is_serialized !== undefined ? data.is_serialized : (profileType === 'SILVER_JEWELRY');
  const price = Number(data.price || data.selling_price || 120);
  const costPrice = data.cost_price ? Number(data.cost_price) : Math.round(price * 0.6);

  const initialPiece: IndividualPiece | null = isSerialized
    ? {
        id: `pc_${id}_01`,
        product_id: id,
        sku,
        serial_number: generatePieceSerialNumber(profileType === 'NON_SILVER_RETAIL' ? 'RET' : 'BHR'),
        barcode,
        organization_id: orgId,
        warehouse_id: 'wh-cairo-main',
        location_code: 'SHOWCASE-01',
        current_weight_grams: weight || packageWeight || 7.5,
        lifecycle_status: 'IN_SHOWCASE',
        gemstone_lot_ids: profileType === 'SILVER_JEWELRY' ? (data.gemstone_ids || []) : [],
        cost_basis: costPrice,
        retail_price: price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    : null;

  const defaultDetails = profileType === 'SILVER_JEWELRY'
    ? {
        material: { en: `${purity} Sterling Silver`, ar: `فضة إسترليني عيار ${purity}` },
        silverWeight: `${weight}g`,
        description: {
          en: 'Crafted from authentic sterling silver with premium anti-tarnish finish.',
          ar: `مصنوع من الفضة الإسترليني عيار ${purity} الخالصة مع طلاء مانع للتأكسد.`
        }
      }
    : {
        material: {
          en: materialDescription || brand || 'Standard Commercial Merchandise',
          ar: materialDescription || brand || 'بضاعة تجارية عامة'
        },
        description: {
          en: materialDescription || 'Commercial retail merchandise for Baher Silver.',
          ar: materialDescription || 'بضاعة تجارية عامة لفرع باهر سيلفر.'
        }
      };

  const newProduct: Product = {
    id,
    slug,
    sku,
    barcode,
    profile_type: profileType,
    is_serialized: isSerialized,
    metal,
    purity,
    weight_grams: weight,
    package_weight_grams: packageWeight,
    brand,
    model_number: modelNumber,
    warranty_period: warrantyPeriod,
    material_description: materialDescription,
    tax_classification: taxClassification,
    labor_cost: laborCost,
    cost_price: costPrice,
    selling_price: price,
    gemstone_ids: profileType === 'SILVER_JEWELRY' ? (data.gemstone_ids || []) : [],
    organization_id: orgId,
    pieces: initialPiece ? [initialPiece] : [],
    name: data.name || {
      en: data.name_en || (profileType === 'SILVER_JEWELRY' ? 'New Silver Product' : 'New Retail Merchandise'),
      ar: data.name_ar || (profileType === 'SILVER_JEWELRY' ? 'منتج فضة جديد' : 'بضاعة تجارية جديدة')
    },
    price,
    image: data.image || 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800',
    gallery: data.gallery || [
      data.image || 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800'
    ],
    category,
    stockStatus: data.stockStatus || 'IN_STOCK',
    isNew: data.isNew ?? true,
    isBestSeller: data.isBestSeller ?? false,
    isLimited: data.isLimited ?? false,
    isHandmade: profileType === 'SILVER_JEWELRY' ? (data.isHandmade ?? true) : false,
    details: data.details || defaultDetails
  };

  globalProducts.unshift(newProduct);
  persistStore();
  return newProduct;
}

export function updateProduct(
  id: string,
  updates: Partial<Product> & {
    name_en?: string;
    name_ar?: string;
    organization_id?: string;
  }
): Product | null {
  const index = globalProducts.findIndex((p) => p.id === id || p.slug === id);
  if (index === -1) return null;

  const existing = globalProducts[index];
  const orgId = updates.organization_id || existing.organization_id || 'org_baher_silver';

  // Cross-tenant guard
  if (existing.organization_id && updates.organization_id && existing.organization_id !== updates.organization_id) {
    const err: any = new Error('Cross-tenant product mutation is forbidden.');
    err.status = 403;
    throw err;
  }

  const profileType: ProductProfileType = updates.profile_type || existing.profile_type || 'SILVER_JEWELRY';

  if (profileType === 'SILVER_JEWELRY') {
    if (updates.purity) {
      assertValidSilverPurity(updates.purity);
    }
  } else {
    if (updates.purity) {
      const err: any = new Error('Non-silver retail merchandise cannot have a silver purity rating.');
      err.code = 'NON_SILVER_CANNOT_HAVE_PURITY';
      err.status = 422;
      throw err;
    }
  }

  // Uniqueness validation on update if barcode or SKU changed
  if (updates.barcode && updates.barcode !== existing.barcode) {
    assertBarcodeUnique(updates.barcode, orgId, existing.id);
  }
  if (updates.sku && updates.sku !== existing.sku) {
    assertSkuUnique(updates.sku, orgId, existing.id);
  }

  const updated: Product = {
    ...existing,
    ...updates,
    profile_type: profileType,
    sku: updates.sku || existing.sku,
    barcode: updates.barcode || existing.barcode,
    is_serialized: updates.is_serialized !== undefined ? updates.is_serialized : existing.is_serialized,
    purity: profileType === 'SILVER_JEWELRY' ? (updates.purity || existing.purity) : undefined,
    weight_grams: profileType === 'SILVER_JEWELRY' ? (updates.weight_grams !== undefined ? Number(updates.weight_grams) : existing.weight_grams) : undefined,
    package_weight_grams: updates.package_weight_grams !== undefined ? Number(updates.package_weight_grams) : existing.package_weight_grams,
    labor_cost: profileType === 'SILVER_JEWELRY' ? (updates.labor_cost !== undefined ? Number(updates.labor_cost) : existing.labor_cost) : 0,
    cost_price: updates.cost_price !== undefined ? Number(updates.cost_price) : existing.cost_price,
    selling_price: updates.selling_price !== undefined ? Number(updates.selling_price) : (updates.price ? Number(updates.price) : existing.selling_price),
    gemstone_ids: profileType === 'SILVER_JEWELRY' ? (updates.gemstone_ids || existing.gemstone_ids) : [],
    brand: updates.brand !== undefined ? updates.brand : existing.brand,
    model_number: updates.model_number !== undefined ? updates.model_number : existing.model_number,
    warranty_period: updates.warranty_period !== undefined ? updates.warranty_period : existing.warranty_period,
    material_description: updates.material_description !== undefined ? updates.material_description : existing.material_description,
    tax_classification: updates.tax_classification !== undefined ? updates.tax_classification : existing.tax_classification,
    organization_id: orgId,
    name: {
      en: updates.name_en || updates.name?.en || existing.name.en,
      ar: updates.name_ar || updates.name?.ar || existing.name.ar
    },
    price: updates.price !== undefined ? Number(updates.price) : existing.price,
    category: updates.category || existing.category,
    image: updates.image || existing.image,
    gallery: updates.gallery || existing.gallery,
    stockStatus: updates.stockStatus || existing.stockStatus
  };

  globalProducts[index] = updated;
  persistStore();
  return updated;
}

export function deleteProduct(id: string, organizationId?: string): boolean {
  const index = globalProducts.findIndex((p) => p.id === id || p.slug === id);
  if (index === -1) return false;

  const existing = globalProducts[index];
  if (organizationId && existing.organization_id && existing.organization_id !== organizationId) {
    const err: any = new Error('Cross-tenant product deletion is forbidden.');
    err.status = 403;
    throw err;
  }

  globalProducts.splice(index, 1);
  persistStore();
  return true;
}

// =============================================================================
// CATEGORIES & COLLECTIONS
// =============================================================================

export function getCategories(): Category[] {
  return [...globalCategories];
}

export function createCategory(data: { nameEn: string; nameAr: string; slug?: string; image?: string }): Category {
  const slug = data.slug || data.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name: { en: data.nameEn, ar: data.nameAr },
    slug,
    image: data.image || 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800'
  };

  globalCategories.push(newCat);
  persistStore();
  return newCat;
}

export function getCollections(): EnterpriseCollection[] {
  return [...globalCollections];
}

export function createCollection(data: { nameEn: string; nameAr: string; slug?: string; image?: string }): EnterpriseCollection {
  const slug = data.slug || data.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const newCol: EnterpriseCollection = {
    id: `col-${Date.now()}`,
    name: { en: data.nameEn, ar: data.nameAr },
    slug,
    image: data.image || 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800'
  };

  globalCollections.push(newCol);
  persistStore();
  return newCol;
}

// =============================================================================
// DASHBOARD METRICS CALCULATION
// =============================================================================

export function getDashboardMetrics() {
  const totalProducts = globalProducts.length;
  const inStockProducts = globalProducts.filter((p) => p.stockStatus === 'IN_STOCK').length;
  const lowStockCount = globalProducts.filter((p) => p.stockStatus === 'OUT_OF_STOCK').length;

  const calculatedTotalRevenue = globalProducts.reduce((acc, p) => acc + p.price * 12, 0);
  const calculatedOrdersCount = globalProducts.length * 8 + 42;
  const calculatedCustomersCount = globalProducts.length * 25 + 150;

  return {
    totalProducts,
    inStockProducts,
    lowStockCount,
    totalCategories: globalCategories.length,
    totalCollections: globalCollections.length,
    revenueTotalFormatted: `$${calculatedTotalRevenue.toLocaleString()}`,
    ordersCount: calculatedOrdersCount,
    customersCount: calculatedCustomersCount
  };
}
