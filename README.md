# Sistema Integrador - Eventos Mapa

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.4.

## Overview

Sistema Integrador is an application that receives and displays events from two external servers:
- **Army (Exército Brasileiro - EB)**: Military events
- **PMERJ (Polícia Militar do Estado do Rio de Janeiro)**: Police events

The application displays these events on an interactive map with real-time updates.

## Features

- 🗺️ Interactive map showing events from Army and PMERJ servers
- ⚙️ Configuration page to manage server IP addresses
- 📡 REST API endpoints to receive events from external servers
- 🔄 Real-time event updates (polling every 2 seconds)
- 🎯 Event filtering by source (PMERJ/EB)
- 📍 Event details with location and timestamp

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Production server

To run the production server with SSR:

```bash
npm run build
npm run serve:ssr:eventos-mapa
```

The server will listen on port 4000 (or the PORT environment variable).

## API Endpoints

### Get all events
```
GET /api/eventos
```

### Get server configuration
```
GET /api/config
```

### Update server configuration
```
POST /api/config
Body: { "ipArmy": "ip_army", "ipPMERJ": "ip_pmerj" }
```

### Receive events from Army server
```
POST /api/eventos/army
Body: {
  "nome": "Event name",
  "descricao": "Event description",
  "latitude": -22.9068,
  "longitude": -43.1729
}
```

### Receive events from PMERJ server
```
POST /api/eventos/pmerj
Body: {
  "nome": "Event name",
  "descricao": "Event description",
  "latitude": -22.9068,
  "longitude": -43.1729
}
```

## Mock Servers

Mock servers are provided to simulate external servers sending events. See [mock-servers/README.md](mock-servers/README.md) for details.

**Important:** The mock servers require the SSR server to be running on port 4000. The API endpoints are only available when running the SSR server, not during development with `ng serve`.

### Running with Mock Servers

1. **Build and start the SSR server:**
   ```bash
   npm run build
   npm run serve:ssr:eventos-mapa
   ```
   The server will start on `http://localhost:4000`

2. **In separate terminals, start the mock servers:**
   ```bash
   # Terminal 2 - Army server
   npm run mock:army

   # Terminal 3 - PMERJ server
   npm run mock:pmerj
   ```

3. **Open your browser:**
   Navigate to `http://localhost:4000/mapa` to see events appearing in real-time.

The mock servers will send events every 2-3 seconds. You should see events appearing on the map automatically.

## Configuration

You can configure the server IP addresses through the web interface:
1. Navigate to the Configuration page (click "⚙️ Configuração" in the map view)
2. Enter the IP addresses for Army and PMERJ servers
3. Click "Salvar Configuração"

The configuration is saved to `server-config.json` and persists across server restarts.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
