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
// Save mapeamento file in the project root using process.cwd() to ensure correct path
const mapeamentoFilePath = join(process.cwd(), 'server-mapeamento.json');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Trust proxy to get correct client IP
app.set('trust proxy', true);

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

interface SecurityConfig {
  token?: string;
  allowedIp?: string;
}

interface ServerMapping {
  mapping: FieldMapping;
  security: SecurityConfig;
}

interface MapeamentoConfig {
  army: ServerMapping;
  pmerj: ServerMapping;
}

// Default configuration
let serverConfig: ServerConfig = {
  ipArmy: 'ip_army',
  ipPMERJ: 'ip_pmerj'
};

// Default field mapping
const defaultMapeamento: MapeamentoConfig = {
  army: {
    mapping: {
      id: 'identificador',
      nome: 'titulo',
      descricao: 'detalhes',
      latitude: 'lat',
      longitude: 'lng',
      ts: 'dataHora'
    },
    security: {
      token: 'army-secret-token-123',
      allowedIp: '127.0.0.1'
    }
  },
  pmerj: {
    mapping: {
      id: 'codigo',
      nome: 'name',
      descricao: 'description',
      latitude: 'lat',
      longitude: 'lon',
      ts: 'timestamp'
    },
    security: {
      token: 'pmerj-secret-token-456',
      allowedIp: '127.0.0.1'
    }
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
    console.log('[SERVER] loadMapeamento() called');
    console.log('[SERVER] Checking file at:', mapeamentoFilePath);
    console.log('[SERVER] File exists?', existsSync(mapeamentoFilePath));
    
    if (existsSync(mapeamentoFilePath)) {
      const data = await readFile(mapeamentoFilePath, 'utf-8');
      console.log('[SERVER] File content (raw):', data);
      const loaded = JSON.parse(data);
      console.log('[SERVER] Raw data loaded from file:', JSON.stringify(loaded, null, 2));
      console.log('[SERVER] Loaded army.security.allowedIp:', loaded.army?.security?.allowedIp);
      console.log('[SERVER] Loaded pmerj.security.allowedIp:', loaded.pmerj?.security?.allowedIp);
      
      // Use loaded config directly, only merge missing required fields
      mapeamentoConfig = {
        army: {
          mapping: {
            id: loaded.army?.mapping?.id ?? defaultMapeamento.army.mapping.id,
            nome: loaded.army?.mapping?.nome ?? defaultMapeamento.army.mapping.nome,
            descricao: loaded.army?.mapping?.descricao ?? defaultMapeamento.army.mapping.descricao,
            latitude: loaded.army?.mapping?.latitude ?? defaultMapeamento.army.mapping.latitude,
            longitude: loaded.army?.mapping?.longitude ?? defaultMapeamento.army.mapping.longitude,
            ts: loaded.army?.mapping?.ts ?? defaultMapeamento.army.mapping.ts
          },
          security: {
            token: (loaded.army?.security?.token !== undefined && loaded.army?.security?.token !== null) 
              ? loaded.army.security.token 
              : defaultMapeamento.army.security.token,
            allowedIp: (loaded.army?.security?.allowedIp !== undefined && loaded.army?.security?.allowedIp !== null) 
              ? loaded.army.security.allowedIp 
              : defaultMapeamento.army.security.allowedIp
          }
        },
        pmerj: {
          mapping: {
            id: loaded.pmerj?.mapping?.id ?? defaultMapeamento.pmerj.mapping.id,
            nome: loaded.pmerj?.mapping?.nome ?? defaultMapeamento.pmerj.mapping.nome,
            descricao: loaded.pmerj?.mapping?.descricao ?? defaultMapeamento.pmerj.mapping.descricao,
            latitude: loaded.pmerj?.mapping?.latitude ?? defaultMapeamento.pmerj.mapping.latitude,
            longitude: loaded.pmerj?.mapping?.longitude ?? defaultMapeamento.pmerj.mapping.longitude,
            ts: loaded.pmerj?.mapping?.ts ?? defaultMapeamento.pmerj.mapping.ts
          },
          security: {
            token: (loaded.pmerj?.security?.token !== undefined && loaded.pmerj?.security?.token !== null) 
              ? loaded.pmerj.security.token 
              : defaultMapeamento.pmerj.security.token,
            allowedIp: (loaded.pmerj?.security?.allowedIp !== undefined && loaded.pmerj?.security?.allowedIp !== null) 
              ? loaded.pmerj.security.allowedIp 
              : defaultMapeamento.pmerj.security.allowedIp
          }
        }
      };
      console.log('[SERVER] ✓ Mapeamento loaded from file (processed):', JSON.stringify(mapeamentoConfig, null, 2));
    } else {
      console.log('[SERVER] No mapeamento file found, using defaults');
      mapeamentoConfig = { ...defaultMapeamento };
    }
  } catch (error) {
    console.error('[SERVER] ✗ Error loading mapeamento:', error);
    console.log('[SERVER] Using default mapeamento configuration');
    mapeamentoConfig = { ...defaultMapeamento };
  }
}

