/**
 * Mock PMERJ Server (Polícia Militar do Estado do Rio de Janeiro)
 * Sends events to the main application server
 */

const http = require('http');

// Store logs in memory (last 1000 lines)
const logs = [];
const MAX_LOGS = 1000;

// Override console methods to capture logs (must be done early)
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addLog(level, ...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  const logLine = `[${timestamp}] [${level}] ${message}`;
  logs.push(logLine);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

console.log = (...args) => {
  addLog('INFO', ...args);
  originalLog.apply(console, args);
};

console.error = (...args) => {
  addLog('ERROR', ...args);
  originalError.apply(console, args);
};

console.warn = (...args) => {
  addLog('WARN', ...args);
  originalWarn.apply(console, args);
};

// Configuration
const TARGET_HOST = 'localhost';
const TARGET_PORT = 4000;
const TARGET_PATH = '/api/eventos/pmerj';
const INTERVAL_MS = 30000; // Send event every 30 seconds
const AUTH_TOKEN = process.env.PMERJ_TOKEN || 'pmerj-secret-token-456'; // Token from environment or default
const CLIENT_IP = process.env.PMERJ_IP || '127.0.0.1'; // IP to use (for testing IP validation)

console.log(`[PMERJ] Configuration:`);
console.log(`[PMERJ]   AUTH_TOKEN: ${AUTH_TOKEN}`);
console.log(`[PMERJ]   CLIENT_IP: ${CLIENT_IP}`);

// Event templates for PMERJ
const eventTemplates = [
  {
    name: 'Patrulhamento de rotina',
    description: 'Equipe da PMERJ realiza patrulhamento preventivo na região, com foco em dissuadir práticas criminosas.',
    lat: -22.9068,
    lon: -43.1729
  },
  {
    name: 'Ocorrência em andamento',
    description: 'Policiamento ostensivo em resposta a denúncia de atividade suspeita.',
    lat: -22.9100,
    lon: -43.1800
  },
  {
    name: 'Fiscalização de trânsito',
    description: 'Fiscalização de veículos e motocicletas para coibir infrações e identificar irregularidades.',
    lat: -22.9000,
    lon: -43.1700
  },
  {
    name: 'Abordagem de suspeitos',
    description: 'Abordagem de indivíduos em atitude suspeita para verificação de antecedentes.',
    lat: -22.9200,
    lon: -43.1750
  },
  {
    name: 'Operação de bloqueio',
    description: 'Operação de bloqueio viário com revista aleatória de veículos.',
    lat: -22.9150,
    lon: -43.1650
  },
  {
    name: 'Ronda escolar',
    description: 'Ronda escolar garantindo segurança no entorno de instituição de ensino.',
    lat: -22.9050,
    lon: -43.1850
  },
  {
    name: 'Monitoramento de aglomeração',
    description: 'Monitoramento de pontos de aglomeração para manter a ordem pública.',
    lat: -22.9250,
    lon: -43.1600
  },
  {
    name: 'Suporte a evento público',
    description: 'Atuação preventiva em apoio à realização de evento público.',
    lat: -22.8950,
    lon: -43.1750
  }
];

// Generate random event
function generateEvent() {
  const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
  const variation = 0.01; // Small variation in coordinates
  const codigo = 'PMERJ-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  return {
    codigo: codigo,
    name: template.name,
    description: template.description,
    lat: template.lat + (Math.random() - 0.5) * variation,
    lon: template.lon + (Math.random() - 0.5) * variation,
    timestamp: Date.now()
  };
}

