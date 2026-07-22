import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/services/rateLimiter';
import { fraudDetectionService } from '@/lib/services/fraudDetection';
import { inventoryService } from '@/lib/services/inventoryInterface';
import { pricingService } from '@/lib/services/pricingService';
import { paymentService } from '@/lib/services/payment';
import { shippingService } from '@/lib/services/shipping';
import { orderStateMachine } from '@/lib/services/orderStateMachine';
import { invoiceService } from '@/lib/services/invoice';
import { emailService } from '@/lib/services/emailService';
import { OrderAggregate } from '@/lib/types/orderAggregate';
import { createMoney } from '@/lib/types/money';
import { CartItem } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 1. Rate Limiting Check
    const rateCheck = rateLimiter.check(ip, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    const body = await request.json();
    const {
      cartItems,
      shippingAddress,
      paymentMethod = 'Paymob',
      isGuest = true,
      customerEmail,
      customerPhone,
      couponCode,
      currency = 'EGP',
      idempotencyKey,
    } = body;

    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400 });
    }

    // 2. Centralized Pricing Calculation
    const pricingResult = pricingService.calculatePricing({
      items: cartItems.map((item: CartItem) => ({
        productId: item.id,
        unitPrice: createMoney(item.product.price, currency),
        quantity: item.quantity,
      })),
      governorate: shippingAddress.governorate,
      carrierId: 'bosta',
      couponCode,
      currency,
    });

    // 3. Fraud Detection Check
    const fraudEval = await fraudDetectionService.evaluate({
      email: customerEmail,
      phone: customerPhone,
      ipAddress: ip,
      shippingAddress,
      totalAmountInCents: pricingResult.total.amountInCents,
      paymentMethod,
    });

    if (fraudEval.status === 'Rejected') {
      return NextResponse.json(
        { error: 'Transaction flagged for security risk. Please contact support.', flags: fraudEval.flags },
        { status: 403 }
      );
    }

    // 4. Reserve Inventory stock via interface
    const orderNumber = orderStateMachine.generateBusinessOrderNumber();
    const reservation = await inventoryService.reserveStock(
      orderNumber,
      cartItems.map((item: CartItem) => ({
        productId: item.id,
        requestedQuantity: item.quantity,
      }))
    );

    // 5. Payment Attempt with Idempotency Key
    const paymentAttempt = await paymentService.processPaymentAttempt(paymentMethod, {
      orderId: orderNumber,
      amount: pricingResult.total,
      currency,
      customerEmail,
      customerPhone,
      idempotencyKey,
    });

    // 6. Build Order Aggregate Root
    const shippingSnapshot = shippingService.createShippingSnapshot(
      shippingAddress.governorate,
      shippingAddress.addressLine1,
      shippingAddress.city,
      pricingResult.subtotal,
      'bosta',
      pricingResult.isFreeShipping,
      {
        addressLine2: shippingAddress.addressLine2,
        postalCode: shippingAddress.postalCode,
        latitude: shippingAddress.latitude,
        longitude: shippingAddress.longitude,
      }
    );

    const initialOrder: OrderAggregate = {
      id: `ord-${Math.random().toString(36).substring(2, 9)}`,
      orderNumber,
      status: paymentAttempt.status === 'Pending' || paymentAttempt.status === 'Success' ? 'Paid' : 'Pending',
      isGuest,
      guestEmail: customerEmail,
      guestPhone: customerPhone,
      items: cartItems.map((item: CartItem) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name.en,
        productImage: item.product.image || '/placeholder.jpg',
        sku: `SKU-${item.product.id}`,
        unitPrice: createMoney(item.product.price, currency),
        quantity: item.quantity,
        lineTotal: createMoney(item.product.price * item.quantity, currency),
      })),
      pricingSnapshot: pricingResult.snapshot,
      shippingSnapshot,
      payments: [paymentAttempt],
      shipments: [],
      stateHistory: [
        {
          id: `tr-init`,
          timestamp: new Date().toISOString(),
          fromState: 'Draft',
          toState: paymentAttempt.status === 'Pending' || paymentAttempt.status === 'Success' ? 'Paid' : 'Pending',
          actor: 'Customer Checkout',
          reason: 'Initial order placement',
        },
      ],
      fraudRiskScore: fraudEval.riskScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Generate Invoice
    const invoice = invoiceService.generateInvoice(initialOrder);
    initialOrder.invoice = invoice;

    // Send Confirmation Email
    await emailService.sendOrderConfirmation(initialOrder, customerEmail);

    return NextResponse.json({
      success: true,
      order: initialOrder,
      reservationId: reservation.reservationId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
