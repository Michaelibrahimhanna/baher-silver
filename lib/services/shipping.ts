import { Money, createMoney, zeroMoney } from '../types/money';
import { ShippingSnapshot } from '../types/orderAggregate';

export interface ShippingZone {
  id: string;
  nameEn: string;
  nameAr: string;
  governorates: string[];
  baseRate: Money;
}

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'zone-1',
    nameEn: 'Greater Cairo Zone',
    nameAr: 'إقليم القاهرة الكبرى',
    governorates: ['Cairo', 'Giza', 'Qalyubia'],
    baseRate: createMoney(50, 'EGP'),
  },
  {
    id: 'zone-2',
    nameEn: 'Alexandria & Delta Zone',
    nameAr: 'إقليم الإسكندرية والدلتا',
    governorates: ['Alexandria', 'Beheira', 'Gharbia', 'Monufia', 'Dakahlia', 'Kafr El Sheikh', 'Sharqia', 'Damietta'],
    baseRate: createMoney(65, 'EGP'),
  },
  {
    id: 'zone-3',
    nameEn: 'Canal & Upper Egypt Zone',
    nameAr: 'إقليم القناة والصعيد',
    governorates: ['Suez', 'Ismailia', 'Port Said', 'Fayoum', 'Beni Suef', 'Minya', 'Asyut', 'Sohag', 'Qena', 'Luxor', 'Aswan'],
    baseRate: createMoney(85, 'EGP'),
  },
  {
    id: 'zone-4',
    nameEn: 'Remote & Red Sea Zone',
    nameAr: 'المناطق النائية والبحر الأحمر',
    governorates: ['Red Sea', 'South Sinai', 'North Sinai', 'New Valley', 'Matrouh'],
    baseRate: createMoney(110, 'EGP'),
  },
];

export interface CarrierAdapter {
  id: string;
  name: string;
  estimatedDays: string;
  calculateFee(zoneId: string, baseRate: Money): Money;
  generateTrackingNumber(): string;
}

class BostaAdapter implements CarrierAdapter {
  id = 'bosta';
  name = 'Bosta Express';
  estimatedDays = '1 - 2 Business Days';
  calculateFee(zoneId: string, baseRate: Money): Money {
    return baseRate; // standard rate
  }
  generateTrackingNumber(): string {
    return `BST-${Math.floor(10000000 + Math.random() * 90000000)}`;
  }
}

class AramexAdapter implements CarrierAdapter {
  id = 'aramex';
  name = 'Aramex Priority';
  estimatedDays = '2 - 3 Business Days';
  calculateFee(zoneId: string, baseRate: Money): Money {
    return createMoney(baseRate.amountInCents / 100 + 15, baseRate.currency);
  }
  generateTrackingNumber(): string {
    return `ARM-${Math.floor(100000000 + Math.random() * 900000000)}`;
  }
}

class FedExAdapter implements CarrierAdapter {
  id = 'fedex';
  name = 'FedEx Premium Express';
  estimatedDays = '1 Business Day';
  calculateFee(zoneId: string, baseRate: Money): Money {
    return createMoney(baseRate.amountInCents / 100 + 35, baseRate.currency);
  }
  generateTrackingNumber(): string {
    return `FDX-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  }
}

export const CARRIER_ADAPTERS: Record<string, CarrierAdapter> = {
  bosta: new BostaAdapter(),
  aramex: new AramexAdapter(),
  fedex: new FedExAdapter(),
};

class ShippingService {
  private freeShippingThreshold = createMoney(1500, 'EGP');

  getZoneForGovernorate(governorateName: string): ShippingZone {
    const found = SHIPPING_ZONES.find(z =>
      z.governorates.some(g => g.toLowerCase() === governorateName.toLowerCase())
    );
    return found || SHIPPING_ZONES[0];
  }

  calculateShippingCost(
    governorate: string,
    subtotal: Money,
    carrierId = 'bosta',
    hasFreeShippingCoupon = false
  ): { fee: Money; isFree: boolean; zone: ShippingZone; carrier: CarrierAdapter } {
    const zone = this.getZoneForGovernorate(governorate);
    const carrier = CARRIER_ADAPTERS[carrierId] || CARRIER_ADAPTERS.bosta;
    
    // Check free shipping condition
    const isEligibleForFreeThreshold = subtotal.amountInCents >= this.freeShippingThreshold.amountInCents;
    if (hasFreeShippingCoupon || isEligibleForFreeThreshold) {
      return {
        fee: zeroMoney(subtotal.currency),
        isFree: true,
        zone,
        carrier,
      };
    }

    const calculatedFee = carrier.calculateFee(zone.id, zone.baseRate);
    return {
      fee: calculatedFee,
      isFree: false,
      zone,
      carrier,
    };
  }

  createShippingSnapshot(
    governorate: string,
    addressLine1: string,
    city: string,
    subtotal: Money,
    carrierId = 'bosta',
    hasFreeShippingCoupon = false,
    additional?: { addressLine2?: string; postalCode?: string; latitude?: number; longitude?: number }
  ): ShippingSnapshot {
    const { fee, isFree, zone, carrier } = this.calculateShippingCost(
      governorate,
      subtotal,
      carrierId,
      hasFreeShippingCoupon
    );

    return {
      zoneId: zone.id,
      zoneName: zone.nameEn,
      governorate,
      addressLine1,
      addressLine2: additional?.addressLine2,
      city,
      postalCode: additional?.postalCode,
      latitude: additional?.latitude,
      longitude: additional?.longitude,
      carrierId: carrier.id,
      carrierName: carrier.name,
      trackingNumber: carrier.generateTrackingNumber(),
      baseRate: fee,
      freeShippingApplied: isFree,
    };
  }
}

export const shippingService = new ShippingService();
