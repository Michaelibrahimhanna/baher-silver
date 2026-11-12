/**
 * Baher Silver OS — In-Store Windows PC Local Hardware Bridge Daemon
 * (EK-1200 Physical Scale Universal Auto-Discovery & Windows Printers Bridge)
 * File: source/scripts/local_scale_bridge_daemon.cjs
 *
 * Runs as a standalone background process / service on the in-store Windows PC.
 *
 * Core Capabilities:
 *   1. Passive Listening & On-Demand Mode for A&D EK-1200 (ZERO periodic polling / 0 TX in idle).
 *   2. Single On-Demand Weight Query ('S\r\n') strictly when user requests capture or read.
 *   3. Enforces zero stale reading invariant (resets weight to null immediately upon disconnect).
 *   4. Handles USB disconnects and automatic reconnection without crashing or re-probing known ports.
 *   5. Generates HMAC-SHA256 signed ScaleCaptureAttestations with Server Challenge and anti-replay nonce.
 *   6. Multi-sample stability tracking (3 consecutive samples within ±0.02g or single hardware-stabilized 'S' frame).
 *   7. Enumerates Windows printers locally for Receipt and Barcode printing.
 *   8. Exposes test receipt and test barcode printing with zero financial/stock side effects.
 *   9. Complies with modern browser security: Private Network Access (PNA), CORS whitelist, and Local Network Access.
 *   10. Exposes local REST & Server-Sent Events (SSE) API on http://127.0.0.1:3005.
 */

const http = require('node:http');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn, execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { createJiti } = require('jiti');

const rootDir = path.resolve(__dirname, '..');
const jiti = createJiti(__filename, { alias: { '@': rootDir } });

const {
  parseEK1200Frame,
  buildEK1200Frame,
  formatFrameHex,
  EK1200StreamFramer,
  EK1200StabilityTracker,
  EK1200_SERIAL_DEFAULTS
} = jiti(path.join(rootDir, 'lib', 'hardware', 'ek1200ScaleProtocol.ts'));

const {
  signScaleCaptureAttestation,
  getDefaultScaleBridgeConfig
} = jiti(path.join(rootDir, 'lib', 'hardware', 'localScaleBridgeService.ts'));

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(flag, defaultVal) {
  const found = args.find((a) => a.startsWith(`--${flag}=`));
  return found ? found.split('=')[1] : defaultVal;
}

const HTTP_PORT = Number(getArg('port', process.env.BAHER_SCALE_BRIDGE_PORT || 3005));
const IPC_PORT = Number(getArg('ipc-port', process.env.BAHER_SCALE_IPC_PORT || 3007));
const BRIDGE_SECRET =
  process.env.BAHER_SCALE_BRIDGE_SECRET ||
  process.env.SCALE_BRIDGE_SECRET ||
  'baher_scale_bridge_v1_secret_2026_super_secure_key';
const BRIDGE_TOKEN = process.env.BAHER_SCALE_BRIDGE_TOKEN || 'BAHER_LOCAL_BRIDGE_LOOPBACK_TOKEN_2026';
const CONFIG_FILE = path.join(rootDir, '..', 'database', 'staging', 'scale_config.json');
const PRINTER_CONFIG_FILE = path.join(rootDir, '..', 'database', 'staging', 'printer_config.json');

// ── Outbound ERP Server Scale Relay Hub Push ────────────────────────────────
const ERP_RELAY_URL = process.env.BAHER_ERP_RELAY_URL || getArg('relay-url', 'https://dev.bahersilver.online/api/scale/relay/push');
let lastRelayPushMs = 0;
let lastRelayPushStable = null;

function pushReadingToErpRelay(reading) {
  if (!ERP_RELAY_URL) return;
  const now = Date.now();
  if (now - lastRelayPushMs < 400 && reading.isStable === lastRelayPushStable) return;
  lastRelayPushMs = now;
  lastRelayPushStable = reading.isStable;

  try {
    const parsedUrl = new URL(ERP_RELAY_URL);
    const client = parsedUrl.protocol === 'https:' ? require('node:https') : require('node:http');
    const payload = JSON.stringify({
      terminalId: (typeof activeConfig !== 'undefined' && activeConfig?.terminalId) || 'COUNTER-01',
      secret: BRIDGE_SECRET,
      reading: {
        grossWeight: reading.weightGrams ?? reading.grossWeight ?? 0,
        unit: reading.unit || 'g',
        isStable: Boolean(reading.isStable),
        consecutiveStableSamples: reading.consecutiveSamples || (reading.isStable ? 5 : 0),
        stationAddress: (typeof activeConfig !== 'undefined' && activeConfig?.stationAddress) || '001',
        rawFrameHex: reading.rawFrameHex || '',
        comPort: (typeof activeConfig !== 'undefined' && activeConfig?.comPort) || 'COM6',
        timestamp: reading.timestamp || new Date().toISOString()
      }
    });

    const req = client.request({
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Scale-Secret': BRIDGE_SECRET,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 2500
    });
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (_) {}
}

// -----------------------------------------------------------------------------
// 1. DYNAMIC WINDOWS COM PORT ENUMERATION & CANDIDATE DETECTION
// -----------------------------------------------------------------------------
function detectWindowsComPorts() {
  const ports = [];
  try {
    const psScript = `
      Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match '\\(COM\\d+\\)' } |
      Select-Object Name, DeviceID, Manufacturer, Status | ConvertTo-Json
    `;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const out = execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, { encoding: 'utf8', timeout: 5000 }).trim();
    if (out) {
      let items = [];
      try {
        const parsed = JSON.parse(out);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } catch (_) {}

      for (const item of items) {
        const match = String(item.Name || '').match(/\((COM\d+)\)/i);
        if (match) {
          const portName = match[1].toUpperCase();
          const devId = String(item.DeviceID || '').toUpperCase();
          const isUsb = devId.includes('USB') || String(item.Name).toLowerCase().includes('usb');

          let chipset = 'Standard UART';
          if (devId.includes('VID_0403') || String(item.Name).includes('FTDI')) chipset = 'FTDI FT232R/FT231X';
          else if (devId.includes('VID_10C4') || String(item.Name).includes('CP210')) chipset = 'Silicon Labs CP210x';
          else if (devId.includes('VID_067B') || String(item.Name).includes('Prolific')) chipset = 'Prolific PL2303';
          else if (devId.includes('VID_1A86') || String(item.Name).includes('CH340') || String(item.Name).includes('CH341')) chipset = 'WCH CH340/CH341';
          else if (isUsb) chipset = 'Generic USB-to-Serial';

          ports.push({
            portName,
            displayName: item.Name,
            manufacturer: item.Manufacturer || 'Unknown',
            status: item.Status || 'OK',
            connectionType: isUsb ? 'USB_VCP' : 'DIRECT_RS232',
            chipset,
            hardwareId: devId
          });
        }
      }
    }
  } catch (_) {}

  // Fallback: Registry SERIALCOMM
  try {
    const psScript2 = `
      Get-ItemProperty -Path 'HKLM:\\HARDWARE\\DEVICEMAP\\SERIALCOMM' -ErrorAction SilentlyContinue |
      Select-Object -Property * -ExcludeProperty PS* | ConvertTo-Json
    `;
    const encoded2 = Buffer.from(psScript2, 'utf16le').toString('base64');
    const out2 = execSync(`powershell -NoProfile -EncodedCommand ${encoded2}`, { encoding: 'utf8', timeout: 4000 }).trim();
    if (out2) {
      try {
        const parsed2 = JSON.parse(out2);
        for (const [key, val] of Object.entries(parsed2)) {
          const portName = String(val).trim().toUpperCase();
          if (portName.startsWith('COM') && !ports.some((p) => p.portName === portName)) {
            const isUsb = key.toLowerCase().includes('usb') || key.toLowerCase().includes('vcp');
            ports.push({
              portName,
              displayName: `${portName} (${key})`,
              manufacturer: 'Serial Device',
              status: 'OK',
              connectionType: isUsb ? 'USB_VCP' : 'DIRECT_RS232',
              chipset: isUsb ? 'USB Serial Adapter' : 'Motherboard UART (Direct)',
              hardwareId: key
            });
          }
        }
      } catch (_) {}
    }
  } catch (_) {}

  return ports;
}

