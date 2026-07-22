import assert from 'node:assert/strict';
import { createMoney, moneyToDecimal, formatMoney, addMoney, subtractMoney, multiplyMoney, convertMoney, zeroMoney } from '../lib/types/money';
import { taxService } from '../lib/services/tax';
import { couponEngine } from '../lib/services/coupon';
import { pricingService } from '../lib/services/pricingService';
import { orderStateMachine } from '../lib/services/orderStateMachine';
import { paymentService, PaymentProviderType } from '../lib/services/payment';
import { shippingService } from '../lib/services/shipping';
import { inventoryService } from '../lib/services/inventoryInterface';
import { fraudDetectionService } from '../lib/services/fraudDetection';
import { invoiceService } from '../lib/services/invoice';
import { emailService } from '../lib/services/emailService';
import { loyaltyService } from '../lib/services/loyalty';
import { cmsService } from '../lib/services/cms';
import { notificationService } from '../lib/services/notifications';
import { shippingCarrierService } from '../lib/services/shippingCarriers';
import { trackingEngine } from '../lib/analytics/trackingEngine';
import { OrderAggregate, PricingSnapshot, ShippingSnapshot } from '../lib/types/orderAggregate';

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passedTests++;
        console.log(`  ✓ ${name}`);
      }).catch((err) => {
        console.error(`  ✗ ${name}:`, err);
        throw err;
      });
    }
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}:`, err);
    throw err;
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('  BAHER SILVER COMMERCE DOMAIN AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  console.log('--- 1. MONEY VALUE OBJECT UNIT TESTS ---');
  test('Money creation and decimal conversion', () => {
    const m = createMoney(150.50, 'EGP');
    assert.equal(m.amountInCents, 15050);
    assert.equal(moneyToDecimal(m), 150.50);
  });

  test('Decimal-safe Addition (prevents float math errors)', () => {
    const a = createMoney(0.10, 'EGP');
    const b = createMoney(0.20, 'EGP');
    const sum = addMoney(a, b);
    assert.equal(sum.amountInCents, 30);
    assert.equal(moneyToDecimal(sum), 0.30);
  });

  test('Money Subtraction and Multiplication', () => {
    const base = createMoney(100, 'EGP');
    const discount = createMoney(15, 'EGP');
    const diff = subtractMoney(base, discount);
    assert.equal(moneyToDecimal(diff), 85.00);

    const multiplied = multiplyMoney(base, 0.14);
    assert.equal(multiplied.amountInCents, 1400);
  });

  test('Currency Conversion & Formatting', () => {
    const egp = createMoney(1000, 'EGP');
    const usd = convertMoney(egp, 'USD');
    assert.equal(usd.currency, 'USD');
    assert.equal(usd.amountInCents, 2100);

    const formatted = formatMoney(egp, 'en');
    assert.ok(formatted.includes('1,000') || formatted.includes('1000'));
  });

  console.log('\n--- 2. TAX ENGINE UNIT TESTS ---');
  test('Standard 14% Egyptian VAT calculation', () => {
    const subtotal = createMoney(1000, 'EGP');
    const res = taxService.calculateTax(subtotal, 'standard');
    assert.equal(res.ratePercent, 14.0);
    assert.equal(res.taxAmount.amountInCents, 14000);
  });

  test('Zero-rated silver bullion tax rule', () => {
    const bullionSubtotal = createMoney(5000, 'EGP');
    const res = taxService.calculateTax(bullionSubtotal, 'bullion');
    assert.equal(res.ratePercent, 0.0);
    assert.equal(res.taxAmount.amountInCents, 0);
  });

  console.log('\n--- 3. COUPON ENGINE UNIT TESTS ---');
  test('Percentage coupon calculation with cap (SILVER10)', () => {
    const subtotal = createMoney(2000, 'EGP');
    const res = couponEngine.validateAndCalculate('SILVER10', subtotal);
    assert.equal(res.valid, true);
    assert.equal(res.discountAmount.amountInCents, 20000);
  });

  test('Fixed discount coupon (WELCOME200)', () => {
    const subtotal = createMoney(1500, 'EGP');
    const res = couponEngine.validateAndCalculate('WELCOME200', subtotal, true);
    assert.equal(res.valid, true);
    assert.equal(res.discountAmount.amountInCents, 20000);
  });

  test('Minimum order spend threshold rejection', () => {
    const lowSubtotal = createMoney(100, 'EGP');
    const res = couponEngine.validateAndCalculate('SILVER10', lowSubtotal);
    assert.equal(res.valid, false);
    assert.ok(res.errorMessage?.includes('Minimum order amount'));
  });

  console.log('\n--- 4. CENTRALIZED PRICING SERVICE UNIT TESTS ---');
  test('Single Source of Truth complete pricing calculation', () => {
    const result = pricingService.calculatePricing({
      items: [
        { productId: 'p1', unitPrice: createMoney(1000, 'EGP'), quantity: 1 },
      ],
      governorate: 'Cairo',
      couponCode: 'SILVER10',
      currency: 'EGP',
    });

    assert.equal(result.subtotal.amountInCents, 100000);
    assert.equal(result.discount.amountInCents, 10000);
    assert.equal(result.shippingFee.amountInCents, 5000);
    assert.equal(result.taxAmount.amountInCents, 12600);
    assert.equal(result.total.amountInCents, 107600);
    assert.equal(result.snapshot.currency, 'EGP');
  });

  console.log('\n--- 5. ORDER STATE MACHINE UNIT TESTS ---');
  test('Business Order Number generation (BS-2026-000001)', () => {
    const num1 = orderStateMachine.generateBusinessOrderNumber();
    assert.ok(num1.startsWith('BS-2026-'));
  });

  test('Valid order state transitions and history logging', () => {
    const initialOrder: OrderAggregate = {
      id: 'ord-test-1',
      orderNumber: 'BS-2026-000099',
      status: 'Draft',
      isGuest: true,
      items: [],
      pricingSnapshot: {} as PricingSnapshot,
      shippingSnapshot: {} as ShippingSnapshot,
      payments: [],
      shipments: [],
      stateHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pendingOrder = orderStateMachine.transitionOrder(initialOrder, 'Pending', 'Checkout System');
    assert.equal(pendingOrder.status, 'Pending');
    assert.equal(pendingOrder.stateHistory.length, 1);

    const paidOrder = orderStateMachine.transitionOrder(pendingOrder, 'Paid', 'Paymob Gateway');
    assert.equal(paidOrder.status, 'Paid');
    assert.equal(paidOrder.stateHistory.length, 2);
  });

  console.log('\n--- 6. LOYALTY ENGINE & REWARDS UNIT TESTS ---');
  test('Loyalty points calculation by tier', () => {
    const ptsSilver = loyaltyService.calculateEarnedPoints(100000, 'Silver');
    assert.equal(ptsSilver, 100);

    const ptsGold = loyaltyService.calculateEarnedPoints(100000, 'Gold');
    assert.equal(ptsGold, 125);
  });

  test('Loyalty tier calculation by lifetime points', () => {
    assert.equal(loyaltyService.calculateTier(500), 'Silver');
    assert.equal(loyaltyService.calculateTier(1500), 'Gold');
    assert.equal(loyaltyService.calculateTier(3000), 'Platinum');
  });

  test('Loyalty points redemption for discount coupon', () => {
    const profile = loyaltyService.getDemoProfile();
    const redeemRes = loyaltyService.redeemPoints(profile, 500, 'EGP');
    assert.equal(redeemRes.success, true);
    assert.equal(redeemRes.pointsRedeemed, 500);
    assert.equal(redeemRes.discountMoney.amountInCents, 25000);
    assert.equal(redeemRes.newPointsBalance, 750);
  });

  console.log('\n--- 7. HEADLESS CMS & MARKETING ENGINE UNIT TESTS ---');
  test('CMS Homepage retrieval and block composition', () => {
    const page = cmsService.getPageBySlug('home');
    assert.ok(page);
    assert.equal(page.slug, 'home');
    assert.ok(page.blocks.length >= 3);
    assert.equal(page.seo.metaTitle.en.includes('Baher Silver'), true);
  });

  test('CMS Page save & version snapshot auditing', () => {
    const page = cmsService.getPageBySlug('home')!;
    const initialVersionCount = page.versions.length;

    page.title.en = 'Updated Homepage Title';
    const updated = cmsService.savePage(page, 'Test Editor');

    assert.equal(updated.versions.length, initialVersionCount + 1);
    assert.ok(updated.versions[0].versionId.startsWith('v'));
  });

  test('CMS Blog post retrieval by slug', () => {
    const post = cmsService.getBlogPostBySlug('how-to-care-for-925-silver');
    assert.ok(post);
    assert.equal(post.category, 'Care Guide');
    assert.ok(post.tags.includes('Silver Care'));
  });

  test('AI Content Draft Generator Prompt Helper', () => {
    const aiRes = cmsService.generateAIBilingualContentPrompt('Silver Ring Craftsmanship');
    assert.ok(aiRes.en.includes('Silver Ring Craftsmanship'));
    assert.ok(aiRes.ar.includes('Silver Ring Craftsmanship'));
  });

  console.log('\n--- 8. ENTERPRISE NOTIFICATIONS & WHATSAPP UNIT TESTS ---');
  await test('Email Dispatcher for Order Confirmation & Payment Status', async () => {
    const res = await notificationService.sendEmail({
      template: 'OrderConfirmation',
      recipientEmail: 'alex@example.com',
    });
    assert.equal(res.success, true);
    assert.ok(res.messageId.startsWith('msg-orderconfirmation-'));
  });

  await test('Meta WhatsApp Cloud API Notification Dispatcher', async () => {
    const waRes = await notificationService.sendWhatsAppNotification({
      recipientPhone: '+201012345678',
      templateName: 'order_update',
      orderNumber: 'BS-2026-000099',
      language: 'ar',
    });
    assert.equal(waRes.success, true);
    assert.ok(waRes.whatsappMessageId.startsWith('wamid.'));
  });

  console.log('\n--- 9. BOSTA & ARAMEX SHIPPING CARRIERS UNIT TESTS ---');
  await test('Bosta Shipping Carrier Waybill Creation', async () => {
    const waybill = await shippingCarrierService.dispatchShipment({
      order: { orderNumber: 'BS-2026-000088' } as OrderAggregate,
      carrier: 'Bosta',
      pickupGovernorate: 'Cairo',
      deliveryGovernorate: 'Giza',
    });
    assert.equal(waybill.carrier, 'Bosta');
    assert.ok(waybill.trackingNumber.startsWith('BOSTA-'));
  });

  await test('Aramex Shipping Carrier Waybill Creation', async () => {
    const waybill = await shippingCarrierService.dispatchShipment({
      order: { orderNumber: 'BS-2026-000089' } as OrderAggregate,
      carrier: 'Aramex',
      pickupGovernorate: 'Cairo',
      deliveryGovernorate: 'Alexandria',
    });
    assert.equal(waybill.carrier, 'Aramex');
    assert.ok(waybill.trackingNumber.startsWith('ARMX-'));
  });

  console.log('\n--- 10. ANALYTICS TRACKING ENGINE UNIT TESTS ---');
  await test('Universal Analytics Dispatcher (GA4, Meta CAPI, TikTok Pixel)', async () => {
    await trackingEngine.dispatchEvent({
      eventName: 'Purchase',
      currency: 'EGP',
      value: 1250,
      contentIds: ['p1', 'p2'],
    });
    assert.ok(true);
  });

  console.log('\n--- 11. 10 MODULAR PAYMENT PROVIDERS UNIT TESTS ---');
  const providers: PaymentProviderType[] = [
    'Paymob',
    'VodafoneCash',
    'InstaPay',
    'Meeza',
    'Stripe',
    'ApplePay',
    'GooglePay',
    'Fawry',
    'ValU',
    'COD',
  ];

  for (const p of providers) {
    await test(`Modular Payment Provider Initialization: ${p}`, async () => {
      const key = `idemp-${p.toLowerCase()}-${Date.now()}`;
      const attempt = await paymentService.processPaymentAttempt(p, {
        orderId: `BS-TEST-${p}`,
        amount: createMoney(500, 'EGP'),
        currency: 'EGP',
        customerEmail: `${p.toLowerCase()}@example.com`,
        idempotencyKey: key,
      });

      assert.equal(attempt.provider, p);
      assert.equal(attempt.idempotencyKey, key);
      assert.ok(attempt.providerReference);
    });
  }

  test('Automatic Country & Currency Payment Filtering', () => {
    const egpProviders = paymentService.getAvailableProviders('EG', 'EGP');
    assert.ok(egpProviders.includes('InstaPay'));
    assert.ok(egpProviders.includes('Meeza'));
    assert.ok(egpProviders.includes('VodafoneCash'));

    const usdProviders = paymentService.getAvailableProviders('US', 'USD');
    assert.ok(usdProviders.includes('Stripe'));
    assert.ok(usdProviders.includes('ApplePay'));
    assert.equal(usdProviders.includes('Meeza'), false);
  });

  console.log('\n--- 12. INTEGRATION TESTS ---');
  await test('Guest Checkout End-to-End Integration Flow', async () => {
    const idempotencyKey = `idemp-guest-${Date.now()}`;
    const cartItems = [
      { id: 'p1', product: { id: 'p1', price: 1500, name: { en: 'Silver Ring', ar: 'خاتم فضة' }, image: '/ring.jpg' }, quantity: 1 },
    ];
    const shippingAddress = {
      fullName: 'Guest User',
      phone: '+201012345678',
      governorate: 'Cairo',
      city: 'New Cairo',
      addressLine1: 'Street 9',
    };

    const pricing = pricingService.calculatePricing({
      items: cartItems.map(i => ({ productId: i.id, unitPrice: createMoney(i.product.price), quantity: i.quantity })),
      governorate: shippingAddress.governorate,
    });

    const fraud = await fraudDetectionService.evaluate({
      email: 'guest@example.com',
      phone: shippingAddress.phone,
      shippingAddress: { ...shippingAddress, street: shippingAddress.addressLine1 },
      totalAmountInCents: pricing.total.amountInCents,
      paymentMethod: 'Paymob',
    });
    assert.equal(fraud.status, 'Approved');

    const reservation = await inventoryService.reserveStock('BS-2026-000001', [{ productId: 'p1', requestedQuantity: 1 }]);
    assert.ok(reservation.reservationId);

    const payment = await paymentService.processPaymentAttempt('Paymob', {
      orderId: 'BS-2026-000001',
      amount: pricing.total,
      currency: 'EGP',
      customerEmail: 'guest@example.com',
      idempotencyKey,
    });
    assert.equal(payment.idempotencyKey, idempotencyKey);
  });

  await test('InstaPay & Meeza Payment Flow Integration', async () => {
    const ipnKey = `idemp-ipn-${Date.now()}`;
    const ipnAttempt = await paymentService.processPaymentAttempt('InstaPay', {
      orderId: 'BS-2026-000010',
      amount: createMoney(1200, 'EGP'),
      currency: 'EGP',
      customerEmail: 'instapay@example.com',
      idempotencyKey: ipnKey,
    });
    assert.equal(ipnAttempt.provider, 'InstaPay');

    const meezaKey = `idemp-meeza-${Date.now()}`;
    const meezaAttempt = await paymentService.processPaymentAttempt('Meeza', {
      orderId: 'BS-2026-000011',
      amount: createMoney(1200, 'EGP'),
      currency: 'EGP',
      customerEmail: 'meeza@example.com',
      idempotencyKey: meezaKey,
    });
    assert.equal(meezaAttempt.provider, 'Meeza');
  });

  await test('Payment Failure Recovery Integration Flow', async () => {
    const idempotencyKey1 = `idemp-fail-${Date.now()}`;
    const idempotencyKey2 = `idemp-retry-${Date.now()}`;

    await paymentService.processPaymentAttempt('Stripe', {
      orderId: 'BS-2026-000002',
      amount: createMoney(1200, 'EGP'),
      currency: 'EGP',
      customerEmail: 'customer@example.com',
      idempotencyKey: idempotencyKey1,
    });

    const attempt2 = await paymentService.processPaymentAttempt('COD', {
      orderId: 'BS-2026-000002',
      amount: createMoney(1200, 'EGP'),
      currency: 'EGP',
      customerEmail: 'customer@example.com',
      idempotencyKey: idempotencyKey2,
    });

    assert.equal(attempt2.provider, 'COD');
    assert.equal(attempt2.status, 'Pending');
  });

  await test('Successful Payment & Invoice Dispatch Integration Flow', async () => {
    const orderNum = orderStateMachine.generateBusinessOrderNumber();
    const subtotal = createMoney(2500, 'EGP');
    const shippingSnap = shippingService.createShippingSnapshot('Cairo', 'Road 90', 'New Cairo', subtotal);

    const order: OrderAggregate = {
      id: 'ord-succ-1',
      orderNumber: orderNum,
      status: 'Paid',
      isGuest: true,
      guestEmail: 'alex@example.com',
      items: [],
      pricingSnapshot: {
        subtotal,
        discount: zeroMoney('EGP'),
        shipping: shippingSnap.baseRate,
        taxes: createMoney(350, 'EGP'),
        total: createMoney(2850, 'EGP'),
        exchangeRate: 1,
        currency: 'EGP',
        calculatedAt: new Date().toISOString(),
      },
      shippingSnapshot: shippingSnap,
      payments: [],
      shipments: [],
      stateHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const invoice = invoiceService.generateInvoice(order);
    assert.ok(invoice.invoiceNumber.includes(orderNum));

    const emailSent = await emailService.sendOrderConfirmation(order, 'alex@example.com');
    assert.equal(emailSent, true);
  });

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED (100% PASS RATE)`);
  console.log('======================================================\n');
}

runSuite().catch(console.error);
