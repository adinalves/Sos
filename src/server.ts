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

// Default configuration
let serverConfig: ServerConfig = {
  ipArmy: 'ip_army',
  ipPMERJ: 'ip_pmerj'
};

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

// Initialize config on startup
loadConfig();

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

// Receive events from Army server
app.post('/api/eventos/army', (req, res): void => {
  try {
    const { nome, descricao, latitude, longitude } = req.body;
    
    if (!nome || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Missing required fields: nome, latitude, longitude' });
      return;
    }

    const evento: ServerEvento = {
      id: randomUUID(),
      forca: 'EB',
      nome,
      descricao: descricao || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
      ts: Date.now()
    };

    eventos.push(evento);
    
    // Keep only last 1000 events
    if (eventos.length > 1000) {
      eventos.shift();
    }

    console.log(`Received event from Army: ${evento.nome} at ${evento.latitude}, ${evento.longitude}`);
    res.status(201).json(evento);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process event' });
  }
});

// Receive events from PMERJ server
app.post('/api/eventos/pmerj', (req, res): void => {
  try {
    const { nome, descricao, latitude, longitude } = req.body;
    
    if (!nome || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Missing required fields: nome, latitude, longitude' });
      return;
    }

    const evento: ServerEvento = {
      id: randomUUID(),
      forca: 'PMERJ',
      nome,
      descricao: descricao || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
      ts: Date.now()
    };

    eventos.push(evento);
    
    // Keep only last 1000 events
    if (eventos.length > 1000) {
      eventos.shift();
    }

    console.log(`Received event from PMERJ: ${evento.nome} at ${evento.latitude}, ${evento.longitude}`);
    res.status(201).json(evento);
  } catch (error) {
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
