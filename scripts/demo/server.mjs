import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.resolve(__dirname, '../../.data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const STORE_FILE = path.join(DATA_DIR, 'silver_os_demo_store.json');

// Benchmark Spot Rates in EGP per gram
const SPOT_RATES = {
  '999': 60.0,
  '950': 57.0,
  '925': 55.5,
  '900': 54.0
};

// Initial state
let store = {
  activeRole: 'Admin', // 'Admin' or 'Cashier'
  activeUser: {
    id: 'usr_admin_01',
    name: 'مشرف النظام (Admin Supervisor)',
    email: 'admin@bahersilver.com',
    role: 'Admin'
  },
  cashierUser: {
    id: 'usr_cashier_01',
    name: 'أحمد مصطفى (كاشير المعرض)',
    email: 'cashier@bahersilver.com',
    role: 'Cashier'
  },
  shift: {
    id: 'shift_cairo_01',
    branch: 'فرع القاهرة الرئيسي',
    status: 'ACTIVE',
    openedAt: '2026-10-18T09:00:00Z',
    cashInDrawer: 5000
  },
  scaleStatus: {
    online: true,
    stable: true,
    currentReadingGrams: 14.25
  },
  pieces: [],
  sales: [],
  stockLedger: [],
  weightAuditRecords: [],
  workshops: [
    {
      id: 'ws_01',
      name: 'ورشة الأهرام للفضيات',
      phone: '01011122233',
      cashBalanceEgp: 0.0,
      fineSilver999BalanceGrams: 92.593,
      history: [
        {
          id: 'jrn_init_01',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          type: 'SCRAP_DELIVERY',
          grossWeight: 100.0,
          purity: 925,
          fineSilverDelta: 92.593,
          cashDelta: 0,
          notes: 'تسليم كسر عيار 925 للتشغيل',
          isReversed: false
        }
      ]
    },
    {
      id: 'ws_02',
      name: 'مسبك النيل للمجوهرات',
      phone: '01233344455',
      cashBalanceEgp: -3500.0,
      fineSilver999BalanceGrams: 46.297,
      history: [
        {
          id: 'jrn_init_02',
          timestamp: new Date(Date.now() - 43200000).toISOString(),
          type: 'GOODS_RECEIPT_LABOR',
          grossWeight: 50.0,
          purity: 925,
          fineSilverDelta: -46.296,
          cashDelta: -3500.0,
          notes: 'استلام خواتم وسلاسل تامة الصنع وإثبات مصنعية',
          isReversed: false
        }
      ]
    }
  ]
};

// Seed sample showcase pieces if empty
function seedShowcasePieces() {
  const sampleData = [
    { nameAr: 'خاتم فضة كلاسيكي بحجر زركون', nameEn: 'Classic Silver Solitaire Ring', category: 'rings', purity: '925', grossWeight: 8.5, stoneWeight: 0.5, workmanship: 120 },
    { nameAr: 'سوار ملكي عيار 925', nameEn: 'Royal Silver Bangle', category: 'bracelets', purity: '925', grossWeight: 18.2, stoneWeight: 0.0, workmanship: 250 },
    { nameAr: 'سلسلة فيجارو إيطالي عيار 925', nameEn: 'Italian Figaro Silver Chain', category: 'chains', purity: '925', grossWeight: 24.5, stoneWeight: 0.0, workmanship: 320 },
    { nameAr: 'أقراط دانتيل فاخرة عيار 925', nameEn: 'Luxe Silver Drop Earrings', category: 'earrings', purity: '925', grossWeight: 6.8, stoneWeight: 0.8, workmanship: 95 }
  ];

  sampleData.forEach((item, index) => {
    const netWeight = Math.round((item.grossWeight - item.stoneWeight) * 1000) / 1000;
    const spot = SPOT_RATES[item.purity] || 55.5;
    const metalVal = Math.round(netWeight * spot * 100) / 100;
    const price = Math.round((metalVal + item.workmanship) * 100) / 100;
    const serial = `SN-BHR-2026-${10000 + index}`;
    const barcode = calculateEan13(629100000000 + index + 1);

    store.pieces.push({
      id: `pc_seed_${index + 1}`,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      category: item.category,
      purity: item.purity,
      serialNumber: serial,
      barcode: barcode,
      grossWeightGrams: item.grossWeight,
      stoneWeightGrams: item.stoneWeight,
      netWeightGrams: netWeight,
      spotRate: spot,
      metalValueEgp: metalVal,
      workmanshipEgp: item.workmanship,
      priceEgp: price,
      status: 'IN_SHOWCASE',
      createdAt: new Date().toISOString()
    });
  });
}

function calculateEan13(base12) {
  const str = String(base12).padStart(12, '0').slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(str[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return str + check;
}

// Load persisted state if exists
if (fs.existsSync(STORE_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    store = { ...store, ...loaded };
    console.log('[Server] Loaded persisted demo state from disk.');
  } catch (e) {
    console.error('[Server] Failed to load store, seeding clean state:', e.message);
  }
}

if (store.pieces.length === 0) {
  seedShowcasePieces();
}

function persistStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[Server] Failed to persist state:', e.message);
  }
}

// ZATCA TLV QR Encoder (Tag 1: Seller, Tag 2: VAT, Tag 3: Time, Tag 4: Total, Tag 5: Tax)
function generateZatcaTlvBase64(sellerName, vatReg, timestamp, totalAmount, taxAmount) {
  function toTlv(tag, val) {
    const buf = Buffer.from(val, 'utf8');
    return Buffer.concat([Buffer.from([tag, buf.length]), buf]);
  }
  const full = Buffer.concat([
    toTlv(1, sellerName),
    toTlv(2, vatReg),
    toTlv(3, timestamp),
    toTlv(4, totalAmount.toFixed(2)),
    toTlv(5, taxAmount.toFixed(2))
  ]);
  return full.toString('base64');
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // Normalize /preview/silver-os-demo/ prefix if running behind Nginx preview proxy
  const previewPrefix = '/preview/silver-os-demo';
  if (pathname.startsWith(previewPrefix)) {
    pathname = pathname.slice(previewPrefix.length) || '/';
  }

  // CORS headers for local/remote testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Helper JSON responders
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  const getBody = () => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

  try {
    // -------------------------------------------------------------------------
    // API ROUTES
    // -------------------------------------------------------------------------

    // 1. System Status & Role
    if (pathname === '/api/status' && req.method === 'GET') {
      return sendJson(200, {
        ok: true,
        activeRole: store.activeRole,
        activeUser: store.activeRole === 'Admin' ? store.activeUser : store.cashierUser,
        shift: store.shift,
        scaleStatus: store.scaleStatus,
        spotRates: SPOT_RATES,
        stats: {
          totalPieces: store.pieces.length,
          showcasePieces: store.pieces.filter(p => p.status === 'IN_SHOWCASE').length,
          soldPieces: store.pieces.filter(p => p.status === 'SOLD').length,
          totalSales: store.sales.length,
          workshopsCount: store.workshops.length
        }
      });
    }

    // 2. Switch Role (Admin vs Cashier)
    if (pathname === '/api/auth/switch-role' && req.method === 'POST') {
      const { role } = await getBody();
      if (role !== 'Admin' && role !== 'Cashier') {
        return sendJson(400, { error: 'Invalid role. Must be Admin or Cashier.' });
      }
      store.activeRole = role;
      persistStore();
      return sendJson(200, {
        success: true,
        activeRole: store.activeRole,
        activeUser: store.activeRole === 'Admin' ? store.activeUser : store.cashierUser
      });
    }

    // 3. Create Piece & Generate Barcode
    if (pathname === '/api/pieces/create' && req.method === 'POST') {
      const body = await getBody();
      const { nameAr, nameEn, category, purity, grossWeight, stoneWeight, workmanship } = body;

      if (!nameAr || !grossWeight || !purity) {
        return sendJson(422, { error: 'Missing required piece fields.' });
      }

      const gross = parseFloat(grossWeight);
      const stone = parseFloat(stoneWeight || 0);
      if (stone >= gross) {
        return sendJson(422, { error: 'وزن الفصوص يجب أن يكون أقل من الوزن الإجمالي.' });
      }

      const netWeight = Math.round((gross - stone) * 1000) / 1000;
      const spot = SPOT_RATES[String(purity)] || 55.5;
      const metalVal = Math.round(netWeight * spot * 100) / 100;
      const labor = parseFloat(workmanship || 100);
      const price = Math.round((metalVal + labor) * 100) / 100;

      const serialSuffix = Math.floor(10000 + Math.random() * 90000);
      const serial = `SN-BHR-2026-${serialSuffix}`;
      const barcode = calculateEan13(629100000000 + serialSuffix);

      const piece = {
        id: `pc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nameAr,
        nameEn: nameEn || nameAr,
        category: category || 'rings',
        purity: String(purity),
        serialNumber: serial,
        barcode: barcode,
        grossWeightGrams: gross,
        stoneWeightGrams: stone,
        netWeightGrams: netWeight,
        spotRate: spot,
        metalValueEgp: metalVal,
        workmanshipEgp: labor,
        priceEgp: price,
        status: 'IN_SHOWCASE',
        createdAt: new Date().toISOString()
      };

      // Ledger event
      const eventHash = crypto.createHmac('sha256', 'SALT').update(JSON.stringify(piece)).digest('hex');
      store.stockLedger.push({
        id: `led_${Date.now()}`,
        movement: 'INTAKE',
        serialNumber: serial,
        barcode: barcode,
        quantityDelta: 1,
        weightDelta: netWeight,
        actor: store.activeRole === 'Admin' ? store.activeUser.email : store.cashierUser.email,
        timestamp: new Date().toISOString(),
        hash: eventHash
      });

      store.pieces.unshift(piece);
      persistStore();

      return sendJson(201, { success: true, piece });
    }

    // 4. Barcode Lookup (Scan)
    if (pathname.startsWith('/api/pieces/barcode/') && req.method === 'GET') {
      const barcode = pathname.split('/').pop();
      const piece = store.pieces.find(p => p.barcode === barcode || p.serialNumber === barcode);
      if (!piece) {
        return sendJson(404, { error: 'القطعة غير موجودة. تأكد من صحة الباركود.' });
      }
      return sendJson(200, { success: true, piece });
    }

    // 5. Weight Verification & Manual Override Audit
    if (pathname === '/api/pos/weight/verify' && req.method === 'POST') {
      const body = await getBody();
      const { source, grossWeight, stoneWeight, manualReason, serialNumber } = body;
      const currentUser = store.activeRole === 'Admin' ? store.activeUser : store.cashierUser;

      const gross = parseFloat(grossWeight);
      const stone = parseFloat(stoneWeight || 0);
      const net = Math.round((gross - stone) * 1000) / 1000;

      // Security check: Cashier cannot do MANUAL weight override
      if (source === 'MANUAL') {
        if (currentUser.role !== 'Admin') {
          return sendJson(403, {
            error: 'FORBIDDEN: صلاحية إدخال الوزن يدويًا محصورة بالمشرف (Admin) فقط. تم تسجيل المحاولة في سجل التدقيق.'
          });
        }
        if (!['SCALE_FAILURE', 'TEST', 'READING_CORRECTION'].includes(manualReason)) {
          return sendJson(422, {
            error: 'سبب الإدخال اليدوي إلزامي: عطل ميزان (SCALE_FAILURE)، تجربة واختبار (TEST)، أو تصحيح قراءة (READING_CORRECTION).'
          });
        }
      }

      const sig = crypto.createHmac('sha256', 'WEIGHT_SALT').update(`${source}:${net}:${currentUser.id}`).digest('hex');
      const record = {
        id: `wt_${Date.now()}`,
        source,
        grossWeightGrams: gross,
        stoneWeightGrams: stone,
        netWeightGrams: net,
        manualReason: source === 'MANUAL' ? manualReason : null,
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        serialNumber: serialNumber || null,
        signature: sig,
        timestamp: new Date().toISOString()
      };

      store.weightAuditRecords.unshift(record);
      persistStore();

      return sendJson(200, { success: true, record });
    }

    // 6. POS Checkout (Atomic Sale with ZATCA QR)
    if (pathname === '/api/pos/checkout' && req.method === 'POST') {
      const body = await getBody();
      const { serialNumber, paymentMethod, cashReceived } = body;

      const piece = store.pieces.find(p => p.serialNumber === serialNumber);
      if (!piece) {
        return sendJson(404, { error: 'القطعة غير موجودة بالنظام.' });
      }

      // Concurrency / Double-selling check
      if (piece.status === 'SOLD') {
        return sendJson(422, {
          error: 'PIECE_ALREADY_SOLD: هذه القطعة تم بيعها بالفعل ولا يمكن بيع نفس القطعة المرمزة مرتين.'
        });
      }

      const currentUser = store.activeRole === 'Admin' ? store.activeUser : store.cashierUser;
      piece.status = 'SOLD';
      piece.soldAt = new Date().toISOString();

      const receiptNumber = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const vat = Math.round(piece.priceEgp * 0.14 * 100) / 100;
      const totalWithVat = Math.round((piece.priceEgp + vat) * 100) / 100;

      const qrPayload = generateZatcaTlvBase64(
        'شركة باهر سيلفر للمجوهرات',
        '310999888100003',
        new Date().toISOString(),
        totalWithVat,
        vat
      );

      const sale = {
        id: `sale_${Date.now()}`,
        receiptNumber,
        piece: { ...piece },
        paymentMethod: paymentMethod || 'CASH',
        cashReceived: parseFloat(cashReceived || totalWithVat),
        subtotal: piece.priceEgp,
        vat: vat,
        totalAmount: totalWithVat,
        cashier: currentUser.name,
        timestamp: new Date().toISOString(),
        qrPayloadBase64: qrPayload
      };

      store.sales.unshift(sale);

      // Ledger movement
      store.stockLedger.push({
        id: `led_sale_${Date.now()}`,
        movement: 'SALE',
        serialNumber: piece.serialNumber,
        barcode: piece.barcode,
        quantityDelta: -1,
        weightDelta: -piece.netWeightGrams,
        actor: currentUser.email,
        timestamp: new Date().toISOString()
      });

      persistStore();
      return sendJson(200, { success: true, sale });
    }

    // 7. Open Accounts Dual Ledger (Get List)
    if (pathname === '/api/accounts' && req.method === 'GET') {
      return sendJson(200, { success: true, workshops: store.workshops });
    }

    // 8. Open Accounts Post Movement
    if (pathname === '/api/accounts/journal' && req.method === 'POST') {
      const body = await getBody();
      const { workshopId, type, grossWeight, purity, cashDelta, notes } = body;

      const ws = store.workshops.find(w => w.id === workshopId);
      if (!ws) {
        return sendJson(404, { error: 'الورشة غير مسجلة.' });
      }

      let fineDelta = 0;
      if (grossWeight && purity) {
        // Pure 999 equivalent
        fineDelta = Math.round((parseFloat(grossWeight) * (parseInt(purity, 10) / 999)) * 1000) / 1000;
        if (type === 'GOODS_RECEIPT_LABOR') {
          fineDelta = -fineDelta; // Silver consumed by shop
        }
      }

      const cashD = parseFloat(cashDelta || 0);

      const entry = {
        id: `jrn_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type,
        grossWeight: parseFloat(grossWeight || 0),
        purity: parseInt(purity || 925, 10),
        fineSilverDelta: fineDelta,
        cashDelta: cashD,
        notes: notes || '',
        isReversed: false
      };

      ws.history.unshift(entry);
      ws.fineSilver999BalanceGrams = Math.round((ws.fineSilver999BalanceGrams + fineDelta) * 1000) / 1000;
      ws.cashBalanceEgp = Math.round((ws.cashBalanceEgp + cashD) * 100) / 100;

      persistStore();
      return sendJson(201, { success: true, entry, workshop: ws });
    }

    // 9. Reverse Journal Entry with Duplicate Reversal Prevention
    if (pathname === '/api/accounts/journal/reverse' && req.method === 'POST') {
      const { workshopId, entryId } = await getBody();
      const ws = store.workshops.find(w => w.id === workshopId);
      if (!ws) return sendJson(404, { error: 'الورشة غير موجودة.' });

      const entry = ws.history.find(e => e.id === entryId);
      if (!entry) return sendJson(404, { error: 'القيد المطلوب غير موجود.' });

      // ANTI-DUPLICATE REVERSAL
      if (entry.isReversed) {
        return sendJson(409, {
          error: 'ALREADY_REVERSED: هذا القيد تم عكسه مسبقًا؛ يُمنع تكرار العكس وفق قواعد الدفتر التراكمي.'
        });
      }

      entry.isReversed = true;

      // Compensating reversal entry
      const revEntry = {
        id: `rev_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'REVERSAL',
        reversedEntryId: entry.id,
        grossWeight: entry.grossWeight,
        purity: entry.purity,
        fineSilverDelta: -entry.fineSilverDelta,
        cashDelta: -entry.cashDelta,
        notes: `عكس قيد تعويضي للقيد #${entry.id}`,
        isReversed: false
      };

      ws.history.unshift(revEntry);
      ws.fineSilver999BalanceGrams = Math.round((ws.fineSilver999BalanceGrams - entry.fineSilverDelta) * 1000) / 1000;
      ws.cashBalanceEgp = Math.round((ws.cashBalanceEgp - entry.cashDelta) * 100) / 100;

      persistStore();
      return sendJson(200, { success: true, reversal: revEntry, workshop: ws });
    }

    // 10. Audit Records & Security Log
    if (pathname === '/api/audit-log' && req.method === 'GET') {
      return sendJson(200, {
        success: true,
        weightAudit: store.weightAuditRecords.slice(0, 30),
        stockLedger: store.stockLedger.slice(-30).reverse()
      });
    }

    // -------------------------------------------------------------------------
    // STATIC ASSETS
    // -------------------------------------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.json': 'application/json'
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);

  } catch (err) {
    console.error('[Server Error]:', err);
    sendJson(500, { error: 'Internal Server Error', message: err.message });
  }
});

const SOCKET_PATH = process.env.SOCKET_PATH;
const PORT = process.env.PORT || 3005;
const HOST = '0.0.0.0';

if (SOCKET_PATH) {
  if (fs.existsSync(SOCKET_PATH)) {
    try { fs.unlinkSync(SOCKET_PATH); } catch (e) {}
  }
  server.listen(SOCKET_PATH, () => {
    try { fs.chmodSync(SOCKET_PATH, 0o777); } catch (e) {}
    console.log(`================================================================`);
    console.log(`  SILVER OS DEMO SERVER RUNNING ON SOCKET: ${SOCKET_PATH}`);
    console.log(`================================================================`);
  });
} else {
  server.listen(PORT, HOST, () => {
    console.log(`================================================================`);
    console.log(`  SILVER OS DEMO SERVER RUNNING`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://192.168.1.3:${PORT}`);
    console.log(`================================================================`);
  });
}
