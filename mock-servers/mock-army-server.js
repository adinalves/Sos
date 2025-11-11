/**
 * Mock Army Server (Exército Brasileiro)
 * Sends events to the main application server
 */

const http = require('http');

// Configuration
const TARGET_HOST = 'localhost';
const TARGET_PORT = 4000;
const TARGET_PATH = '/api/eventos/army';
const INTERVAL_MS = 3000; // Send event every 3 seconds

// Event templates for Army
const eventTemplates = [
  {
    nome: 'Ponto de observação',
    descricao: 'Unidade do EB estabelece ponto de observação estratégico para monitoramento da área.',
    latitude: -22.9068,
    longitude: -43.1729
  },
  {
    nome: 'Patrulha motorizada',
    descricao: 'Patrulha motorizada realiza deslocamento para presença dissuasória em áreas sensíveis.',
    latitude: -22.9100,
    longitude: -43.1800
  },
  {
    nome: 'Posto de apoio avançado',
    descricao: 'Posto de apoio avançado montado para suporte logístico às tropas em operação.',
    latitude: -22.9000,
    longitude: -43.1700
  },
  {
    nome: 'Comboio logístico',
    descricao: 'Comboio logístico em trânsito com suprimentos para base operacional.',
    latitude: -22.9200,
    longitude: -43.1750
  },
  {
    nome: 'Operação conjunta',
    descricao: 'Ação coordenada com forças de segurança locais em operação conjunta.',
    latitude: -22.9150,
    longitude: -43.1650
  },
  {
    nome: 'Reconhecimento de área',
    descricao: 'Reconhecimento tático de terreno urbano para futura operação.',
    latitude: -22.9050,
    longitude: -43.1850
  },
  {
    nome: 'Ponto de controle de acesso',
    descricao: 'Ponto de controle instalado para fiscalização de entrada e saída de veículos.',
    latitude: -22.9250,
    longitude: -43.1600
  },
  {
    nome: 'Deslocamento tático',
    descricao: 'Deslocamento de frações em formação tática para reforço de posição avançada.',
    latitude: -22.8950,
    longitude: -43.1750
  }
];

// Generate random event
function generateEvent() {
  const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
  const variation = 0.01; // Small variation in coordinates
  
  return {
    nome: template.nome,
    descricao: template.descricao,
    latitude: template.latitude + (Math.random() - 0.5) * variation,
    longitude: template.longitude + (Math.random() - 0.5) * variation
  };
}

// Send event to main server
function sendEvent() {
  const event = generateEvent();
  const data = JSON.stringify(event);

  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: TARGET_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 201) {
        console.log(`[ARMY] Event sent successfully: ${event.nome} at ${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`);
      } else {
        console.error(`[ARMY] Error sending event: ${res.statusCode} - ${responseData}`);
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

// Check if server is available before starting
function checkServerAvailability(callback) {
  const testReq = http.request({
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: '/api/eventos',
    method: 'GET',
    timeout: 3000
  }, (res) => {
    console.log(`[ARMY] ✓ Server is available on ${TARGET_HOST}:${TARGET_PORT}`);
    callback(true);
  });

  testReq.on('error', (error) => {
    console.error(`[ARMY] ✗ Server is NOT available on ${TARGET_HOST}:${TARGET_PORT}`);
    console.error(`[ARMY] Error: ${error.code || error.message}`);
    console.error(`[ARMY]`);
    console.error(`[ARMY] Please start the SSR server first:`);
    console.error(`[ARMY]   1. npm run build`);
    console.error(`[ARMY]   2. npm run serve:ssr:eventos-mapa`);
    console.error(`[ARMY]`);
    console.error(`[ARMY] Waiting for server to become available...`);
    callback(false);
  });

  testReq.on('timeout', () => {
    testReq.destroy();
    console.error(`[ARMY] ✗ Connection timeout - server may not be running`);
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
    // Retry connection every 5 seconds
    const retryInterval = setInterval(() => {
      checkServerAvailability((available) => {
        if (available) {
          clearInterval(retryInterval);
          console.log(`[ARMY] Server is now available! Starting to send events...\n`);
          sendEvent();
          intervalId = setInterval(sendEvent, INTERVAL_MS);
        }
      });
    }, 5000);
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