// Save mapeamento to file
async function saveMapeamento(): Promise<void> {
  try {
    const dataToSave = JSON.stringify(mapeamentoConfig, null, 2);
    console.log(`[SERVER] ========================================`);
    console.log(`[SERVER] saveMapeamento() called`);
    console.log(`[SERVER] File path: ${mapeamentoFilePath}`);
    console.log(`[SERVER] Current working directory: ${process.cwd()}`);
    console.log(`[SERVER] __dirname equivalent: ${import.meta.dirname}`);
    console.log(`[SERVER] Data to write:`, dataToSave);
    console.log(`[SERVER] Data length: ${dataToSave.length} bytes`);
    
    // Ensure directory exists
    const path = await import('path');
    const fs = await import('fs/promises');
    const dir = path.dirname(mapeamentoFilePath);
    
    console.log(`[SERVER] Directory for file: ${dir}`);
    console.log(`[SERVER] Full file path: ${mapeamentoFilePath}`);
    
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`[SERVER] ✓ Directory ensured: ${dir}`);
    } catch (mkdirError) {
      console.error(`[SERVER] ✗ Error creating directory:`, mkdirError);
      // Continue anyway, might already exist
    }
    
    try {
      await writeFile(mapeamentoFilePath, dataToSave, 'utf-8');
      console.log(`[SERVER] ✓ writeFile() completed without throwing error`);
    } catch (writeError: any) {
      console.error(`[SERVER] ✗ ERROR in writeFile():`, writeError);
      console.error(`[SERVER] Error message:`, writeError?.message);
      console.error(`[SERVER] Error code:`, writeError?.code);
      throw writeError;
    }
    
    // Wait a bit for file system to sync
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify file was created
    const exists = existsSync(mapeamentoFilePath);
    console.log(`[SERVER] File exists after write? ${exists}`);
    console.log(`[SERVER] Checking file at: ${mapeamentoFilePath}`);
    
    if (exists) {
      try {
        const stats = await fs.stat(mapeamentoFilePath);
        console.log(`[SERVER] File size: ${stats.size} bytes`);
        // Read back to verify content
        const readBack = await readFile(mapeamentoFilePath, 'utf-8');
        const parsed = JSON.parse(readBack);
        console.log(`[SERVER] ✓ Verified - Army allowedIp in file: ${parsed.army?.security?.allowedIp}`);
        console.log(`[SERVER] ✓ Verified - PMERJ allowedIp in file: ${parsed.pmerj?.security?.allowedIp}`);
      } catch (readError: any) {
        console.error(`[SERVER] ✗ ERROR reading back file:`, readError);
      }
    } else {
      console.error(`[SERVER] ✗ File does not exist after write!`);
      console.error(`[SERVER] Attempted path: ${mapeamentoFilePath}`);
      console.error(`[SERVER] Current working directory: ${process.cwd()}`);
      
      // Try to list files in the directory
      try {
        const files = await fs.readdir(process.cwd());
        console.log(`[SERVER] Files in current directory:`, files.slice(0, 10));
      } catch (listError) {
        console.error(`[SERVER] Could not list directory:`, listError);
      }
    }
    console.log(`[SERVER] ========================================`);
  } catch (error) {
    console.error('[SERVER] ✗ Error saving mapeamento:', error);
    console.error('[SERVER] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw error; // Re-throw to let caller handle
  }
}

