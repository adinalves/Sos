// src/app/features/mapa/mapa.component.ts
import {
  AfterViewInit,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type * as LType from 'leaflet';

// Conditional import - only import Leaflet in browser
let L: any = null;

async function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Leaflet can only be loaded in browser');
  }
  
  if (L) {
    return L; // Already loaded
  }
  
  // Use dynamic import with explicit handling
  const leafletModule: any = await import('leaflet');
  
  // Debug: log the module structure
  console.log('Leaflet module:', leafletModule);
  console.log('Module keys:', Object.keys(leafletModule));
  console.log('Has default:', !!leafletModule.default);
  console.log('Default type:', typeof leafletModule.default);
  if (leafletModule.default) {
    console.log('Default keys:', Object.keys(leafletModule.default));
    console.log('Default has map:', typeof leafletModule.default.map);
  }
  console.log('Module has map:', typeof leafletModule.map);
  console.log('Module type:', typeof leafletModule);
  
  // Try to get Leaflet namespace
  // Leaflet 1.9.4 exports as a namespace, so we need to access it correctly
  if (leafletModule && typeof leafletModule.map === 'function') {
    L = leafletModule;
    console.log('Using leafletModule directly');
  } else if (leafletModule.default) {
    // Check if default is the Leaflet object or a wrapper
    if (typeof leafletModule.default.map === 'function') {
      L = leafletModule.default;
      console.log('Using leafletModule.default');
    } else if (leafletModule.default.default && typeof leafletModule.default.default.map === 'function') {
      L = leafletModule.default.default;
      console.log('Using leafletModule.default.default');
    } else {
      // Try to find map in default's properties
      for (const key in leafletModule.default) {
        const value = leafletModule.default[key];
        if (value && typeof value === 'object' && typeof value.map === 'function') {
          L = value;
          console.log('Found Leaflet in default at key:', key);
          break;
        }
      }
    }
  } else if (leafletModule.leaflet && typeof leafletModule.leaflet.map === 'function') {
    L = leafletModule.leaflet;
    console.log('Using leafletModule.leaflet');
  } else {
    // Last resort: try to find any property with map function
    for (const key in leafletModule) {
      const value = leafletModule[key];
      if (value && typeof value === 'object' && typeof value.map === 'function') {
        L = value;
        console.log('Found Leaflet at key:', key);
        break;
      }
    }
  }
  
  if (!L || typeof L.map !== 'function') {
    console.error('Failed to extract Leaflet from module');
    console.error('Available properties:', Object.keys(leafletModule));
    if (leafletModule.default) {
      console.error('Default properties:', Object.keys(leafletModule.default));
    }
    throw new Error('Leaflet module structure is invalid');
  }
  
  console.log('Leaflet loaded successfully, L.map is a function');
  return L;
}
import { EventoService } from '../eventos/evento.service';
import { Evento, Forca } from '../eventos/evento.model';

interface MapEvento extends Evento {
  forca: Forca;
  ts: number;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <div class="wrap">
      <header class="topbar">
        <div class="title">🗺️ 🛡️ Sistema Integrador </div>
        <div class="actions">
          <a routerLink="/config" class="btn-config">⚙️ Configuração</a>
          <button (click)="clearAll()">Limpar</button>
        </div>
      </header>

      <!-- Sidebar de eventos -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <strong>Eventos ({{ events.length }})</strong>
          <div class="legend-mini">
            <span class="dot pm"></span> PMERJ
            <span class="dot eb"></span> EB
          </div>
        </div>

        <ul class="event-list">
          <li *ngFor="let e of events; trackBy: trackById" (click)="goTo(e)" title="Centralizar e abrir popup">
            <span class="dot" [class.pm]="e.forca==='PMERJ'" [class.eb]="e.forca==='EB'"></span>
            <div class="info">
              <div class="top">
                <b>{{ e.nome }}</b>
                <small class="tag" [class.pm]="e.forca==='PMERJ'" [class.eb]="e.forca==='EB'">{{ e.forca }}</small>
              </div>
              <div class="desc">{{ e.descricao }}</div>
              <div class="meta">
                <small>{{ e.latitude.toFixed(5) }}, {{ e.longitude.toFixed(5) }}</small>
                <small>•</small>
                <small>{{ e.ts | date:'short' }}</small>
              </div>
            </div>
          </li>
        </ul>
      </aside>

