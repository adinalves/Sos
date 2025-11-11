# Mock Servers

This directory contains mock servers that simulate the Army and PMERJ servers sending events to the main application.

## Usage

### Prerequisites
- Node.js installed
- **Main SSR server running on `http://localhost:4000`**
  - The API endpoints are only available when running the SSR server
  - Build and start the server: `npm run build && npm run serve:ssr:eventos-mapa`
  - **Note:** `ng serve` (development server on port 4200) does NOT have the API endpoints

### Running the Mock Servers

**Important:** Make sure the SSR server is running first!

#### Option 1: Run separately

**Terminal 1 - Start SSR Server:**
```bash
npm run build
npm run serve:ssr:eventos-mapa
```

**Terminal 2 - Army Server:**
```bash
node mock-servers/mock-army-server.js
# or
npm run mock:army
```

**Terminal 3 - PMERJ Server:**
```bash
node mock-servers/mock-pmerj-server.js
# or
npm run mock:pmerj
```

#### Option 2: Run both simultaneously (Windows PowerShell)
```powershell
Start-Process node -ArgumentList "mock-servers/mock-army-server.js"
Start-Process node -ArgumentList "mock-servers/mock-pmerj-server.js"
```

#### Option 3: Run both simultaneously (Linux/Mac)
```bash
node mock-servers/mock-army-server.js &
node mock-servers/mock-pmerj-server.js &
```

## Configuration

You can modify the following constants in each server file:

- `TARGET_HOST`: Hostname of the main application server (default: `localhost`)
- `TARGET_PORT`: Port of the main application server (default: `4000`)
- `TARGET_PATH`: API endpoint path (default: `/api/eventos/army` or `/api/eventos/pmerj`)
- `INTERVAL_MS`: Interval between events in milliseconds (default: 3000ms for Army, 2500ms for PMERJ)

## Event Format

Each server sends events in the following JSON format:

```json
{
  "nome": "Event name",
  "descricao": "Event description",
  "latitude": -22.9068,
  "longitude": -43.1729
}
```

## Troubleshooting

### Connection Refused Error

If you see "Connection refused" errors, it means the main server is not running on port 4000. 

**Solution:**
1. Make sure you've built the application: `npm run build`
2. Start the SSR server: `npm run serve:ssr:eventos-mapa`
3. Wait for the server to start (you should see "Node Express server listening on http://localhost:4000")
4. Then start the mock servers

### Development vs Production

- **Development (`ng serve`)**: Runs on port 4200, but does NOT have API endpoints
- **Production SSR (`npm run serve:ssr:eventos-mapa`)**: Runs on port 4000, has all API endpoints

The mock servers only work with the SSR server on port 4000.

## Stopping the Servers

Press `Ctrl+C` in each terminal to stop the respective server.