// Get client IP from request
function getClientIp(req: express.Request): string {
  // With trust proxy enabled, Express processes X-Forwarded-For and puts it in req.ip
  // Check req.ip first (Express processed IP)
  if (req.ip) {
    console.log(`[SERVER] IP from req.ip (Express processed): ${req.ip}`);
    return req.ip;
  }
  
  // Fallback: Check X-Forwarded-For header directly
  const forwarded = req.headers['x-forwarded-for'] || req.headers['x-forwarded-For'];
  if (typeof forwarded === 'string') {
    const ip = forwarded.split(',')[0].trim();
    console.log(`[SERVER] IP from X-Forwarded-For header: ${ip}`);
    return ip;
  }
  
  // Final fallback: socket remote address
  const ip = req.socket.remoteAddress || 'unknown';
  console.log(`[SERVER] IP from socket.remoteAddress: ${ip}`);
  return ip;
}

// Validate security (token and IP)
function validateSecurity(req: express.Request, security: SecurityConfig): { valid: boolean; error?: string } {
  console.log(`[SERVER] ========================================`);
  console.log(`[SERVER] Validating security with config:`, JSON.stringify(security, null, 2));
  
  // Validate IP if configured (must be non-empty string)
  const allowedIp = security.allowedIp?.trim();
  if (allowedIp && allowedIp.length > 0) {
    const clientIp = getClientIp(req);
    
    // Normalize IPs for comparison (handle IPv6 mapped IPv4)
    const normalizedClientIp = clientIp.replace(/^::ffff:/, '');
    const normalizedAllowedIp = allowedIp.replace(/^::ffff:/, '');
    
    // Log IP validation (only in server logs, not in response)
    console.log(`[SERVER] IP validation:`);
    console.log(`[SERVER]   - Allowed IP: "${normalizedAllowedIp}"`);
    console.log(`[SERVER]   - Client IP: "${normalizedClientIp}" `);
    
    if (normalizedClientIp !== normalizedAllowedIp && clientIp !== allowedIp && normalizedClientIp !== allowedIp) {
      console.error(`[SERVER] ✗ IP validation FAILED`);
      console.error(`[SERVER]   Expected: "${allowedIp}" or "${normalizedAllowedIp}"`);
      console.error(`[SERVER]   Got: "${clientIp}" or "${normalizedClientIp}"`);
      // Don't expose IP details in error message for security
      return { valid: false, error: 'IP address not allowed' };
    }
    console.log(`[SERVER] ✓ IP validation PASSED`);
  } else {
    console.log(`[SERVER] IP validation SKIPPED (no IP configured or empty)`);
  }

  // Validate token if configured (must be non-empty string)
  const expectedToken = security.token?.trim();
  if (expectedToken && expectedToken.length > 0) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error(`[SERVER] ✗ Token validation FAILED - Missing Authorization header`);
      return { valid: false, error: 'Missing Authorization header' };
    }
    
    // Support both "Bearer token" and just "token"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7).trim()
      : authHeader.trim();
    
    // Log token validation (only in server logs, not in response)
    console.log(`[SERVER] Token validation:`);
    console.log(`[SERVER]   - Expected: "${expectedToken}"`);
    console.log(`[SERVER]   - Got: "${token.substring(0, 4)}..." (truncated for security)`);
    
    if (token !== expectedToken) {
      console.error(`[SERVER] ✗ Token validation FAILED`);
      // Don't expose token details in error message for security
      return { valid: false, error: 'Invalid token' };
    }
    console.log(`[SERVER] ✓ Token validation PASSED`);
  } else {
    console.log(`[SERVER] Token validation SKIPPED (no token configured or empty)`);
  }

  console.log(`[SERVER] ✓ All security validations PASSED`);
  console.log(`[SERVER] ========================================`);
  return { valid: true };
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
app.get('/api/mapeamento', async (req, res) => {
  console.log('[SERVER] ========================================');
  console.log('[SERVER] GET /api/mapeamento - Request received');
  console.log('[SERVER] File path:', mapeamentoFilePath);
  console.log('[SERVER] File exists?', existsSync(mapeamentoFilePath));
  console.log('[SERVER] Current mapeamentoConfig in memory (before reload):');
  console.log(JSON.stringify(mapeamentoConfig, null, 2));
  console.log('[SERVER] Army security.allowedIp (before reload):', mapeamentoConfig.army.security.allowedIp);
  console.log('[SERVER] PMERJ security.allowedIp (before reload):', mapeamentoConfig.pmerj.security.allowedIp);
  
  // Reload from file to ensure we return the latest saved version
  try {
    await loadMapeamento();
    console.log('[SERVER] After reload from file:');
    console.log(JSON.stringify(mapeamentoConfig, null, 2));
    console.log('[SERVER] Army security.allowedIp after reload:', mapeamentoConfig.army.security.allowedIp);
    console.log('[SERVER] PMERJ security.allowedIp after reload:', mapeamentoConfig.pmerj.security.allowedIp);
  } catch (error) {
    console.error('[SERVER] Error reloading from file:', error);
  }
  
  console.log('[SERVER] Returning config to client:');
  console.log(JSON.stringify(mapeamentoConfig, null, 2));
  console.log('[SERVER] ========================================');
  res.json(mapeamentoConfig);
});

