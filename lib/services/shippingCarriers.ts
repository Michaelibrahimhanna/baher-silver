import { OrderAggregate } from '../types/orderAggregate';

export type ShippingCarrierType = 'Bosta' | 'Aramex' | 'FedEx';

export interface WaybillCreationRequest {
  order: OrderAggregate;
  carrier: ShippingCarrierType;
  pickupGovernorate: string;
  deliveryGovernorate: string;
  packageWeightKg?: number;
}

export interface WaybillCreationResponse {
  trackingNumber: string;
  waybillPdfUrl: string;
  carrier: ShippingCarrierType;
  estimatedDeliveryDate: string;
  status: 'Created' | 'PickupScheduled' | 'InTransit' | 'Delivered';
}

export interface IShippingCarrierAdapter {
  getCarrierName(): ShippingCarrierType;
  createWaybill(request: WaybillCreationRequest): Promise<WaybillCreationResponse>;
  trackShipment(trackingNumber: string): Promise<{ status: string; currentLocation: string }>;
}

/**
 * 1. Bosta Carrier Adapter (Egypt Express Logistics)
 */
class BostaCarrierAdapter implements IShippingCarrierAdapter {
  getCarrierName(): ShippingCarrierType { return 'Bosta'; }

  async createWaybill(): Promise<WaybillCreationResponse> {
    const trackingNo = `BOSTA-${Math.floor(10000000 + Math.random() * 90000000)}`;
    return {
      trackingNumber: trackingNo,
      waybillPdfUrl: `https://app.bosta.co/api/v0/deliveries/waybill/${trackingNo}.pdf`,
      carrier: 'Bosta',
      estimatedDeliveryDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      status: 'Created',
    };
  }

  async trackShipment(): Promise<{ status: string; currentLocation: string }> {
    return { status: 'InTransit', currentLocation: 'Cairo Hub 3' };
  }
}

/**
 * 2. Aramex Carrier Adapter (Regional & International Logistics)
 */
class AramexCarrierAdapter implements IShippingCarrierAdapter {
  getCarrierName(): ShippingCarrierType { return 'Aramex'; }

  async createWaybill(): Promise<WaybillCreationResponse> {
    const trackingNo = `ARMX-${Math.floor(100000000 + Math.random() * 900000000)}`;
    return {
      trackingNumber: trackingNo,
      waybillPdfUrl: `https://www.aramex.com/print/shipment/${trackingNo}`,
      carrier: 'Aramex',
      estimatedDeliveryDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: 'PickupScheduled',
    };
  }

  async trackShipment(): Promise<{ status: string; currentLocation: string }> {
    return { status: 'OutForDelivery', currentLocation: 'New Cairo Facility' };
  }
}

class ShippingCarrierService {
  private adapters: Map<ShippingCarrierType, IShippingCarrierAdapter> = new Map();

  constructor() {
    this.adapters.set('Bosta', new BostaCarrierAdapter());
    this.adapters.set('Aramex', new AramexCarrierAdapter());
  }

  getAdapter(carrier: ShippingCarrierType): IShippingCarrierAdapter {
    return this.adapters.get(carrier) || this.adapters.get('Bosta')!;
  }

  async dispatchShipment(request: WaybillCreationRequest): Promise<WaybillCreationResponse> {
    const adapter = this.getAdapter(request.carrier);
    return adapter.createWaybill(request);
  }
}

export const shippingCarrierService = new ShippingCarrierService();
