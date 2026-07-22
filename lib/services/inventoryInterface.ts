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

  async reserveStock(): Promise<StockReservationResponse> {
    const reservationId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      reservationId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  async confirmReservation(): Promise<boolean> {
    return true;
  }

  async releaseStock(): Promise<boolean> {
    return true;
  }
}

export const inventoryService = new InventoryServiceAdapter();
