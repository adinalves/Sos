import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const browserDistFolder = join(import.meta.dirname, '../browser');
const configFilePath = join(import.meta.dirname, '../server-config.json');
const mapeamentoFilePath = join(import.meta.dirname, '../server-mapeamento.json');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory storage for events
interface ServerEvento {
  id: string;
  forca: 'PMERJ' | 'EB';
  nome: string;
  descricao: string;
  latitude: number;
  longitude: number;
  ts: number;
}

const eventos: ServerEvento[] = [];

// Server configuration interface
interface ServerConfig {
  ipArmy: string;
  ipPMERJ: string;
}

// Field mapping interface
interface FieldMapping {
  id?: string;
  nome: string;
  descricao?: string;
  latitude: string;
  longitude: string;
  ts?: string;
}

interface MapeamentoConfig {
  army: FieldMapping;
  pmerj: FieldMapping;
}

// Default configuration
let serverConfig: ServerConfig = {
  ipArmy: 'ip_army',
  ipPMERJ: 'ip_pmerj'
};

// Default field mapping
const defaultMapeamento: MapeamentoConfig = {
  army: {
    id: 'identificador',
    nome: 'titulo',
    descricao: 'detalhes',
    latitude: 'lat',
    longitude: 'lng',
    ts: 'dataHora'
  },
  pmerj: {
    id: 'codigo',
    nome: 'name',
    descricao: 'description',
    latitude: 'lat',
    longitude: 'lon',
    ts: 'timestamp'
  }
};

let mapeamentoConfig: MapeamentoConfig = { ...defaultMapeamento };

