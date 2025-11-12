/**
 * Mock Army Server (Exército Brasileiro)
 * Sends events to the main application server
 */

const http = require('http');

// Configuration
const TARGET_HOST = 'localhost';
const TARGET_PORT = 4000;
const TARGET_PATH = '/api/eventos/army';
const INTERVAL_MS = 30000; // Send event every 30 seconds
const AUTH_TOKEN = process.env.ARMY_TOKEN || 'army-secret-token-123'; // Token from environment or default
const CLIENT_IP = process.env.ARMY_IP || '127.0.0.1'; // IP to use (for testing IP validation)

console.log(`[ARMY] Configuration:`);
console.log(`[ARMY]   AUTH_TOKEN: ${AUTH_TOKEN}`);
console.log(`[ARMY]   CLIENT_IP: ${CLIENT_IP}`);

// Event templates for Army
const eventTemplates = [
  {
    titulo: 'Ponto de observação',
    detalhes: 'Unidade do EB estabelece ponto de observação estratégico para monitoramento da área.',
    lat: -22.9068,
    lng: -43.1729
  },
  {
    titulo: 'Patrulha motorizada',
    detalhes: 'Patrulha motorizada realiza deslocamento para presença dissuasória em áreas sensíveis.',
    lat: -22.9100,
    lng: -43.1800
  },
  {
    titulo: 'Posto de apoio avançado',
    detalhes: 'Posto de apoio avançado montado para suporte logístico às tropas em operação.',
    lat: -22.9000,
    lng: -43.1700
  },
  {
    titulo: 'Comboio logístico',
    detalhes: 'Comboio logístico em trânsito com suprimentos para base operacional.',
    lat: -22.9200,
    lng: -43.1750
  },
  {
    titulo: 'Operação conjunta',
    detalhes: 'Ação coordenada com forças de segurança locais em operação conjunta.',
    lat: -22.9150,
    lng: -43.1650
  },
  {
    titulo: 'Reconhecimento de área',
    detalhes: 'Reconhecimento tático de terreno urbano para futura operação.',
    lat: -22.9050,
    lng: -43.1850
  },
  {
    titulo: 'Ponto de controle de acesso',
    detalhes: 'Ponto de controle instalado para fiscalização de entrada e saída de veículos.',
    lat: -22.9250,
    lng: -43.1600
  },
  {
    titulo: 'Deslocamento tático',
    detalhes: 'Deslocamento de frações em formação tática para reforço de posição avançada.',
    lat: -22.8950,
    lng: -43.1750
  }
];

// Generate random event
function generateEvent() {
  const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
  const variation = 0.01; // Small variation in coordinates
  const identificador = 'ARMY-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  return {
    identificador: identificador,
    titulo: template.titulo,
    detalhes: template.detalhes,
    lat: template.lat + (Math.random() - 0.5) * variation,
    lng: template.lng + (Math.random() - 0.5) * variation,
    dataHora: new Date().toISOString()
  };
}

// Send event to main server
function sendEvent() {
  const event = generateEvent();
  const data = JSON.stringify(event, null, 2);

  console.log(`[ARMY] Sending event (JSON):`);
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
        console.log(`[ARMY] ✓ Event sent successfully: ${event.titulo} at ${event.lat.toFixed(5)}, ${event.lng.toFixed(5)}`);
      } else {
        // Don't log full error response for security reasons
        console.error(`[ARMY] ✗ Error sending event: ${res.statusCode} - Request rejected by server`);
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
        console.error(`[ARMY] Connection refused (${connectionErrors} errors) - Server not running on ${TARGET_HOST}:${TARGET_PORT}`);
      } else {
        console.error(`[ARMY] Request error: ${error.code || error.message || JSON.stringify(error)}`);
      }
    }
  });

  req.setTimeout(5000, () => {
    req.destroy();
    console.error(`[ARMY] Request timeout: Server did not respond within 5 seconds`);
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
      console.log(`[ARMY] ✓ Server is available on ${TARGET_HOST}:${TARGET_PORT}`);
      callback(true);
    });
  });

  testReq.on('error', (error) => {
    // Only log if it's not a timeout (timeout is handled separately)
    if (error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT') {
      console.error(`[ARMY] ✗ Server is NOT available on ${TARGET_HOST}:${TARGET_PORT}`);
      console.error(`[ARMY] Error: ${error.code || error.message}`);
      console.error(`[ARMY]`);
      console.error(`[ARMY] Please start the SSR server first:`);
      console.error(`[ARMY]   1. npm run build`);
      console.error(`[ARMY]   2. npm run serve:ssr:eventos-mapa`);
      console.error(`[ARMY]`);
      console.error(`[ARMY] Waiting for server to become available...`);
    }
    callback(false);
  });

  testReq.on('timeout', () => {
    testReq.destroy();
    // Only log timeout if we haven't already started sending events successfully
    // This prevents spam when server is slow but working
    if (connectionErrors === 0) {
      console.error(`[ARMY] ✗ Connection timeout - server may not be running`);
    }
    callback(false);
  });

  testReq.end();
}

// Start sending events
console.log(`[ARMY] Mock Army Server starting...`);
console.log(`[ARMY] Target: http://${TARGET_HOST}:${TARGET_PORT}${TARGET_PATH}`);
console.log(`[ARMY] Interval: ${INTERVAL_MS}ms`);
console.log(`[ARMY] Press Ctrl+C to stop\n`);

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
            console.log(`[ARMY] Server is now available! Starting to send events...\n`);
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

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[ARMY] Shutting down...');
  if (intervalId) {
    clearInterval(intervalId);
  }
  process.exit(0);
});