// Send event to main server
function sendEvent() {
  const event = generateEvent();
  const data = JSON.stringify(event, null, 2);

  console.log(`[PMERJ] Sending event (JSON):`);
  console.log(JSON.stringify(event, null, 2));

  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: TARGET_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Authorization': AUTH_TOKEN,
      'X-Forwarded-For': CLIENT_IP // For IP validation testing
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 201) {
        hasSentSuccessfully = true;
        console.log(`[PMERJ] ✓ Event sent successfully: ${event.name} at ${event.lat.toFixed(5)}, ${event.lon.toFixed(5)}`);
      } else {
        // Don't log full error response for security reasons
        console.error(`[PMERJ] ✗ Error sending event: ${res.statusCode} - Request rejected by server`);
      }
    });
  });

  req.on('error', (error) => {
    connectionErrors++;
    const now = Date.now();
    
    // Throttle error messages to avoid spam
    if (now - lastErrorTime > ERROR_THROTTLE_MS) {
      lastErrorTime = now;
      if (error.code === 'ECONNREFUSED') {
        console.error(`[PMERJ] Connection refused (${connectionErrors} errors) - Server not running on ${TARGET_HOST}:${TARGET_PORT}`);
      } else {
        console.error(`[PMERJ] Request error: ${error.code || error.message || JSON.stringify(error)}`);
      }
    }
  });

  req.setTimeout(5000, () => {
    req.destroy();
    console.error(`[PMERJ] Request timeout: Server did not respond within 5 seconds`);
  });

  req.write(data);
  req.end();
}

// Track connection status
let connectionErrors = 0;
let lastErrorTime = 0;
const ERROR_THROTTLE_MS = 10000; // Only show error every 10 seconds
let intervalId;
let hasSentSuccessfully = false; // Track if we've successfully sent at least one event

// Check if server is available before starting
function checkServerAvailability(callback) {
  const testReq = http.request({
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: '/api/eventos',
    method: 'GET',
    timeout: 5000 // Increased timeout to 5 seconds
  }, (res) => {
    // Consume response data to avoid hanging
    res.on('data', () => {});
    res.on('end', () => {
      console.log(`[PMERJ] ✓ Server is available on ${TARGET_HOST}:${TARGET_PORT}`);
      callback(true);
    });
  });

  testReq.on('error', (error) => {
    // Only log if it's not a timeout (timeout is handled separately)
    if (error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT') {
      console.error(`[PMERJ] ✗ Server is NOT available on ${TARGET_HOST}:${TARGET_PORT}`);
      console.error(`[PMERJ] Error: ${error.code || error.message}`);
      console.error(`[PMERJ]`);
      console.error(`[PMERJ] Please start the SSR server first:`);
      console.error(`[PMERJ]   1. npm run build`);
      console.error(`[PMERJ]   2. npm run serve:ssr:eventos-mapa`);
      console.error(`[PMERJ]`);
      console.error(`[PMERJ] Waiting for server to become available...`);
    }
    callback(false);
  });

  testReq.on('timeout', () => {
    testReq.destroy();
    // Only log timeout if we haven't already started sending events successfully
    // This prevents spam when server is slow but working
    if (connectionErrors === 0) {
      console.error(`[PMERJ] ✗ Connection timeout - server may not be running`);
    }
    callback(false);
  });

  testReq.end();
}

// Start sending events
console.log(`[PMERJ] Mock PMERJ Server starting...`);
console.log(`[PMERJ] Target: http://${TARGET_HOST}:${TARGET_PORT}${TARGET_PATH}`);
console.log(`[PMERJ] Interval: ${INTERVAL_MS}ms`);
console.log(`[PMERJ] Press Ctrl+C to stop\n`);

// Check server availability first
checkServerAvailability((available) => {
  if (available) {
    // Send first event immediately
    sendEvent();
    // Then send events at regular intervals
    intervalId = setInterval(sendEvent, INTERVAL_MS);
  } else {
    // Retry connection every 10 seconds (less frequent to avoid spam)
    const retryInterval = setInterval(() => {
      // Only check if we haven't sent successfully yet
      if (!hasSentSuccessfully) {
        checkServerAvailability((available) => {
          if (available) {
            clearInterval(retryInterval);
            console.log(`[PMERJ] Server is now available! Starting to send events...\n`);
            sendEvent();
            intervalId = setInterval(sendEvent, INTERVAL_MS);
          }
        });
      } else {
        // If we've sent successfully, stop checking
        clearInterval(retryInterval);
      }
    }, 10000);
  }
});

// HTTP server to expose logs
const LOGS_PORT = 3002;
const logsServer = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/api/logs' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logs));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

logsServer.listen(LOGS_PORT, () => {
  console.log(`[PMERJ] Logs API server listening on http://localhost:${LOGS_PORT}/api/logs`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[PMERJ] Shutting down...');
  if (intervalId) {
    clearInterval(intervalId);
  }
  logsServer.close(() => {
    process.exit(0);
  });
});
