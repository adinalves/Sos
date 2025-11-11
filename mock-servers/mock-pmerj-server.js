/**
 * Mock PMERJ Server (Polícia Militar do Estado do Rio de Janeiro)
 * Sends events to the main application server
 */

const http = require('http');

// Configuration
const TARGET_HOST = 'localhost';
const TARGET_PORT = 4000;
const TARGET_PATH = '/api/eventos/pmerj';
const INTERVAL_MS = 2500; // Send event every 2.5 seconds

// Event templates for PMERJ
const eventTemplates = [
  {
    nome: 'Patrulhamento de rotina',
    descricao: 'Equipe da PMERJ realiza patrulhamento preventivo na região, com foco em dissuadir práticas criminosas.',
    latitude: -22.9068,
    longitude: -43.1729
  },
  {
    nome: 'Ocorrência em andamento',
    descricao: 'Policiamento ostensivo em resposta a denúncia de atividade suspeita.',
    latitude: -22.9100,
    longitude: -43.1800
  },
  {
    nome: 'Fiscalização de trânsito',
    descricao: 'Fiscalização de veículos e motocicletas para coibir infrações e identificar irregularidades.',
    latitude: -22.9000,
    longitude: -43.1700
  },
  {
    nome: 'Abordagem de suspeitos',
    descricao: 'Abordagem de indivíduos em atitude suspeita para verificação de antecedentes.',
    latitude: -22.9200,
    longitude: -43.1750
  },
  {
    nome: 'Operação de bloqueio',
    descricao: 'Operação de bloqueio viário com revista aleatória de veículos.',
    latitude: -22.9150,
    longitude: -43.1650
  },
  {
    nome: 'Ronda escolar',
    descricao: 'Ronda escolar garantindo segurança no entorno de instituição de ensino.',
    latitude: -22.9050,
    longitude: -43.1850
  },
  {
    nome: 'Monitoramento de aglomeração',
    descricao: 'Monitoramento de pontos de aglomeração para manter a ordem pública.',
    latitude: -22.9250,
    longitude: -43.1600
  },
  {
    nome: 'Suporte a evento público',
    descricao: 'Atuação preventiva em apoio à realização de evento público.',
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
        console.log(`[PMERJ] Event sent successfully: ${event.nome} at ${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`);
      } else {
        console.error(`[PMERJ] Error sending event: ${res.statusCode} - ${responseData}`);
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

// Check if server is available before starting
function checkServerAvailability(callback) {
  const testReq = http.request({
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: '/api/eventos',
    method: 'GET',
    timeout: 3000
  }, (res) => {
    console.log(`[PMERJ] ✓ Server is available on ${TARGET_HOST}:${TARGET_PORT}`);
    callback(true);
  });

  testReq.on('error', (error) => {
    console.error(`[PMERJ] ✗ Server is NOT available on ${TARGET_HOST}:${TARGET_PORT}`);
    console.error(`[PMERJ] Error: ${error.code || error.message}`);
    console.error(`[PMERJ]`);
    console.error(`[PMERJ] Please start the SSR server first:`);
    console.error(`[PMERJ]   1. npm run build`);
    console.error(`[PMERJ]   2. npm run serve:ssr:eventos-mapa`);
    console.error(`[PMERJ]`);
    console.error(`[PMERJ] Waiting for server to become available...`);
    callback(false);
  });

  testReq.on('timeout', () => {
    testReq.destroy();
    console.error(`[PMERJ] ✗ Connection timeout - server may not be running`);
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
    // Retry connection every 5 seconds
    const retryInterval = setInterval(() => {
      checkServerAvailability((available) => {
        if (available) {
          clearInterval(retryInterval);
          console.log(`[PMERJ] Server is now available! Starting to send events...\n`);
          sendEvent();
          intervalId = setInterval(sendEvent, INTERVAL_MS);
        }
      });
    }, 5000);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[PMERJ] Shutting down...');
  if (intervalId) {
    clearInterval(intervalId);
  }
  process.exit(0);
});