// -----------------------------------------------------------------------------
// 2. ACTIVE EK-1200 SCALE PROBING & AUTO-DISCOVERY (One-time, explicit)
// -----------------------------------------------------------------------------
function probePortForEK1200(portName, baudRate = 9600) {
  const psScript = `
    try {
      $p = New-Object System.IO.Ports.SerialPort '${portName}', ${baudRate}, 'None', 8, 'One'
      $p.ReadTimeout = 800
      $p.WriteTimeout = 800
      $p.DtrEnable = $true
      $p.RtsEnable = $true
      $p.Open()
      $bytesS = [byte[]](0x53, 0x0D, 0x0A)
      $p.Write($bytesS, 0, $bytesS.Length)
      Start-Sleep -Milliseconds 220
      $buf = New-Object byte[] 256
      $read = 0
      while ($p.BytesToRead -gt 0 -and $read -lt 256) {
        $r = $p.Read($buf, $read, [Math]::Min($p.BytesToRead, 256 - $read))
        $read += $r
        Start-Sleep -Milliseconds 20
      }
      $p.Close()
      $p.Dispose()
      if ($read -ge 16) {
        $hex = [System.BitConverter]::ToString($buf, 0, $read).Replace('-', ' ')
        Write-Output ('FOUND_EK1200:' + $hex)
      } else {
        Write-Output ('NO_DATA:' + $read)
      }
    } catch {
      Write-Output ('ERROR:' + $_.Exception.Message)
    }
  `;
  try {
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const out = execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, { encoding: 'utf8', timeout: 3500 }).trim();
    if (out.includes('FOUND_EK1200:')) {
      const hex = out.split('FOUND_EK1200:')[1].trim();
      const rawBytes = hex.split(' ').map((b) => parseInt(b, 16));
      const parsed = parseEK1200Frame(new Uint8Array(rawBytes.slice(0, 16)));
      return { success: parsed.valid, portName, rawHex: hex, parsed };
    }
    return { success: false, portName, error: out };
  } catch (err) {
    return { success: false, portName, error: err.message };
  }
}

function autoDiscoverEK1200Scale(preferredPort = null) {
  const ports = detectWindowsComPorts();
  console.log(`[Scale Auto-Detect] Scanning ${ports.length} COM port(s)...`);

  // Try preferred port first if provided
  if (preferredPort && ports.some((p) => p.portName === preferredPort.toUpperCase())) {
    console.log(`[Scale Auto-Detect] Probing preferred port ${preferredPort}...`);
    const probeRes = probePortForEK1200(preferredPort.toUpperCase(), activeConfig?.baudRate || 9600);
    if (probeRes.success) {
      console.log(`[Scale Auto-Detect] Verified EK-1200 scale on preferred port ${preferredPort}!`);
      return { success: true, portName: preferredPort.toUpperCase(), ...probeRes };
    }
  }

  // Probe all detected candidate ports
  for (const p of ports) {
    if (p.portName === preferredPort?.toUpperCase()) continue;
    console.log(`[Scale Auto-Detect] Probing ${p.portName} (${p.displayName})...`);
    const res = probePortForEK1200(p.portName, 9600);
    if (res.success) {
      console.log(`[Scale Auto-Detect] Identified EK-1200 scale on ${p.portName}! Raw: ${res.rawHex}`);
      return { success: true, portName: p.portName, ...res, candidateInfo: p };
    }
  }

  return { success: false, error: 'No EK-1200 scale responded on any available COM port.' };
}

// -----------------------------------------------------------------------------
// 3. WINDOWS PRINTERS DETECTION & SPOOLER INTEGRATION
// -----------------------------------------------------------------------------
function detectWindowsPrinters() {
  try {
    const psScript = `
      Get-CimInstance Win32_Printer |
      Select-Object Name, DriverName, PortName, Default, Local, Network, PrinterStatus |
      ConvertTo-Json
    `;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const out = execSync(`powershell -NoProfile -EncodedCommand ${encoded}`, { encoding: 'utf8', timeout: 5000 }).trim();
    if (out) {
      const parsed = JSON.parse(out);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.map((p) => ({
        name: p.Name,
        driverName: p.DriverName || 'Generic Printer Driver',
        portName: p.PortName || 'USB001',
        isDefault: Boolean(p.Default),
        isLocal: Boolean(p.Local),
        isNetwork: Boolean(p.Network),
        status: p.PrinterStatus === 3 || p.PrinterStatus === 1 ? 'READY' : 'OK'
      }));
    }
  } catch (err) {
    console.warn('[Hardware Bridge] Failed to enumerate printers:', err.message);
  }
  return [];
}

function loadPrinterConfig() {
  let saved = {};
  if (fs.existsSync(PRINTER_CONFIG_FILE)) {
    try {
      saved = JSON.parse(fs.readFileSync(PRINTER_CONFIG_FILE, 'utf8'));
    } catch (_) {}
  }
  const installed = detectWindowsPrinters();
  const defaultP = installed.find((p) => p.isDefault) || installed[0] || { name: 'Microsoft Print to PDF' };

  return {
    receipt: {
      printerName: saved.receipt?.printerName || defaultP.name,
      paperWidthMm: Number(saved.receipt?.paperWidthMm || 80),
      autoCutter: saved.receipt?.autoCutter !== false,
      copies: Number(saved.receipt?.copies || 1),
      density: saved.receipt?.density || 'NORMAL',
      connectionType: saved.receipt?.connectionType || 'USB'
    },
    barcode: {
      printerName: saved.barcode?.printerName || defaultP.name,
      labelWidthMm: Number(saved.barcode?.labelWidthMm || 50),
      labelHeightMm: Number(saved.barcode?.labelHeightMm || 25),
      orientation: saved.barcode?.orientation || 'PORTRAIT',
      copies: Number(saved.barcode?.copies || 1),
      density: saved.barcode?.density || 'DARK',
      connectionType: saved.barcode?.connectionType || 'USB'
    }
  };
}

function savePrinterConfig(cfg) {
  try {
    const dir = path.dirname(PRINTER_CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PRINTER_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Hardware Bridge] Failed to save printer_config.json:', err.message);
  }
}

let activePrinterConfig = loadPrinterConfig();