// Load configuration from file if it exists
async function loadConfig(): Promise<void> {
  try {
    if (existsSync(configFilePath)) {
      const data = await readFile(configFilePath, 'utf-8');
      serverConfig = { ...serverConfig, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Save configuration to file
async function saveConfig(): Promise<void> {
  try {
    await writeFile(configFilePath, JSON.stringify(serverConfig, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

// Load mapeamento from file if it exists
async function loadMapeamento(): Promise<void> {
  try {
    if (existsSync(mapeamentoFilePath)) {
      const data = await readFile(mapeamentoFilePath, 'utf-8');
      mapeamentoConfig = { ...defaultMapeamento, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading mapeamento:', error);
  }
}

// Save mapeamento to file
async function saveMapeamento(): Promise<void> {
  try {
    await writeFile(mapeamentoFilePath, JSON.stringify(mapeamentoConfig, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving mapeamento:', error);
  }
}

// Apply field mapping to incoming data
function applyMapping(data: any, mapping: FieldMapping): any {
  const result: any = {};
  
  if (mapping.id && data[mapping.id] !== undefined) {
    result.id = String(data[mapping.id]);
  }
  
  if (mapping.nome && data[mapping.nome] !== undefined) {
    result.nome = String(data[mapping.nome]);
  }
  
  if (mapping.descricao && data[mapping.descricao] !== undefined) {
    result.descricao = String(data[mapping.descricao]);
  } else {
    result.descricao = '';
  }
  
  if (mapping.latitude && data[mapping.latitude] !== undefined) {
    result.latitude = Number(data[mapping.latitude]);
  }
  
  if (mapping.longitude && data[mapping.longitude] !== undefined) {
    result.longitude = Number(data[mapping.longitude]);
  }
  
  if (mapping.ts && data[mapping.ts] !== undefined) {
    const tsValue = data[mapping.ts];
    // Try to parse as number or date
    if (typeof tsValue === 'number') {
      result.ts = tsValue;
    } else if (typeof tsValue === 'string') {
      const parsed = Date.parse(tsValue);
      result.ts = isNaN(parsed) ? Date.now() : parsed;
    } else {
      result.ts = Date.now();
    }
  } else {
    result.ts = Date.now();
  }
  
  return result;
}

// Initialize config on startup
loadConfig();
loadMapeamento();

/**
 * CORS middleware for API routes (must be before API routes)
 */
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

/**
 * API Routes
 */

// Get all events
app.get('/api/eventos', (req, res) => {
  console.log(`[API] GET /api/eventos - Returning ${eventos.length} events`);
  res.json(eventos);
});

// Get server configuration
app.get('/api/config', (req, res) => {
  res.json(serverConfig);
});

// Update server configuration
app.post('/api/config', async (req, res) => {
  try {
    const { ipArmy, ipPMERJ } = req.body;
    if (ipArmy) serverConfig.ipArmy = ipArmy;
    if (ipPMERJ) serverConfig.ipPMERJ = ipPMERJ;
    await saveConfig();
    res.json(serverConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Get mapeamento configuration
app.get('/api/mapeamento', (req, res) => {
  res.json(mapeamentoConfig);
});

// Update mapeamento configuration
app.post('/api/mapeamento', async (req, res) => {
  try {
    const newMapeamento = req.body as MapeamentoConfig;
    
    // Validate required fields
    if (!newMapeamento.army || !newMapeamento.pmerj) {
      res.status(400).json({ error: 'Missing army or pmerj mapping' });
      return;
    }
    
    if (!newMapeamento.army.nome || !newMapeamento.army.latitude || !newMapeamento.army.longitude) {
      res.status(400).json({ error: 'Missing required fields in army mapping: nome, latitude, longitude' });
      return;
    }
    
    if (!newMapeamento.pmerj.nome || !newMapeamento.pmerj.latitude || !newMapeamento.pmerj.longitude) {
      res.status(400).json({ error: 'Missing required fields in pmerj mapping: nome, latitude, longitude' });
      return;
    }
    
    mapeamentoConfig = { ...newMapeamento };
    await saveMapeamento();
    res.json(mapeamentoConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mapeamento' });
  }
});

// Receive events from Army server
app.post('/api/eventos/army', (req, res): void => {
  try {
    console.log(`[SERVER] Received POST /api/eventos/army`);
    console.log(`[SERVER] Request body (JSON):`);
    console.log(JSON.stringify(req.body, null, 2));
    
    // Apply field mapping
    const mapped = applyMapping(req.body, mapeamentoConfig.army);
    
    console.log(`[SERVER] After mapping (JSON):`);
    console.log(JSON.stringify(mapped, null, 2));
    
    if (!mapped.nome || mapped.latitude === undefined || mapped.longitude === undefined) {
      const errorResponse = { 
        error: `Missing required fields. Expected: nome (${mapeamentoConfig.army.nome}), latitude (${mapeamentoConfig.army.latitude}), longitude (${mapeamentoConfig.army.longitude})` 
      };
      console.error(`[SERVER] Validation error:`, errorResponse);
      res.status(400).json(errorResponse);
      return;
    }

    const evento: ServerEvento = {
      id: mapped.id || randomUUID(),
      forca: 'EB',
      nome: mapped.nome,
      descricao: mapped.descricao || '',
      latitude: mapped.latitude,
      longitude: mapped.longitude,
      ts: mapped.ts || Date.now()
    };

    eventos.push(evento);
    
    // Keep only last 1000 events
    if (eventos.length > 1000) {
      eventos.shift();
    }

    console.log(`[SERVER] ✓ Event processed: ${evento.nome} at ${evento.latitude}, ${evento.longitude}`);
    
    res.status(201).json({ success: true, message: 'Event received successfully' });
  } catch (error) {
    console.error('[SERVER] ✗ Error processing Army event:', error);
    res.status(500).json({ error: 'Failed to process event' });
  }
});

// Receive events from PMERJ server
app.post('/api/eventos/pmerj', (req, res): void => {
  try {
    console.log(`[SERVER] Received POST /api/eventos/pmerj`);
    console.log(`[SERVER] Request body (JSON):`);
    console.log(JSON.stringify(req.body, null, 2));
    
    // Apply field mapping
    const mapped = applyMapping(req.body, mapeamentoConfig.pmerj);
    
    console.log(`[SERVER] After mapping (JSON):`);
    console.log(JSON.stringify(mapped, null, 2));
    
    if (!mapped.nome || mapped.latitude === undefined || mapped.longitude === undefined) {
      const errorResponse = { 
        error: `Missing required fields. Expected: nome (${mapeamentoConfig.pmerj.nome}), latitude (${mapeamentoConfig.pmerj.latitude}), longitude (${mapeamentoConfig.pmerj.longitude})` 
      };
      console.error(`[SERVER] Validation error:`, errorResponse);
      res.status(400).json(errorResponse);
      return;
    }

    const evento: ServerEvento = {
      id: mapped.id || randomUUID(),
      forca: 'PMERJ',
      nome: mapped.nome,
      descricao: mapped.descricao || '',
      latitude: mapped.latitude,
      longitude: mapped.longitude,
      ts: mapped.ts || Date.now()
    };

    eventos.push(evento);
    
    // Keep only last 1000 events
    if (eventos.length > 1000) {
      eventos.shift();
    }

    console.log(`[SERVER] ✓ Event processed: ${evento.nome} at ${evento.latitude}, ${evento.longitude}`);
    
    res.status(201).json({ success: true, message: 'Event received successfully' });
  } catch (error) {
    console.error('[SERVER] ✗ Error processing PMERJ event:', error);
    res.status(500).json({ error: 'Failed to process event' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