// Update mapeamento configuration
app.post('/api/mapeamento', async (req, res) => {
  console.log('[SERVER] ========================================');
  console.log('[SERVER] ⚡ POST /api/mapeamento - REQUEST RECEIVED!');
  console.log('[SERVER] Request method:', req.method);
  console.log('[SERVER] Request URL:', req.url);
  console.log('[SERVER] Request headers:', JSON.stringify(req.headers, null, 2));
  try {
    console.log('[SERVER] Request body (raw):', JSON.stringify(req.body, null, 2));
    console.log('[SERVER] Request body type:', typeof req.body);
    console.log('[SERVER] Request body.army:', req.body.army);
    console.log('[SERVER] Request body.army.security:', req.body.army?.security);
    console.log('[SERVER] Request body.army.security.allowedIp:', req.body.army?.security?.allowedIp);
    console.log('[SERVER] Request body.army.security.allowedIp type:', typeof req.body.army?.security?.allowedIp);
    
    const newMapeamento = req.body as MapeamentoConfig;
    
    console.log('[SERVER] Parsed configuration:');
    console.log('[SERVER]   Army security.token:', newMapeamento.army?.security?.token, '(type:', typeof newMapeamento.army?.security?.token, ')');
    console.log('[SERVER]   Army security.allowedIp:', newMapeamento.army?.security?.allowedIp, '(type:', typeof newMapeamento.army?.security?.allowedIp, ')');
    console.log('[SERVER]   Army security.allowedIp === "127.0.1.1":', newMapeamento.army?.security?.allowedIp === '127.0.1.1');
    console.log('[SERVER]   PMERJ security.token:', newMapeamento.pmerj?.security?.token, '(type:', typeof newMapeamento.pmerj?.security?.token, ')');
    console.log('[SERVER]   PMERJ security.allowedIp:', newMapeamento.pmerj?.security?.allowedIp, '(type:', typeof newMapeamento.pmerj?.security?.allowedIp, ')');
    
    // Validate required fields
    if (!newMapeamento.army || !newMapeamento.pmerj) {
      res.status(400).json({ error: 'Missing army or pmerj mapping' });
      return;
    }
    
    if (!newMapeamento.army?.mapping?.nome || !newMapeamento.army?.mapping?.latitude || !newMapeamento.army?.mapping?.longitude) {
      res.status(400).json({ error: 'Missing required fields in army mapping: nome, latitude, longitude' });
      return;
    }
    
    if (!newMapeamento.pmerj?.mapping?.nome || !newMapeamento.pmerj?.mapping?.latitude || !newMapeamento.pmerj?.mapping?.longitude) {
      res.status(400).json({ error: 'Missing required fields in pmerj mapping: nome, latitude, longitude' });
      return;
    }
    
    // Use the new configuration directly - preserve empty strings as empty, not undefined
    // Empty strings will disable validation, undefined will use defaults
    const armyToken = newMapeamento.army.security?.token;
    const armyIp = newMapeamento.army.security?.allowedIp;
    const pmerjToken = newMapeamento.pmerj.security?.token;
    const pmerjIp = newMapeamento.pmerj.security?.allowedIp;
    
    console.log('[SERVER] Extracted values:');
    console.log('[SERVER]   armyToken:', armyToken, '(trimmed:', armyToken?.trim(), ')');
    console.log('[SERVER]   armyIp:', armyIp, '(trimmed:', armyIp?.trim(), ')');
    console.log('[SERVER]   pmerjToken:', pmerjToken, '(trimmed:', pmerjToken?.trim(), ')');
    console.log('[SERVER]   pmerjIp:', pmerjIp, '(trimmed:', pmerjIp?.trim(), ')');
    
    mapeamentoConfig = {
      army: {
        mapping: {
          id: newMapeamento.army.mapping?.id || defaultMapeamento.army.mapping.id,
          nome: newMapeamento.army.mapping.nome,
          descricao: newMapeamento.army.mapping?.descricao || defaultMapeamento.army.mapping.descricao,
          latitude: newMapeamento.army.mapping.latitude,
          longitude: newMapeamento.army.mapping.longitude,
          ts: newMapeamento.army.mapping?.ts || defaultMapeamento.army.mapping.ts
        },
        security: {
          token: (armyToken && typeof armyToken === 'string' && armyToken.trim()) ? armyToken.trim() : undefined,
          allowedIp: (armyIp && typeof armyIp === 'string') 
            ? (armyIp.trim().length > 0 ? armyIp.trim() : undefined)
            : undefined
        }
      },
      pmerj: {
        mapping: {
          id: newMapeamento.pmerj.mapping?.id || defaultMapeamento.pmerj.mapping.id,
          nome: newMapeamento.pmerj.mapping.nome,
          descricao: newMapeamento.pmerj.mapping?.descricao || defaultMapeamento.pmerj.mapping.descricao,
          latitude: newMapeamento.pmerj.mapping.latitude,
          longitude: newMapeamento.pmerj.mapping.longitude,
          ts: newMapeamento.pmerj.mapping?.ts || defaultMapeamento.pmerj.mapping.ts
        },
        security: {
          token: (pmerjToken && typeof pmerjToken === 'string' && pmerjToken.trim()) ? pmerjToken.trim() : undefined,
          allowedIp: (pmerjIp && typeof pmerjIp === 'string') 
            ? (pmerjIp.trim().length > 0 ? pmerjIp.trim() : undefined)
            : undefined
        }
      }
    };
    
    console.log('[SERVER] ========================================');
    console.log('[SERVER] Received new mapeamento configuration:');
    console.log(JSON.stringify(newMapeamento, null, 2));
    console.log('[SERVER] Processed mapeamento configuration (to save):');
    console.log(JSON.stringify(mapeamentoConfig, null, 2));
    
    try {
      await saveMapeamento();
      console.log('[SERVER] ✓ saveMapeamento() completed successfully');
    } catch (saveError: any) {
      console.error('[SERVER] ✗ ERROR in saveMapeamento():', saveError);
      console.error('[SERVER] Error message:', saveError?.message);
      console.error('[SERVER] Error stack:', saveError?.stack);
      console.error('[SERVER] Error code:', saveError?.code);
      throw saveError;
    }
    
    // Verify what was saved
    console.log('[SERVER] Verifying saved file...');
    console.log('[SERVER] File path:', mapeamentoFilePath);
    console.log('[SERVER] File exists?', existsSync(mapeamentoFilePath));
    console.log('[SERVER] Current working directory:', process.cwd());
    console.log('[SERVER] __dirname equivalent:', import.meta.dirname);
    
    if (existsSync(mapeamentoFilePath)) {
      const saved = await readFile(mapeamentoFilePath, 'utf-8');
      console.log('[SERVER] ✓ Verified saved file contents:');
      console.log(saved);
      const parsed = JSON.parse(saved);
      console.log('[SERVER] Parsed saved file - Army allowedIp:', parsed.army?.security?.allowedIp);
      console.log('[SERVER] Parsed saved file - PMERJ allowedIp:', parsed.pmerj?.security?.allowedIp);
    } else {
      console.error('[SERVER] ✗ ERROR: File was not created!');
      console.error('[SERVER] Expected path:', mapeamentoFilePath);
      console.error('[SERVER] Current working directory:', process.cwd());
      console.error('[SERVER] __dirname equivalent:', import.meta.dirname);
      
      // Try to create directory if it doesn't exist
      const path = await import('path');
      const dir = path.dirname(mapeamentoFilePath);
      console.log('[SERVER] Directory for file:', dir);
    }
    
    console.log('[SERVER] ✓ Mapeamento saved successfully to file');
    console.log('[SERVER] Current mapeamentoConfig in memory:');
    console.log(JSON.stringify(mapeamentoConfig, null, 2));
    console.log('[SERVER] ========================================');
    res.json(mapeamentoConfig);
  } catch (error) {
    console.error('[SERVER] ✗ Error in POST /api/mapeamento:', error);
    res.status(500).json({ error: 'Failed to update mapeamento' });
  }
});