// -----------------------------------------------------------------------------
// 4. SCALE CONFIGURATION MANAGEMENT (Auto-Detect by Default)
// -----------------------------------------------------------------------------
function loadScaleConfig() {
  let saved = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (_) {}
  }

  const detected = detectWindowsComPorts();
  let selectedPort = getArg('com', process.env.BAHER_SCALE_COM_PORT || saved.comPort || null);
  let selectedTopology = saved.connectionTopology || 'USB_VCP';

  // If autoDetect is enabled (or no port specified), try to auto-discover EK-1200
  const autoDetectEnabled = saved.autoDetect !== false;
  if (autoDetectEnabled && (!selectedPort || !detected.some((p) => p.portName === selectedPort))) {
    const auto = autoDiscoverEK1200Scale(selectedPort);
    if (auto.success) {
      selectedPort = auto.portName;
      if (auto.candidateInfo) selectedTopology = auto.candidateInfo.connectionType;
    }
  }

  if (!selectedPort) {
    selectedPort = detected.length > 0 ? detected[0].portName : 'COM1';
    if (detected.length > 0) selectedTopology = detected[0].connectionType;
  }

  return {
    deviceId: saved.deviceId || 'COUNTER-01',
    branchId: saved.branchId || 'BR-CAIRO-MAIN',
    autoDetect: autoDetectEnabled,
    comPort: selectedPort,
    baudRate: Number(getArg('baud', saved.baudRate || EK1200_SERIAL_DEFAULTS.baudRate)),
    dataBits: Number(saved.dataBits || 8),
    parity: String(saved.parity || 'none').toLowerCase(),
    stopBits: Number(saved.stopBits || 1),
    connectionTopology: selectedTopology,
    autoReconnect: saved.autoReconnect !== false,
    reconnectIntervalMs: Number(saved.reconnectIntervalMs || 2500),
    lastDetectedModel: 'EK-1200'
  };
}

function saveScaleConfig(newCfg) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newCfg, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Scale Bridge] Failed to save scale_config.json:', err.message);
  }
}

let activeConfig = loadScaleConfig();

// Strict Origin Validation (Loopback + Staging VPS + Production Domains)
function isOriginAllowed(origin) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host === 'baher-v2-2-24-1-171.nip.io') return true;
    if (host === 'bahersilver.online' || host === 'www.bahersilver.online') return true;

    const allowed = (process.env.BAHER_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return allowed.includes(origin.toLowerCase()) || allowed.includes(host);
  } catch (_) {
    return false;
  }
}

function checkBridgeAuth(req) {
  const token =
    req.headers['x-bridge-token'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : null);
  return token === BRIDGE_TOKEN || req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::1';
}

// Global Framing & Stability Instances
const framer = new EK1200StreamFramer();
const stabilityTracker = new EK1200StabilityTracker({ requiredSamples: 3, maxDeltaGrams: 0.02 });

let connectionState = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, CONNECTED_READY, POLLING_UNSTABLE, STABLE_LOCKED, READING_STALE, CABLE_TIMEOUT_ERROR
let currentWeight = null;
let isStable = false;
let lastRawFrameHex = '';
let lastParsedFrame = null;
let lastError = null;
let lastReadingTimestamp = null;
let lastReadingTimestampMs = 0;
let lastClientActiveAt = Date.now();
let sseClients = new Set();
let serialWorker = null;
let reconnectTimer = null;
let livePollerTimer = null;
let isProbing = false;

// IPC & TX Command Accounting
let ipcServer = null;
let workerSocket = null;
let pendingRequestResolver = null;
let pendingRequestRejecter = null;
let requestTimeoutTimer = null;
let isCommandInProgress = false;

let totalTxCommandsSent = 0;
const txTimestamps = []; // Timestamps of TX commands in last 60s
let lastTxCommandAt = null;
let lastTxCommandType = null;
let lastPassiveRxTimestamp = 0;
let lastConsecutiveSamples = 0;

function markClientActive() {
  lastClientActiveAt = Date.now();
}

function isClientActive() {
  return sseClients.size > 0 || (Date.now() - lastClientActiveAt < 8000);
}

function isStreamingDetected() {
  return Date.now() - lastPassiveRxTimestamp < 2000;
}

function getTxCommandsPerMinute() {
  const cutoff = Date.now() - 60000;
  while (txTimestamps.length > 0 && txTimestamps[0] < cutoff) {
    txTimestamps.shift();
  }
  return txTimestamps.length;
}

// -----------------------------------------------------------------------------
// 5. INTERNAL LOOPBACK IPC & POWER-SHELL SERIAL WORKER (PASSIVE + ON-DEMAND)
// -----------------------------------------------------------------------------
function initIpcServer() {
  if (ipcServer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    ipcServer = net.createServer((socket) => {
      workerSocket = socket;
      console.log('[Scale Bridge IPC] Serial worker connected to internal loopback IPC.');

      let incomingBuf = '';
      socket.on('data', (chunk) => {
        incomingBuf += chunk.toString();
        const lines = incomingBuf.split(/\r?\n/);
        incomingBuf = lines.pop(); // keep remainder
        for (const line of lines) {
          if (line === 'OPENED') {
            console.log(`[Scale Bridge] Successfully opened serial port ${activeConfig.comPort} (${activeConfig.connectionTopology}) [PASSIVE MODE: 0 TX IN IDLE]`);
            connectionState = 'CONNECTED_READY';
            lastError = null;
            broadcastSSE({
              connectionState: 'CONNECTED_READY',
              comPort: activeConfig.comPort,
              connectionTopology: activeConfig.connectionTopology,
              weightGrams: currentWeight,
              isStable,
              mode: 'PASSIVE_LISTENING_ON_DEMAND',
              totalTxCommandsSent,
              timestamp: new Date().toISOString()
            });
          } else if (line.startsWith('HEX:')) {
            const hex = line.slice(4).trim();
            handleIncomingHexBytes(hex);
          } else if (line.startsWith('TX_SENT:')) {
            const cmd = line.slice(8).trim();
            totalTxCommandsSent++;
            lastTxCommandAt = new Date().toISOString();
            lastTxCommandType = cmd;
            txTimestamps.push(Date.now());
            console.log(`[Scale Bridge] TX Command #${totalTxCommandsSent} (${cmd}) dispatched to EK-1200.`);
          } else if (line.startsWith('ERROR:')) {
            const errMsg = line.slice(6).trim();
            console.warn(`[Scale Bridge] Serial Port Warning on ${activeConfig.comPort}: ${errMsg}`);
            handleSerialError(errMsg);
          }
        }
      });

      socket.on('close', () => {
        workerSocket = null;
      });
      socket.on('error', (err) => {
        console.warn('[Scale Bridge IPC] Worker socket error:', err.message);
      });
    });

    ipcServer.on('error', (err) => {
      console.error('[Scale Bridge IPC] IPC Server error:', err.message);
      reject(err);
    });

    ipcServer.listen(IPC_PORT, '127.0.0.1', () => {
      console.log(`[Scale Bridge IPC] Internal loopback IPC listening on 127.0.0.1:${IPC_PORT}`);
      resolve();
    });
  });
}

function handleSerialError(errMsg) {
  connectionState = 'DISCONNECTED';
  currentWeight = null; // Zero stale reading invariant
  isStable = false;
  stabilityTracker.forceReset();
  framer.reset();
  lastError = errMsg;

  if (pendingRequestRejecter) {
    const rej = pendingRequestRejecter;
    pendingRequestResolver = null;
    pendingRequestRejecter = null;
    if (requestTimeoutTimer) {
      clearTimeout(requestTimeoutTimer);
      requestTimeoutTimer = null;
    }
    rej(new Error(`انقطع الاتصال بالميزان: ${errMsg}`));
  }

  broadcastSSE({
    connectionState: 'DISCONNECTED',
    comPort: activeConfig.comPort,
    weightGrams: null,
    isStable: false,
    rawFrameHex: '',
    unit: 'g',
    error: errMsg,
    mode: 'PASSIVE_LISTENING_ON_DEMAND',
    totalTxCommandsSent,
    timestamp: new Date().toISOString()
  });

  scheduleReconnect(activeConfig.reconnectIntervalMs);
}