      <div id="map" class="map"></div>
    </div>
  `,
  styles: [`
    .wrap { position:relative; display:flex; flex-direction:column; height:100vh; }
    .topbar {
      background:#0f172a; color:#fff; padding:10px 14px;
      display:flex; align-items:center; justify-content:space-between; gap:12px;
    }
    .title { font-weight:700; }
    .actions { display:flex; align-items:center; gap:8px; }
    .actions button, .actions a { margin-left:8px; padding:6px 10px; border-radius:8px; border:0; cursor:pointer; text-decoration:none; color:#fff; background:#475569; }
    .actions button:hover, .actions a:hover { background:#64748b; }
    .actions button:disabled { opacity:.6; cursor:not-allowed; }
    .btn-config { display:inline-block; }

    .map { flex:1 1 auto; width:100%; }

    /* Sidebar fixa à esquerda */
    .sidebar {
      position:absolute; left:12px; top:70px; bottom:12px; width:320px;
      background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.15);
      z-index:2000; display:flex; flex-direction:column; overflow:hidden; pointer-events:auto;
    }
    .sidebar-header {
      padding:10px 12px; border-bottom:1px solid #eef1f4;
      display:flex; align-items:center; justify-content:space-between;
    }
    .legend-mini { display:flex; gap:10px; align-items:center; font-size:12px; color:#334155; }
    .dot { width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:8px; flex:0 0 auto; background:#94a3b8; }
    .dot.pm { background:#1565c0; }
    .dot.eb { background:#2e7d32; }

    .event-list { list-style:none; margin:0; padding:0; overflow:auto; flex:1; }
    .event-list li {
      display:flex; gap:8px; align-items:flex-start; padding:10px 12px;
      border-bottom:1px solid #f1f5f9; cursor:pointer;
    }
    .event-list li:hover { background:#f8fafc; }
    .info { display:flex; flex-direction:column; gap:2px; min-width:0; }
    .top { display:flex; align-items:center; gap:8px; }
    .top b { font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:170px; }
    .tag { font-size:11px; padding:2px 6px; border-radius:999px; background:#e2e8f0; color:#0f172a; }
    .tag.pm { background:rgba(21,101,192,.12); color:#0b3a7a; }
    .tag.eb { background:rgba(46,125,50,.12); color:#1f5f25; }
    .desc { color:#334155; font-size:12px; }
    .meta { color:#64748b; font-size:11px; display:flex; gap:6px; }

    /* Empurrar controles do Leaflet para a direita da sidebar */
    :host ::ng-deep .leaflet-top.leaflet-left { margin-left: 340px; }

    /* Responsivo: esconde sidebar em telas menores e reseta margem dos controles */
    @media (max-width: 700px) {
      .sidebar { display:none; }
      :host ::ng-deep .leaflet-top.leaflet-left { margin-left: 0; }
    }
  `]
})
export class MapaComponent implements AfterViewInit, OnDestroy, OnInit {
  private L: any = null;
  private map!: LType.Map;
  private pmLayer!: LType.LayerGroup;
  private ebLayer!: LType.LayerGroup;
  private legend!: LType.Control;

  private readonly center: [number, number] = [-22.9068, -43.1729]; // Rio de Janeiro

  // lista exibida na sidebar + índice de marcador por id
  events: MapEvento[] = [];
  private markerById = new Map<string, LType.Layer>();
  private eventSubscription: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private eventoService: EventoService
  ) {}


  ngOnInit() {
    // Only subscribe to events in browser, not during SSR
    if (isPlatformBrowser(this.platformId)) {
      console.log('MapaComponent.ngOnInit: Browser detected, will subscribe to events');
      // Use setTimeout to ensure this runs after hydration
      setTimeout(() => {
        console.log('MapaComponent: Subscribing to eventos...');
        this.eventSubscription = this.eventoService.list().subscribe({
          next: (events) => {
            console.log('MapaComponent: Received events from service:', events.length, events);
            if (events.length === 0) {
              console.warn('MapaComponent: Received empty events array');
            }
            // Filter events that have required fields for map display
            // Events need: forca, latitude, longitude, and optionally ts
            const filtered = events.filter(e => {
              const hasRequired = e.forca && 
                                 typeof e.latitude === 'number' && 
                                 typeof e.longitude === 'number';
              if (!hasRequired) {
                console.warn('Event filtered out (missing required fields):', e);
              }
              return hasRequired;
            }).map(e => ({
              ...e,
              ts: e.ts || Date.now() // Use current time if ts is missing
            })) as MapEvento[];
            console.log('MapaComponent: Filtered events:', filtered.length, 'out of', events.length);
            this.updateEvents(filtered);
          },
          error: (error) => {
            console.error('MapaComponent: Error in eventos subscription:', error);
          },
          complete: () => {
            console.log('MapaComponent: Subscription completed');
          }
        });
      }, 100); // Increased timeout to ensure everything is ready
    } else {
      console.log('MapaComponent.ngOnInit: SSR mode, skipping subscription');
    }
  }

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify map container exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map container element not found');
      return;
    }

    try {
      this.L = await loadLeaflet();
      
      // Final validation
      if (!this.L) {
        console.error('Leaflet is null');
        return;
      }
      
      if (typeof this.L.map !== 'function') {
        console.error('L.map is not a function. L object:', this.L);
        console.error('L type:', typeof this.L);
        console.error('L keys:', this.L ? Object.keys(this.L) : 'null');
        return;
      }
      
      console.log('Leaflet loaded successfully, L.map is a function');
    } catch (error) {
      console.error('Failed to load Leaflet:', error);
      return;
    }

    // Note: We use circleMarker instead of default markers, so icon configuration is not needed
    // If you need to use default markers in the future, uncomment and configure:
    // this.L.Icon.Default.mergeOptions({
    //   iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    //   iconUrl: '/leaflet/marker-icon.png',
    //   shadowUrl: '/leaflet/marker-shadow.png'
    // });

    // Mapa
    this.map = this.L.map('map', { center: this.center, zoom: 12, zoomControl: true });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© Sistema Integrador'
    }).addTo(this.map);

    // Camadas
    this.pmLayer = this.L.layerGroup().addTo(this.map);
    this.ebLayer = this.L.layerGroup().addTo(this.map);

    const controlLayers = this.L.control.layers(
      {},
      { 'PMERJ': this.pmLayer, 'Exército Brasileiro': this.ebLayer },
      { collapsed: false }
    );
    controlLayers.addTo(this.map);

    // Legenda
    this.addLegend();
    
    console.log('Map fully initialized. pmLayer:', !!this.pmLayer, 'ebLayer:', !!this.ebLayer);
    
    // If we already have events stored (from before map was ready), add them now
    if (this.events.length > 0) {
      console.log('Map initialized, adding', this.events.length, 'stored events to map');
      // Use updateEvents to properly add all events
      this.updateEvents(this.events);
    } else {
      console.log('No events stored yet, will be added when received from service');
    }
  }

  ngOnDestroy() {
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
  }

  clearAll() {
    this.pmLayer.clearLayers();
    this.ebLayer.clearLayers();
    this.markerById.clear();
    this.events = [];
  }

  // Update events from service
  private updateEvents(newEvents: MapEvento[]) {
    console.log('updateEvents called with', newEvents.length, 'events');
    console.log('L exists:', !!this.L, 'map exists:', !!this.map);
    console.log('pmLayer exists:', !!this.pmLayer, 'ebLayer exists:', !!this.ebLayer);
    
    // Always update the events list for the sidebar, even if map is not ready
    this.events = [...newEvents].sort((a, b) => b.ts - a.ts).slice(0, 200);
    console.log('Events list updated for sidebar, total:', this.events.length);
    
    if (!this.L || !this.map) {
      console.warn('Cannot add events to map: L or map not initialized. Events stored for later.');
      return;
    }

    if (!this.pmLayer || !this.ebLayer) {
      console.warn('Cannot add events to map: layers not initialized. Events stored for later.');
      return;
    }

    // Create a set of existing event IDs from markers already on map
    const existingIds = new Set(Array.from(this.markerById.keys()));
    
    // Find new events that need to be added
    const eventsToAdd = newEvents.filter(e => !existingIds.has(e.id));
    console.log('Existing markers on map:', existingIds.size);
    console.log('New events to add:', eventsToAdd.length, eventsToAdd);
    
    // Remove markers for events that no longer exist
    const currentIds = new Set(newEvents.map(e => e.id));
    const eventsToRemove: string[] = [];
    this.markerById.forEach((marker, eventId) => {
      if (!currentIds.has(eventId)) {
        eventsToRemove.push(eventId);
      }
    });
    
    eventsToRemove.forEach(eventId => {
      const marker = this.markerById.get(eventId);
      if (marker) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
          if (event.forca === 'PMERJ') {
            this.pmLayer.removeLayer(marker);
          } else {
            this.ebLayer.removeLayer(marker);
          }
        }
        this.markerById.delete(eventId);
        console.log('Removed marker for event:', eventId);
      }
    });

    // Add new events to the map
    console.log('Adding', eventsToAdd.length, 'new events to map');
    eventsToAdd.forEach(event => {
      console.log('Adding event to map:', event.id, event.nome, event.forca, [event.latitude, event.longitude]);
      this.addEventToMap(event);
    });
    
    // Log total markers after update
    console.log('Total markers on map after update:', this.markerById.size);
  }

  // Add a single event to the map
  private addEventToMap(event: MapEvento) {
    if (!this.L || !this.map) {
      console.warn('Cannot add event to map: L or map not initialized');
      return;
    }

    if (!this.pmLayer || !this.ebLayer) {
      console.warn('Cannot add event to map: layers not initialized');
      return;
    }

    try {
      const color = event.forca === 'PMERJ' ? '#1565c0' : '#2e7d32';
      const position: [number, number] = [event.latitude, event.longitude];
      
      console.log('Creating circleMarker at:', position, 'with color:', color);
      
      const marker = this.L.circleMarker(position, {
        radius: 7,
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.85
      });
      
      marker.bindPopup(
        `<b>${event.forca}</b><br>${event.nome}<br>${event.descricao}<br><small>${new Date(event.ts).toLocaleString()}</small>`
      );

      const targetLayer = event.forca === 'PMERJ' ? this.pmLayer : this.ebLayer;
      marker.addTo(targetLayer);
      this.markerById.set(event.id, marker);
      
      console.log('Marker added successfully to', event.forca, 'layer. Total markers:', this.markerById.size);
      
      // Verify marker is actually on the map
      if (targetLayer.hasLayer(marker)) {
        console.log('Marker confirmed on layer');
        // Get marker bounds and ensure map view includes it
        const bounds = marker.getBounds ? marker.getBounds() : null;
        if (bounds) {
          console.log('Marker bounds:', bounds);
        }
      } else {
        console.error('Marker was not added to layer!');
      }
      
      // Force map to invalidate size in case of rendering issues
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error adding event to map:', error, event);
    }
  }

  // clicar no item da sidebar → centraliza e abre popup
  goTo(e: MapEvento) {
    if (!this.map) return;
    this.map.flyTo([e.latitude, e.longitude], Math.max(this.map.getZoom(), 14), { duration: 0.8 });
    const layer = this.markerById.get(e.id);
    if (layer && 'openPopup' in (layer as any)) {
      (layer as any).openPopup();
    }
  }

  trackById(_: number, e: MapEvento) { return e.id; }


  // legenda customizada
  private addLegend() {
    this.legend = (this.L.control as any)({ position: 'bottomright' });
    (this.legend as any).onAdd = () => {
      const div = this.L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <div style="background:#fff; padding:8px 10px; border-radius:10px;
          box-shadow:0 6px 20px rgba(0,0,0,.15); font:12px/1.2 system-ui;">
          <div style="font-weight:700; margin-bottom:6px;">Legenda</div>
          <div style="display:flex; align-items:center; gap:6px; margin:4px 0;">
            <span style="width:12px; height:12px; border-radius:50%; background:#1565c0;"></span>
            <span>PMERJ</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px; margin:4px 0;">
            <span style="width:12px; height:12px; border-radius:50%; background:#2e7d32;"></span>
            <span>Exército Brasileiro</span>
          </div>
        </div>`;
      return div;
    };
    this.legend.addTo(this.map);
  }
}
