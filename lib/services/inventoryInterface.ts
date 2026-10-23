import {
  getProductBySlugOrId,
  computeDerivedStock,
  executePieceMovement,
  getPiecesForProduct,
  getStockLedger,
  appendStockLedgerEvent
} from '../db/productEngine';

export interface StockReservationRequest {
  productId: string;
  requestedQuantity: number;
}

export interface StockReservationResponse {
  success: boolean;
  reservationId: string;
  expiresAt: string;
  errorMessage?: string;
  allocatedPieces?: string[];
}

export interface InventoryItemStatus {
  productId: string;
  sku: string;
  availableStock: number;
  reservedStock: number;
  reorderPoint: number;
  isAvailable: boolean;
}

export interface IInventoryService {
  checkStock(productId: string, organizationId?: string): Promise<InventoryItemStatus>;
  reserveStock(
    orderId?: string,
    items?: StockReservationRequest[],
    organizationId?: string,
    actorId?: string
  ): Promise<StockReservationResponse>;
  confirmReservation(reservationId?: string, organizationId?: string): Promise<boolean>;
  releaseStock(reservationId?: string, organizationId?: string): Promise<boolean>;
}

interface ActiveReservation {
  id: string;
  orderId: string;
  organizationId: string;
  items: Array<{ productId: string; quantity: number; pieceIds: string[] }>;
  expiresAt: number;
  confirmed: boolean;
}

// In-Memory Active Reservations Store
const activeReservations: Map<string, ActiveReservation> = new Map();

class CanonicalInventoryServiceAdapter implements IInventoryService {
  async checkStock(productId: string, organizationId = 'org_baher_silver'): Promise<InventoryItemStatus> {
    const prod = getProductBySlugOrId(productId, organizationId);
    if (!prod) {
      return {
        productId,
        sku: `SKU-${productId.toUpperCase()}`,
        availableStock: 0,
        reservedStock: 0,
        reorderPoint: 5,
        isAvailable: false
      };
    }

    const derived = computeDerivedStock({
      organization_id: organizationId,
      product_id: prod.id
    });

    const stock = derived[0];
    const available = stock ? stock.available_stock : 0;
    const reserved = stock ? stock.reserved_stock : 0;

    return {
      productId: prod.id,
      sku: prod.sku || `SKU-${prod.id}`,
      availableStock: available,
      reservedStock: reserved,
      reorderPoint: 5,
      isAvailable: available > 0
    };
  }

  async reserveStock(
    orderId?: string,
    items?: StockReservationRequest[],
    organizationId = 'org_baher_silver',
    actorId = 'system_reservation'
  ): Promise<StockReservationResponse> {
    if (!items || items.length === 0) {
      return {
        success: false,
        reservationId: '',
        expiresAt: '',
        errorMessage: 'No items requested for reservation.'
      };
    }

    const ref = orderId || `order_${Date.now()}`;
    const reservationId = `res_${ref}_${Date.now()}`;
    const expiresAtMs = Date.now() + 15 * 60 * 1000; // 15-minute TTL
    const allocatedPieces: string[] = [];
    const reservationItems: Array<{ productId: string; quantity: number; pieceIds: string[] }> = [];

    // 1. All-or-Nothing Pre-Validation Phase (Guardrail 10)
    for (const item of items) {
      const prod = getProductBySlugOrId(item.productId, organizationId);
      if (!prod) {
        return {
          success: false,
          reservationId: '',
          expiresAt: '',
          errorMessage: `Product "${item.productId}" not found.`
        };
      }

      const status = await this.checkStock(prod.id, organizationId);
      if (status.availableStock < item.requestedQuantity) {
        return {
          success: false,
          reservationId: '',
          expiresAt: '',
          errorMessage: `Insufficient available stock for product "${prod.name.en}". Available: ${status.availableStock}, Requested: ${item.requestedQuantity}`
        };
      }
    }

    // 2. Execution Phase (Atomic lock ordering)
    for (const item of items) {
      const prod = getProductBySlugOrId(item.productId, organizationId)!;
      const pieceIdsForThisItem: string[] = [];

      if (prod.is_serialized && prod.pieces) {
        // Allocate specific pieces that are available (FIFO: sorted by created_at)
        const availablePieces = prod.pieces
          .filter((pc) => pc.lifecycle_status === 'IN_VAULT' || pc.lifecycle_status === 'IN_SHOWCASE')
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(0, item.requestedQuantity);

        for (const piece of availablePieces) {
          executePieceMovement({
            serial_number: piece.serial_number,
            movement_type: 'RESERVATION_HOLD',
            actor_user_id: actorId,
            actor_role: 'InventorySpecialist',
            reason: `Reserved for order ${ref}`,
            reference_id: reservationId,
            reference_type: 'RESERVATION',
            organization_id: organizationId
          });
          allocatedPieces.push(piece.serial_number);
          pieceIdsForThisItem.push(piece.id);
        }
      } else {
        // Non-serialized bulk reservation
        appendStockLedgerEvent({
          organization_id: organizationId,
          movement_type: 'RESERVATION_HOLD',
          product_id: prod.id,
          sku: prod.sku || '',
          barcode: prod.barcode || '',
          dest_warehouse_id: 'wh-cairo-main',
          dest_location_code: 'RESERVED-STAGING',
          quantity_delta: -item.requestedQuantity,
          weight_grams_delta: -(item.requestedQuantity * (prod.weight_grams || 1)),
          actor_user_id: actorId,
          actor_role: 'InventorySpecialist',
          reference_id: reservationId,
          reference_type: 'RESERVATION',
          reason: `Reserved for order ${ref}`
        });
      }

      reservationItems.push({
        productId: prod.id,
        quantity: item.requestedQuantity,
        pieceIds: pieceIdsForThisItem
      });
    }

    activeReservations.set(reservationId, {
      id: reservationId,
      orderId: ref,
      organizationId,
      items: reservationItems,
      expiresAt: expiresAtMs,
      confirmed: false
    });

    return {
      success: true,
      reservationId,
      expiresAt: new Date(expiresAtMs).toISOString(),
      allocatedPieces
    };
  }

  async confirmReservation(reservationId?: string, organizationId = 'org_baher_silver'): Promise<boolean> {
    if (!reservationId) return false;
    const res = activeReservations.get(reservationId);
    if (!res || res.organizationId !== organizationId) return false;

    res.confirmed = true;
    return true;
  }

  async releaseStock(reservationId?: string, organizationId = 'org_baher_silver'): Promise<boolean> {
    if (!reservationId) return false;
    const res = activeReservations.get(reservationId);
    if (!res || res.organizationId !== organizationId) return false;

    // Release all held pieces back to available stock
    for (const item of res.items) {
      for (const pieceId of item.pieceIds) {
        try {
          executePieceMovement({
            piece_id: pieceId,
            movement_type: 'RESERVATION_RELEASE',
            actor_user_id: 'system_reservation_release',
            actor_role: 'InventorySpecialist',
            reason: `Reservation ${reservationId} released or expired`,
            reference_id: reservationId,
            reference_type: 'RESERVATION',
            organization_id: organizationId
          });
        } catch {
          // continue
        }
      }
    }

    activeReservations.delete(reservationId);
    return true;
  }
}

export const inventoryService = new CanonicalInventoryServiceAdapter();