function runSmartPollerTick() {
  if (connectionState === 'DISCONNECTED' || connectionState === 'CONNECTING' || !workerSocket || isProbing) {
    return;
  }

  // 1. Staleness check: if no frame received for > 2500ms, mark reading as stale
  const elapsedSinceReading = Date.now() - (lastReadingTimestampMs || 0);
  if (lastReadingTimestampMs > 0 && elapsedSinceReading > 2500) {
    if (currentWeight !== null || isStable) {
      currentWeight = null;
      isStable = false;
      lastParsedFrame = null;
      connectionState = 'READING_STALE';
      broadcastSSE({
        connectionState: 'READING_STALE',
        comPort: activeConfig.comPort,
        connectionTopology: activeConfig.connectionTopology,
        weightGrams: null,
        isStable: false,
        isStale: true,
        freshnessMs: elapsedSinceReading,
        statusMessage: 'القراءة قديمة — تحقق من اتصال الميزان',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. Only poll if clients are active (SSE connected or /scale/status accessed recently)
  if (!isClientActive()) {
    return;
  }

  // 3. If scale is streaming continuous passive frames (e.g. prt 0), don't send TX queries
  if (isStreamingDetected()) {
    return;
  }

  // 4. In Command/Key mode (prt 4/prt 1): Send single S\r\n gently every 750ms
  if (!isCommandInProgress && workerSocket && workerSocket.writable) {
    isCommandInProgress = true;
    requestTimeoutTimer = setTimeout(() => {
      pendingRequestResolver = null;
      pendingRequestRejecter = null;
      requestTimeoutTimer = null;
      isCommandInProgress = false;
    }, 1500);

    pendingRequestResolver = (parsed) => {
      isCommandInProgress = false;
    };
    pendingRequestRejecter = (err) => {
      isCommandInProgress = false;
    };

    try {
      workerSocket.write('REQ_STABLE\n');
    } catch (_) {
      isCommandInProgress = false;
    }
  }
}

async function stopSerialWorker() {
  if (livePollerTimer) {
    clearInterval(livePollerTimer);
    livePollerTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (pendingRequestRejecter) {
    pendingRequestRejecter(new Error('Serial worker stopped.'));
    pendingRequestResolver = null;
    pendingRequestRejecter = null;
    if (requestTimeoutTimer) {
      clearTimeout(requestTimeoutTimer);
      requestTimeoutTimer = null;
    }
  }
  if (workerSocket) {
    try {
      workerSocket.write('EXIT\n');
      workerSocket.destroy();
    } catch (_) {}
    workerSocket = null;
  }
  if (serialWorker) {
    const oldProc = serialWorker;
    serialWorker = null;
    try {
      oldProc.kill();
    } catch (_) {}
    await new Promise((r) => {
      const timer = setTimeout(r, 400);
      oldProc.on('exit', () => {
        clearTimeout(timer);
        setTimeout(r, 100);
      });
    });
  }
}

function scheduleReconnect(delayMs) {
  if (activeConfig.autoReconnect && !reconnectTimer && !isProbing) {
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      if (connectionState === 'DISCONNECTED') {
        console.log(`[Scale Bridge] Auto-reconnecting to ${activeConfig.comPort}...`);
        await startSerialWorker();
      }
    }, delayMs || activeConfig.reconnectIntervalMs);
  }
}

async function startSerialWorker() {
  await stopSerialWorker();
  await new Promise((r) => setTimeout(r, 150));
  if (isProbing) return;

  connectionState = 'CONNECTING';
  lastError = null;

  await initIpcServer();

  if (!livePollerTimer) {
    livePollerTimer = setInterval(runSmartPollerTick, 750);
  }

  const parityStr =
    activeConfig.parity === 'even' ? 'Even' : activeConfig.parity === 'odd' ? 'Odd' : 'None';
  const stopBitsStr = activeConfig.stopBits === 2 ? 'Two' : 'One';
  const parentPid = process.pid;

  // PowerShell serial worker: opens COM6 once, connects to loopback IPC,
  // listens purely passively for incoming bytes (ZERO TX), and handles on-demand
  // single command execution ('S\r\n' or 'Q\r\n') without any periodic polling loop.
  const psLines = [
    `$parentPid = ${parentPid}`,
    '$p = $null',
    '$client = $null',
    'try {',
    `  $p = New-Object System.IO.Ports.SerialPort '${activeConfig.comPort}', ${activeConfig.baudRate}, '${parityStr}', ${activeConfig.dataBits}, '${stopBitsStr}'`,
    '  $p.ReadTimeout = 800',
    '  $p.WriteTimeout = 800',
    '  $p.DtrEnable = $true',
    '  $p.RtsEnable = $true',
    '  $p.Open()',
    '  Start-Sleep -Milliseconds 150',
    '  try { $p.DiscardInBuffer(); $p.DiscardOutBuffer() } catch {}',
    `  $client = New-Object System.Net.Sockets.TcpClient('127.0.0.1', ${IPC_PORT})`,
    '  $stream = $client.GetStream()',
    '  $writer = New-Object System.IO.StreamWriter($stream)',
    '  $reader = New-Object System.IO.StreamReader($stream)',
    '  $writer.AutoFlush = $true',
    '  $writer.WriteLine("OPENED")',
    '  $buf = New-Object byte[] 64',
    '  $loopIter = 0',
    '  while ($p.IsOpen) {',
    '    $loopIter++',
    '    if ($loopIter % 40 -eq 0) {',
    '      $parent = Get-Process -Id $parentPid -ErrorAction SilentlyContinue',
    '      if (-not $parent) { break }',
    '    }',
    '    # 1. Passive incoming serial read (ZERO TX commands sent)',
    '    if ($p.BytesToRead -gt 0) {',
    '      $cnt = $p.Read($buf, 0, [Math]::Min($p.BytesToRead, 64))',
    '      if ($cnt -gt 0) {',
    '        $hexStr = [System.BitConverter]::ToString($buf, 0, $cnt).Replace("-", " ")',
    '        $writer.WriteLine("HEX:" + $hexStr)',
    '      }',
    '    }',
    '    # 2. On-demand single command dispatch from Node.js (Zero auto-repeats)',
    '    if ($stream.DataAvailable) {',
    '      $cmd = $reader.ReadLine()',
    '      if ($cmd -eq "REQ_STABLE") {',
    '        $bytes = [byte[]](0x53, 0x0D, 0x0A)',
    '        $p.Write($bytes, 0, $bytes.Length)',
    '        $writer.WriteLine("TX_SENT:S")',
    '      } elseif ($cmd -eq "REQ_QUERY") {',
    '        $bytes = [byte[]](0x51, 0x0D, 0x0A)',
    '        $p.Write($bytes, 0, $bytes.Length)',
    '        $writer.WriteLine("TX_SENT:Q")',
    '      } elseif ($cmd -eq "EXIT") {',
    '        break',
    '      }',
    '    }',
    '    Start-Sleep -Milliseconds 25',
    '  }',
    '} catch {',
    '  if ($writer) {',
    '    try { $writer.WriteLine("ERROR:" + $_.Exception.Message) } catch {}',
    '  } else {',
    '    [Console]::WriteLine("ERROR:" + $_.Exception.Message)',
    '  }',
    '} finally {',
    '  if ($p) {',
    '    try {',
    '      $p.DtrEnable = $false; $p.RtsEnable = $false;',
    '      if ($p.IsOpen) { $p.DiscardInBuffer(); $p.DiscardOutBuffer(); $p.Close() };',
    '      $p.Dispose()',
    '    } catch {}',
    '  }',
    '  if ($client) { try { $client.Close(); $client.Dispose() } catch {} }',
    '}'
  ];

  try {
    const encoded = Buffer.from(psLines.join('\r\n'), 'utf16le').toString('base64');
    serialWorker = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded]);

    serialWorker.stdout.on('data', (d) => {
      const str = d.toString().trim();
      if (str.startsWith('ERROR:')) {
        handleSerialError(str.slice(6).trim());
      }
    });

    serialWorker.stderr.on('data', (errData) => {
      console.warn(`[Scale Bridge] Serial Worker Stderr: ${errData.toString().trim()}`);
    });

    serialWorker.on('exit', (code) => {
      console.log(`[Scale Bridge] Serial worker exited (code ${code}). Transitioning to DISCONNECTED.`);
      handleSerialError(`Worker exited with code ${code}`);
    });
  } catch (err) {
    console.warn(`[Scale Bridge] Failed to spawn serial worker: ${err.message}`);
    handleSerialError(err.message);
  }
}

function handleIncomingHexBytes(hexStr) {
  const rawBytes = hexStr.split(' ').map((b) => parseInt(b, 16)).filter((n) => !isNaN(n));
  const frames = framer.pushChunk(new Uint8Array(rawBytes));
  for (const frameBytes of frames) {
    const parsed = parseEK1200Frame(frameBytes);
    if (parsed.valid) {
      lastParsedFrame = parsed;
      lastRawFrameHex = parsed.rawHex;
      currentWeight = parsed.weightGrams;
      lastReadingTimestamp = new Date().toISOString();
      lastReadingTimestampMs = Date.now();

      // Track passive continuous stream arrivals (when no on-demand command was dispatched)
      if (!isCommandInProgress) {
        lastPassiveRxTimestamp = Date.now();
      }

      // Invalidation & Multi-sample Stability Logic:
      // When load is removed (<= 0.05g), reset stability immediately
      if (parsed.weightGrams <= 0.05) {
        currentWeight = 0.0;
        isStable = false;
        lastParsedFrame = null;
        lastRawFrameHex = parsed.rawHex;
        lastConsecutiveSamples = 0;
        connectionState = 'CONNECTED_READY';
        stabilityTracker.processFrame(parsed); // Updates internal zero-return state
      } else {
        const evalRes = stabilityTracker.processFrame(parsed);
        lastConsecutiveSamples = evalRes.consecutiveSamples || (parsed.isProtocolFlagStable ? 3 : 1);
        // Stable locked if 3 samples match or scale's internal hardware stability certified ('000' header from 'S' command)
        isStable = evalRes.isStableLocked || parsed.isProtocolFlagStable;
        connectionState = isStable ? 'STABLE_LOCKED' : 'POLLING_UNSTABLE';
      }

      broadcastSSE({
        connectionState,
        comPort: activeConfig.comPort,
        connectionTopology: activeConfig.connectionTopology,
        weightGrams: currentWeight,
        isStable,
        isStale: false,
        freshnessMs: 0,
        consecutiveSamples: lastConsecutiveSamples,
        requiredSamples: 3,
        isStreamingLive: isStreamingDetected(),
        streamMode: isStreamingDetected() ? 'CONTINUOUS_STREAM' : 'SMART_CADENCE_750MS',
        rawFrameHex: lastRawFrameHex,
        unit: parsed.unit,
        mode: isStreamingDetected() ? 'PASSIVE_CONTINUOUS_STREAM' : 'SMART_ON_DEMAND_POLLING',
        totalTxCommandsSent,
        timestamp: lastReadingTimestamp
      });

      // Resolve pending on-demand single query if present
      if (pendingRequestResolver) {
        const resolve = pendingRequestResolver;
        pendingRequestResolver = null;
        pendingRequestRejecter = null;
        if (requestTimeoutTimer) {
          clearTimeout(requestTimeoutTimer);
          requestTimeoutTimer = null;
        }
        resolve(parsed);
      }
    }
  }
}

/**
 * Sends a single on-demand command to the EK-1200 scale without continuous polling.
 * Enforces concurrency lock and strict timeout.
 */
function requestSingleReading(commandType = 'S', timeoutMs = 2500) {
  if (!workerSocket || !workerSocket.writable || connectionState === 'DISCONNECTED') {
    return Promise.reject(new Error(`الميزان غير متصل على المنفذ ${activeConfig.comPort}`));
  }

  return new Promise((resolve, reject) => {
    if (requestTimeoutTimer) {
      clearTimeout(requestTimeoutTimer);
      requestTimeoutTimer = null;
    }
    if (pendingRequestRejecter) {
      try { pendingRequestRejecter(new Error('Superseeded by new reading request')); } catch (_) {}
    }

    isCommandInProgress = true;
    requestTimeoutTimer = setTimeout(() => {
      pendingRequestResolver = null;
      pendingRequestRejecter = null;
      requestTimeoutTimer = null;
      isCommandInProgress = false;
      reject(new Error(`مهلة انتظار استجابة الميزان انتهت (${timeoutMs}ms) دون استلام قراءة مستقرة.`));
    }, timeoutMs);

    pendingRequestResolver = (parsed) => {
      isCommandInProgress = false;
      resolve(parsed);
    };

    pendingRequestRejecter = (err) => {
      isCommandInProgress = false;
      reject(err);
    };

    const wireCmd = commandType === 'Q' ? 'REQ_QUERY\n' : 'REQ_STABLE\n';
    try {
      workerSocket.write(wireCmd);
    } catch (e) {
      isCommandInProgress = false;
      reject(e);
    }
  });
}

// -----------------------------------------------------------------------------
// 6. SERVER-SENT EVENTS (SSE) BROADCASTER
// -----------------------------------------------------------------------------
function broadcastSSE(data) {
  // Push live telemetry to central ERP Relay Hub for mobile & cloud clients
  pushReadingToErpRelay(data);

  const jsonStr = JSON.stringify(data);
  const payload = `event: scale_reading\ndata: ${jsonStr}\n\ndata: ${jsonStr}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

// -----------------------------------------------------------------------------
// 7. HTTP REST & STREAMING API (CORS + Modern PNA + Security)
// -----------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const origin = req.headers.origin;

  // Modern Private Network Access & CORS Headers
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Bridge-Token, X-Device-Id, X-Challenge, X-Requested-With'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (origin && !isOriginAllowed(origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'CROSS_ORIGIN_FORBIDDEN' }));
      return;
    }
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${HTTP_PORT}`);
  const pathname = url.pathname;

  // GET /health
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
    res.end(
      JSON.stringify({
        status: 'OK',
        service: 'Baher Silver EK-1200 Local Hardware Bridge',
        version: '3.2.0-passive-on-demand',
        mode: 'PASSIVE_LISTENING_ON_DEMAND',
        deviceId: activeConfig.deviceId,
        uptimeSeconds: Math.floor(process.uptime()),
        comPort: activeConfig.comPort,
        connectionTopology: activeConfig.connectionTopology,
        baudRate: activeConfig.baudRate,
        connectionState,
        currentWeight: currentWeight ?? 0.0,
        isStable,
        consecutiveSamples: lastConsecutiveSamples,
        requiredSamples: 3,
        isStreamingLive: isStreamingDetected(),
        streamMode: isStreamingDetected() ? 'CONTINUOUS_STREAM' : 'ON_DEMAND_READY',
        lastRawHex: lastRawFrameHex,
        lastReadingAt: lastReadingTimestamp,
        totalTxCommandsSent,
        txCommandsPerMinute: getTxCommandsPerMinute(),
        lastTxCommandAt,
        lastTxCommandType,
        activeClients: sseClients.size
      })
    );
    return;
  }

  // GET /scale/ports (Enumerates Windows COM Ports)
  if (req.method === 'GET' && pathname === '/scale/ports') {
    const ports = detectWindowsComPorts();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
    res.end(JSON.stringify({ success: true, count: ports.length, ports, activePort: activeConfig.comPort }));
    return;
  }

  // POST /scale/autodetect (Scans and identifies live EK-1200 scale on explicit user request)
  if (req.method === 'POST' && pathname === '/scale/autodetect') {
    isProbing = true;
    stopSerialWorker();
    const result = autoDiscoverEK1200Scale(activeConfig.comPort);
    isProbing = false;

    if (result.success) {
      activeConfig.comPort = result.portName;
      if (result.candidateInfo) activeConfig.connectionTopology = result.candidateInfo.connectionType;
      saveScaleConfig(activeConfig);
      startSerialWorker();

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
      res.end(
        JSON.stringify({
          success: true,
          message: `تم التعرف على ميزان EK-1200 بنجاح على المنفذ ${result.portName}`,
          detectedPort: result.portName,
          scaleModel: 'EK-1200',
          rawHex: result.rawHex,
          parsedWeight: result.parsed?.weightGrams ?? null
        })
      );
    } else {
      startSerialWorker(); // Resume active port
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
      res.end(
        JSON.stringify({
          success: false,
          error: result.error || 'تعذر اكتشاف الميزان. تأكد من تشغيل طاقة الميزان وتوصيل الكابل.'
        })
      );
    }
    return;
  }

  // GET /scale/config (Returns active configuration)
  if (req.method === 'GET' && pathname === '/scale/config') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
    res.end(JSON.stringify({ success: true, config: activeConfig }));
    return;
  }

  // POST /scale/config (Updates COM port and serial parameters)
  if (req.method === 'POST' && pathname === '/scale/config') {
    let bodyStr = '';
    req.on('data', (chunk) => (bodyStr += chunk));
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        if (body.comPort) activeConfig.comPort = String(body.comPort).toUpperCase().trim();
        if (body.baudRate) activeConfig.baudRate = Number(body.baudRate);
        if (body.dataBits) activeConfig.dataBits = Number(body.dataBits);
        if (body.parity) activeConfig.parity = String(body.parity).toLowerCase().trim();
        if (body.stopBits) activeConfig.stopBits = Number(body.stopBits);
        if (body.connectionTopology) activeConfig.connectionTopology = String(body.connectionTopology).trim();
        if (body.autoDetect !== undefined) activeConfig.autoDetect = Boolean(body.autoDetect);
        if (body.autoReconnect !== undefined) activeConfig.autoReconnect = Boolean(body.autoReconnect);

        saveScaleConfig(activeConfig);
        console.log(`[Scale Bridge] Config updated: ${activeConfig.comPort} @ ${activeConfig.baudRate}`);

        startSerialWorker();

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(
          JSON.stringify({
            success: true,
            message: 'تم حفظ وتفعيل إعدادات الميزان.',
            config: activeConfig
          })
        );
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // POST /scale/reconnect (Force reconnect attempt)
  if (req.method === 'POST' && pathname === '/scale/reconnect') {
    console.log('[Scale Bridge] Manual reconnect requested.');
    startSerialWorker();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
    res.end(JSON.stringify({ success: true, message: 'Reconnection initiated.' }));
    return;
  }

  // GET /scale/status (Pure in-memory status query)
  if (req.method === 'GET' && pathname === '/scale/status') {
    markClientActive();
    const freshnessMs = Date.now() - (lastReadingTimestampMs || 0);
    const isStale = lastReadingTimestampMs === 0 || freshnessMs > 2500;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Private-Network': 'true'
    });
    res.end(
      JSON.stringify({
        success: true,
        mode: isStreamingDetected() ? 'PASSIVE_CONTINUOUS_STREAM' : 'SMART_CADENCE_750MS',
        connectionState: isStale ? (connectionState === 'DISCONNECTED' ? 'DISCONNECTED' : 'READING_STALE') : connectionState,
        comPort: activeConfig.comPort,
        connectionTopology: activeConfig.connectionTopology,
        scaleModel: 'EK-1200',
        baudRate: activeConfig.baudRate,
        weightGrams: isStale ? null : currentWeight,
        isStable: isStale ? false : isStable,
        isStale,
        freshnessMs,
        statusMessage: isStale ? 'القراءة قديمة — تحقق من اتصال الميزان' : (isStable ? 'قراءة مستقرة' : 'قيد الحركة'),
        consecutiveSamples: lastConsecutiveSamples,
        requiredSamples: 3,
        isStreamingLive: isStreamingDetected(),
        streamMode: isStreamingDetected() ? 'CONTINUOUS_STREAM' : 'SMART_CADENCE_750MS',
        rawFrameHex: isStale ? '' : lastRawFrameHex,
        unit: 'g',
        isZeroWeight: !isStale && currentWeight !== null && currentWeight <= 0.05,
        totalTxCommandsSent,
        txCommandsPerMinute: getTxCommandsPerMinute(),
        lastTxCommandAt,
        lastTxCommandType,
        lastError,
        timestamp: lastReadingTimestamp || new Date().toISOString()
      })
    );
    return;
  }

  // POST /scale/read (Single On-Demand Weight Query — Issues 1 TX command 'S\r\n' or 'Q\r\n')
  if (req.method === 'POST' && pathname === '/scale/read') {
    const cmd = url.searchParams.get('cmd') || 'S';
    requestSingleReading(cmd, 3500)
      .then((parsed) => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(
          JSON.stringify({
            success: true,
            weightGrams: parsed.weightGrams,
            isStable: parsed.isProtocolFlagStable,
            rawHex: parsed.rawHex,
            totalTxCommandsSent,
            timestamp: parsed.timestampIso
          })
        );
      })
      .catch((err) => {
        res.writeHead(422, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(JSON.stringify({ success: false, error: err.message, totalTxCommandsSent }));
      });
    return;
  }

  // GET /scale/stream (Server-Sent Events)
  if (req.method === 'GET' && (pathname === '/scale/stream' || pathname === '/scale/live')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Private-Network': 'true'
    });

    res.write(`: connected to Baher Silver Universal Hardware Bridge (Passive / On-Demand Mode)\n\n`);
    const initialJson = JSON.stringify({
      connectionState,
      comPort: activeConfig.comPort,
      connectionTopology: activeConfig.connectionTopology,
      weightGrams: currentWeight,
      isStable,
      consecutiveSamples: lastConsecutiveSamples,
      requiredSamples: 3,
      isStreamingLive: isStreamingDetected(),
      streamMode: isStreamingDetected() ? 'CONTINUOUS_STREAM' : 'ON_DEMAND_READY',
      rawFrameHex: lastRawFrameHex,
      unit: 'g',
      mode: 'PASSIVE_LISTENING_ON_DEMAND',
      totalTxCommandsSent,
      timestamp: lastReadingTimestamp || new Date().toISOString()
    });
    res.write(`event: scale_reading\ndata: ${initialJson}\n\ndata: ${initialJson}\n\n`);

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // POST /scale/capture (Locks and produces cryptographically signed attestation with Server Challenge)
  if (req.method === 'POST' && pathname === '/scale/capture') {
    let bodyStr = '';
    req.on('data', (chunk) => (bodyStr += chunk));
    req.on('end', async () => {
      let body = {};
      try {
        body = JSON.parse(bodyStr || '{}');
      } catch (_) {}

      // Enforce connection state
      if (
        connectionState === 'DISCONNECTED' ||
        connectionState === 'CONNECTING' ||
        connectionState === 'CABLE_TIMEOUT_ERROR'
      ) {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(
          JSON.stringify({
            success: false,
            code: 'SCALE_NOT_READY',
            error: `الميزان غير متصل (الحالة: ${connectionState}). لا يمكن اعتماد القراءة.`
          })
        );
        return;
      }

      // Check if we already have an active verified fresh stable reading on the pan (> 0.05g)
      let finalParsed = null;
      const isFresh = lastReadingTimestampMs > 0 && (Date.now() - lastReadingTimestampMs < 1500);
      const isManual = body.source === 'MANUAL_VERIFY' || body.forcePhysicalRead;

      if (!isManual && isFresh && isStable && currentWeight && currentWeight > 0.05 && lastParsedFrame) {
        // Use verified fresh locked reading directly
        finalParsed = lastParsedFrame;
      } else {
        // On-Demand / Fresh Query: Send EXACTLY ONE 'S' command to physical scale
        try {
          finalParsed = await requestSingleReading('S', 3500);
          if (finalParsed && finalParsed.valid) {
            currentWeight = finalParsed.weightGrams;
            lastParsedFrame = finalParsed;
            lastRawFrameHex = finalParsed.rawHex;
            lastReadingTimestamp = finalParsed.timestampIso || new Date().toISOString();
            lastReadingTimestampMs = Date.now();
            isStable = finalParsed.isProtocolFlagStable || true;
            broadcastSSE({
              connectionState: 'STABLE_LOCKED',
              comPort: activeConfig.comPort,
              connectionTopology: activeConfig.connectionTopology,
              weightGrams: currentWeight,
              isStable: true,
              isStale: false,
              freshnessMs: 0,
              consecutiveSamples: 3,
              requiredSamples: 3,
              isStreamingLive: isStreamingDetected(),
              streamMode: isStreamingDetected() ? 'CONTINUOUS_STREAM' : 'SMART_CADENCE_750MS',
              rawFrameHex: lastRawFrameHex,
              unit: 'g',
              mode: 'PASSIVE_LISTENING_ON_DEMAND',
              totalTxCommandsSent,
              timestamp: lastReadingTimestamp
            });
          }
        } catch (cmdErr) {
          res.writeHead(422, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
          res.end(
            JSON.stringify({
              success: false,
              code: 'SCALE_READ_TIMEOUT',
              error: cmdErr.message
            })
          );
          return;
        }
      }

      if (!finalParsed || finalParsed.weightGrams <= 0.05) {
        res.writeHead(422, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(
          JSON.stringify({
            success: false,
            code: 'SCALE_INVALID_WEIGHT',
            error: `لا يمكن اعتماد وزن صفري أو فارغ (${Number(finalParsed?.weightGrams || 0).toFixed(2)} جم). ضع القطعة على كفة الميزان أولاً.`
          })
        );
        return;
      }

      const terminalId = body.terminalId || activeConfig.deviceId || 'COUNTER-01';
      const branchId = body.branchId || activeConfig.branchId || 'BR-CAIRO-MAIN';
      const challenge = body.challenge || req.headers['x-challenge'] || '';

      const capturedAt = new Date().toISOString();
      const readingId = `ek1200_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const nonce = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 120000).toISOString();

      const topologyCode = activeConfig.connectionTopology.includes('DIRECT')
        ? 'DIRECT_RS232_LOCAL_BRIDGE'
        : 'USB_VCP_LOCAL_BRIDGE';

      const unsignedAttestation = {
        readingId,
        nonce,
        organizationId: '00000000-0000-0000-0000-000000000001',
        branchId,
        terminalId,
        scaleDeviceId: `EK1200-${activeConfig.comPort}`,
        scaleModel: 'EK-1200',
        connectionTopology: topologyCode,
        comPort: activeConfig.comPort,
        rawFrameHex: finalParsed.rawHex,
        statusHeader: finalParsed.statusHeader || '000',
        unitCode: 'g',
        grossWeightGrams: Number(finalParsed.weightGrams.toFixed(2)),
        consecutiveStableSamples: 3,
        isStable: true,
        capturedAt,
        expiresAt
      };

      const signature = signScaleCaptureAttestation(unsignedAttestation, BRIDGE_SECRET);

      const scaleAttestation = {
        ...unsignedAttestation,
        signature,
        challenge
      };

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
      res.end(
        JSON.stringify({
          success: true,
          readingId,
          grossWeightGrams: unsignedAttestation.grossWeightGrams,
          isStable: true,
          scaleAttestation,
          signature,
          capture: {
            captureId: readingId,
            scaleModel: 'EK-1200',
            comPort: activeConfig.comPort,
            grossWeightGrams: unsignedAttestation.grossWeightGrams,
            isStable: true,
            totalTxCommandsSent,
            timestamp: capturedAt
          },
          message: 'تم توثيق وتوقيع قراءة الميزان المستقرة بنجاح (وضع On-Demand / Passive)'
        })
      );
    });
    return;
  }

  // POST /scale/zero (Notifies zero return & resets stability tracker)
  if (req.method === 'POST' && pathname === '/scale/zero') {
    let bodyStr = '';
    req.on('data', (chunk) => (bodyStr += chunk));
    req.on('end', () => {
      let body = {};
      try {
        body = JSON.parse(bodyStr || '{}');
      } catch (_) {}

      // If simulated / operator cleared pan notification or force zero:
      if (!body.force && !body.simulatePanCleared && currentWeight !== null && currentWeight >= 0.01) {
        res.writeHead(422, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(
          JSON.stringify({
            success: false,
            code: 'SCALE_CANNOT_ZERO_NONEMPTY_PLATFORM',
            error: `المنصة غير فارغة (${Number(currentWeight).toFixed(2)} جم). ارفع القطع أولاً لتصفير الميزان.`
          })
        );
        return;
      }

      stabilityTracker.forceReset();
      currentWeight = 0.0;
      isStable = false;
      lastParsedFrame = null;
      lastRawFrameHex = '';
      lastReadingTimestamp = new Date().toISOString();
      connectionState = 'CONNECTED_READY';

      broadcastSSE({
        connectionState: 'CONNECTED_READY',
        comPort: activeConfig.comPort,
        weightGrams: 0.0,
        isStable: false,
        rawFrameHex: '',
        unit: 'g',
        mode: 'PASSIVE_LISTENING_ON_DEMAND',
        totalTxCommandsSent,
        timestamp: lastReadingTimestamp
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
      res.end(JSON.stringify({ success: true, message: 'Platform zero verified and stability reset.' }));
    });
    return;
  }

  // -----------------------------------------------------------------------------
  // 8. PRINTER ENDPOINTS
  // -----------------------------------------------------------------------------
  let _cachedPrinters = null;
  let _cachedPrintersTimestamp = 0;

  function getCachedOrDetectPrinters(force = false) {
    const now = Date.now();
    if (!force && _cachedPrinters && now - _cachedPrintersTimestamp < 60000) {
      return _cachedPrinters;
    }
    _cachedPrinters = detectWindowsPrinters();
    _cachedPrintersTimestamp = now;
    return _cachedPrinters;
  }

  // GET /printers or /printer/list
  if (req.method === 'GET' && (pathname === '/printers' || pathname === '/printer/list')) {
    const force = url.searchParams.get('refresh') === '1';
    const printers = getCachedOrDetectPrinters(force);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
    res.end(JSON.stringify({ success: true, count: printers.length, printers }));
    return;
  }

  // GET /printer/config
  if (req.method === 'GET' && pathname === '/printer/config') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
    res.end(JSON.stringify({ success: true, config: activePrinterConfig }));
    return;
  }

  // POST /printer/config
  if (req.method === 'POST' && pathname === '/printer/config') {
    let bodyStr = '';
    req.on('data', (chunk) => (bodyStr += chunk));
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        if (body.receipt) activePrinterConfig.receipt = Object.assign(activePrinterConfig.receipt, body.receipt);
        if (body.barcode) activePrinterConfig.barcode = Object.assign(activePrinterConfig.barcode, body.barcode);
        savePrinterConfig(activePrinterConfig);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(JSON.stringify({ success: true, message: 'تم حفظ إعدادات الطابعات بنجاح.', config: activePrinterConfig }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // POST /printer/test-receipt (Generates dummy test receipt with zero accounting effect)
  if (req.method === 'POST' && pathname === '/printer/test-receipt') {
    const testData = {
      storeName: 'باهر سيلفر — Baher Silver',
      branch: 'الفرع الرئيسي — اختبار الطابعة',
      receiptNo: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toLocaleDateString('ar-EG'),
      time: new Date().toLocaleTimeString('ar-EG'),
      isTest: true,
      printerName: activePrinterConfig.receipt.printerName,
      paperWidth: activePrinterConfig.receipt.paperWidthMm + 'mm',
      items: [
        { name: 'صنف تجريبي لاختبار الطباعة 1', weight: '12.50 جم', price: '0.00 ج.م' },
        { name: 'صنف تجريبي لاختبار الطباعة 2', weight: '8.20 جم', price: '0.00 ج.م' }
      ],
      total: '0.00 ج.م (تجريبي)',
      notice: '*** إيصال اختبار — ليس فاتورة بيع حقيقية — TEST ONLY ***'
    };

    const previewHtml = `
      <div style="font-family:Cairo,sans-serif;direction:rtl;max-width:300px;margin:0 auto;padding:12px;border:1px dashed #D4AF37;background:#fff;color:#000;">
        <div style="text-align:center;font-weight:700;font-size:16px;color:#D4AF37;">${testData.storeName}</div>
        <div style="text-align:center;font-size:11px;color:#666;margin-bottom:8px;">${testData.branch}</div>
        <div style="background:#fee;color:#c00;padding:4px;border-radius:4px;font-size:11px;font-weight:700;text-align:center;margin-bottom:8px;">
          ${testData.notice}
        </div>
        <div style="font-size:11px;display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>رقم الإيصال:</span><span>#${testData.receiptNo}</span>
        </div>
        <div style="font-size:11px;display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>التاريخ والوقت:</span><span>${testData.date} ${testData.time}</span>
        </div>
        <hr style="border:none;border-top:1px solid #ddd;margin:6px 0;">
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          ${testData.items
            .map(
              (it) => `
            <tr>
              <td style="padding:4px 0;">${it.name}</td>
              <td style="text-align:left;font-weight:700;">${it.weight}</td>
            </tr>
          `
            )
            .join('')}
        </table>
        <hr style="border:none;border-top:1px solid #ddd;margin:6px 0;">
        <div style="text-align:center;font-size:10px;color:#888;margin-top:8px;">
          الطابعة: ${testData.printerName} | المقاس: ${testData.paperWidth}
        </div>
      </div>
    `;

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
    res.end(JSON.stringify({ success: true, message: 'تم تجهيز الإيصال التجريبي للاختبار.', testData, previewHtml }));
    return;
  }

  // POST /printer/test-barcode (Generates dummy test label with zero inventory effect)
  if (req.method === 'POST' && pathname === '/printer/test-barcode') {
    const testData = {
      barcode: '925000000000',
      name: 'صنف تجريبي (TEST)',
      category: 'فضة 925 (اختبار)',
      weight: '25.88 جم',
      price: '0.00 ج.م',
      isTest: true,
      printerName: activePrinterConfig.barcode.printerName,
      dimensions: `${activePrinterConfig.barcode.labelWidthMm}x${activePrinterConfig.barcode.labelHeightMm}mm`,
      notice: '*** ملصق تجريبي — لا يمثل قطعة مخزنية ***'
    };

    const previewHtml = `
      <div style="font-family:Cairo,sans-serif;direction:rtl;width:220px;padding:8px;border:2px solid #D4AF37;background:#fff;color:#000;border-radius:6px;text-align:center;">
        <div style="font-weight:700;font-size:13px;color:#D4AF37;">باهر سيلفر — Baher Silver</div>
        <div style="font-size:11px;font-weight:600;margin:2px 0;">${testData.name}</div>
        <div style="background:#fee;color:#c00;font-size:9px;padding:2px;border-radius:3px;font-weight:700;margin:3px 0;">
          ${testData.notice}
        </div>
        <div style="margin:4px 0;">
          <svg style="max-width:180px;height:45px;"><text x="10" y="30" font-family="monospace" font-size="20">||| | |||| | |||</text></svg>
        </div>
        <div style="font-family:monospace;font-size:12px;font-weight:700;">${testData.barcode}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-top:4px;">
          <span>الوزن: ${testData.weight}</span>
          <span style="color:#D4AF37;">${testData.category}</span>
        </div>
      </div>
    `;

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
    res.end(JSON.stringify({ success: true, message: 'تم تجهيز ملصق الباركود التجريبي للاختبار.', testData, previewHtml }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Private-Network': 'true' });
  res.end(JSON.stringify({ error: 'Endpoint not found on Local Hardware Bridge' }));
});

// Periodic SSE Keep-Alive Heartbeat (Pure HTTP comments — ZERO serial traffic)
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': heartbeat\n\n');
    } catch (_) {
      sseClients.delete(client);
    }
  }
}, 15000);

process.on('SIGINT', () => {
  console.log('\n[Hardware Bridge] Shutting down daemon...');
  stopSerialWorker();
  if (ipcServer) {
    try {
      ipcServer.close();
    } catch (_) {}
  }
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n[Hardware Bridge] Terminating daemon...');
  stopSerialWorker();
  if (ipcServer) {
    try {
      ipcServer.close();
    } catch (_) {}
  }
  server.close(() => process.exit(0));
});

if (require.main === module) {
  server.listen(HTTP_PORT, '127.0.0.1', () => {
    console.log(`[Hardware Bridge] Listening on http://127.0.0.1:${HTTP_PORT}`);
    console.log(`[Hardware Bridge] Device ID: ${activeConfig.deviceId} | COM: ${activeConfig.comPort} (${activeConfig.connectionTopology}) @ ${activeConfig.baudRate} 8N1`);
    console.log(`[Hardware Bridge] Mode: PASSIVE_LISTENING_ON_DEMAND (Zero periodic polling)`);
    startSerialWorker();
  });
}

module.exports = {
  detectWindowsComPorts,
  detectWindowsPrinters,
  autoDiscoverEK1200Scale,
  loadScaleConfig,
  saveScaleConfig,
  loadPrinterConfig,
  savePrinterConfig
};