// Receive events from Army server
app.post('/api/eventos/army', (req, res): void => {
  try {
    console.log(`[SERVER] ========================================`);
    console.log(`[SERVER] Received POST /api/eventos/army`);
    console.log(`[SERVER] === CURRENT MAPEAMENTO CONFIG IN MEMORY ===`);
    console.log(JSON.stringify(mapeamentoConfig, null, 2));
    console.log(`[SERVER] === ARMY SECURITY CONFIG ===`);
    console.log(JSON.stringify(mapeamentoConfig.army.security, null, 2));
    console.log(`[SERVER] === ARMY SECURITY ALLOWED IP VALUE ===`);
    console.log(`Value: "${mapeamentoConfig.army.security.allowedIp}"`);
    console.log(`Type: ${typeof mapeamentoConfig.army.security.allowedIp}`);
    console.log(`Is defined: ${mapeamentoConfig.army.security.allowedIp !== undefined}`);
    console.log(`Is truthy: ${!!mapeamentoConfig.army.security.allowedIp}`);
    console.log(`[SERVER] req.ip:`, req.ip);
    console.log(`[SERVER] req.socket.remoteAddress:`, req.socket.remoteAddress);
    console.log(`[SERVER] X-Forwarded-For header:`, req.headers['x-forwarded-for'] || req.headers['x-forwarded-For']);
    console.log(`[SERVER] Request body (JSON):`);
    console.log(JSON.stringify(req.body, null, 2));
    
    // Validate security
    const securityCheck = validateSecurity(req, mapeamentoConfig.army.security);
    if (!securityCheck.valid) {
      console.error(`[SERVER] ✗ Security validation failed: ${securityCheck.error}`);
      res.status(401).json({ error: securityCheck.error });
      return;
    }
    
    // Apply field mapping
    const mapped = applyMapping(req.body, mapeamentoConfig.army.mapping);
    
    console.log(`[SERVER] After mapping (JSON):`);
    console.log(JSON.stringify(mapped, null, 2));
    
    if (!mapped.nome || mapped.latitude === undefined || mapped.longitude === undefined) {
      const errorResponse = { 
        error: `Missing required fields. Expected: nome (${mapeamentoConfig.army.mapping.nome}), latitude (${mapeamentoConfig.army.mapping.latitude}), longitude (${mapeamentoConfig.army.mapping.longitude})` 
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
    console.log(`[SERVER] ========================================`);
    console.log(`[SERVER] Received POST /api/eventos/pmerj`);
    console.log(`[SERVER] === CURRENT MAPEAMENTO CONFIG IN MEMORY ===`);
    console.log(JSON.stringify(mapeamentoConfig, null, 2));
    console.log(`[SERVER] === PMERJ SECURITY CONFIG ===`);
    console.log(JSON.stringify(mapeamentoConfig.pmerj.security, null, 2));
    console.log(`[SERVER] === PMERJ SECURITY ALLOWED IP VALUE ===`);
    console.log(`Value: "${mapeamentoConfig.pmerj.security.allowedIp}"`);
    console.log(`Type: ${typeof mapeamentoConfig.pmerj.security.allowedIp}`);
    console.log(`Is defined: ${mapeamentoConfig.pmerj.security.allowedIp !== undefined}`);
    console.log(`Is truthy: ${!!mapeamentoConfig.pmerj.security.allowedIp}`);
    console.log(`[SERVER] req.ip:`, req.ip);
    console.log(`[SERVER] req.socket.remoteAddress:`, req.socket.remoteAddress);
    console.log(`[SERVER] X-Forwarded-For header:`, req.headers['x-forwarded-for'] || req.headers['x-forwarded-For']);
    console.log(`[SERVER] Request body (JSON):`);
    console.log(JSON.stringify(req.body, null, 2));
    
    // Validate security
    const securityCheck = validateSecurity(req, mapeamentoConfig.pmerj.security);
    if (!securityCheck.valid) {
      console.error(`[SERVER] ✗ Security validation failed: ${securityCheck.error}`);
      res.status(401).json({ error: securityCheck.error });
      return;
    }
    
    // Apply field mapping
    const mapped = applyMapping(req.body, mapeamentoConfig.pmerj.mapping);
    
    console.log(`[SERVER] After mapping (JSON):`);
    console.log(JSON.stringify(mapped, null, 2));
    
    if (!mapped.nome || mapped.latitude === undefined || mapped.longitude === undefined) {
      const errorResponse = { 
        error: `Missing required fields. Expected: nome (${mapeamentoConfig.pmerj.mapping.nome}), latitude (${mapeamentoConfig.pmerj.mapping.latitude}), longitude (${mapeamentoConfig.pmerj.mapping.longitude})` 
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
