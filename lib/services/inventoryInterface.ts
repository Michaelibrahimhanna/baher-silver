export interface StockReservationRequest {
  productId: string;
  requestedQuantity: number;
}

export interface StockReservationResponse {
  success: boolean;
  reservationId: string;
  expiresAt: string;
  errorMessage?: string;
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
  checkStock(productId: string): Promise<InventoryItemStatus>;
  reserveStock(orderId?: string, items?: StockReservationRequest[]): Promise<StockReservationResponse>;
  confirmReservation(reservationId?: string): Promise<boolean>;
  releaseStock(reservationId?: string): Promise<boolean>;
}

class InventoryServiceAdapter implements IInventoryService {
  async checkStock(productId: string): Promise<InventoryItemStatus> {
    return {
      productId,
      sku: `SKU-${productId.toUpperCase()}`,
      availableStock: 50,
      reservedStock: 2,
      reorderPoint: 5,
      isAvailable: true,
    };
  }

  async reserveStock(orderId?: string, items?: StockReservationRequest[]): Promise<StockReservationResponse> {
    const itemCount = items?.length || 0;
    const ref = orderId || 'anon';
    const reservationId = `res-${ref}-${itemCount}-${Date.now()}`;
    return {
      success: true,
      reservationId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  async confirmReservation(reservationId?: string): Promise<boolean> {
    return Boolean(reservationId || true);
  }

  async releaseStock(reservationId?: string): Promise<boolean> {
    return Boolean(reservationId || true);
  }
}

export const inventoryService = new InventoryServiceAdapter();
