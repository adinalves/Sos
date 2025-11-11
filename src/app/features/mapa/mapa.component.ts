// src/app/features/mapa/mapa.component.ts
import {
  AfterViewInit,
  Component,
  Inject,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser, DatePipe } from '@angular/common';
import type * as LType from 'leaflet';

type Forca = 'PMERJ' | 'EB';

interface Evento {
  id: string;
  forca: Forca;
  nome: string;
  descricao: string;
  latitude: number;
  longitude: number;
  ts: number;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="wrap">
      <header class="topbar">
        <div class="title">🗺️ 🛡️ Sistema Integrador </div>
        <div class="actions">
          <button (click)="start()" [disabled]="running">Iniciar</button>
          <button (click)="stop()" [disabled]="!running">Parar</button>
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
    .actions button { margin-left:8px; padding:6px 10px; border-radius:8px; border:0; cursor:pointer; }
    .actions button:disabled { opacity:.6; cursor:not-allowed; }

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
export class MapaComponent implements AfterViewInit, OnDestroy {
  private L!: typeof LType;
  private map!: LType.Map;
  private pmLayer!: LType.LayerGroup;
  private ebLayer!: LType.LayerGroup;
  private legend!: LType.Control;
  private timerId: any = null;
  running = false;

  private readonly center: [number, number] = [-22.9068, -43.1729]; // Rio de Janeiro

  // lista exibida na sidebar + índice de marcador por id
  events: Evento[] = [];
  private markerById = new Map<string, LType.Layer>();

  // polígono aproximado do Rio (lng, lat) — evita pontos no mar
  private rioPolygon: [number, number][] = [
    [-43.7965, -22.9212],
    [-43.7700, -22.9920],
    [-43.7150, -23.0230],
    [-43.5100, -23.0300],
    [-43.1400, -22.9800],
    [-43.1200, -22.9000],
    [-43.1800, -22.8200],
    [-43.3300, -22.7700],
    [-43.6000, -22.7700],
    [-43.7965, -22.9212]
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.L = await import('leaflet');

    // Ícones padrão do Leaflet (se você usar Marker padrão)
    const iconRetinaUrl = (await import('leaflet/dist/images/marker-icon-2x.png?url')).default;
    const iconUrl       = (await import('leaflet/dist/images/marker-icon.png?url')).default;
    const shadowUrl     = (await import('leaflet/dist/images/marker-shadow.png?url')).default;
    this.L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

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

    // Inicia simulação
    this.start();
  }

  ngOnDestroy() { this.stop(); }

  // controles
  start() {
    if (this.running) return;
    this.running = true;

    for (let i = 0; i < 5; i++) this.addRandomPoint();
    this.timerId = setInterval(() => this.addRandomPoint(), 1500);
  }

  stop() {
    this.running = false;
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
  }

  clearAll() {
    this.pmLayer.clearLayers();
    this.ebLayer.clearLayers();
    this.markerById.clear();
    this.events = [];
  }

  // cria ponto e atualiza lista
  private addRandomPoint() {
    const forca: Forca = Math.random() < 0.5 ? 'PMERJ' : 'EB';
    const e = this.fakeEvento(forca);

    const color = forca === 'PMERJ' ? '#1565c0' : '#2e7d32';
    const marker = this.L.circleMarker([e.latitude, e.longitude], {
      radius: 7, color, weight: 2, fillColor: color, fillOpacity: 0.85
    }).bindPopup(
      `<b>${e.forca}</b><br>${e.nome}<br>${e.descricao}<br><small>${new Date(e.ts).toLocaleString()}</small>`
    );

    if (forca === 'PMERJ') marker.addTo(this.pmLayer); else marker.addTo(this.ebLayer);
    this.markerById.set(e.id, marker);

    // reatribui para disparar CD e mantém máx. 200
    this.events = [e, ...this.events].slice(0, 200);
  }

  // clicar no item da sidebar → centraliza e abre popup
  goTo(e: Evento) {
    this.map.flyTo([e.latitude, e.longitude], Math.max(this.map.getZoom(), 14), { duration: 0.8 });
    const layer = this.markerById.get(e.id);
    if (layer && 'openPopup' in (layer as any)) {
      (layer as any).openPopup();
    }
  }

  trackById(_: number, e: Evento) { return e.id; }

  // geração fake, garantindo cair dentro do polígono (terra) com descrições realistas
  private fakeEvento(forca: Forca): Evento {
    let lat: number, lng: number;
    do {
      const [lat0, lng0] = this.center;
      lat = lat0 + (Math.random() - 0.5) * 0.35;
      lng = lng0 + (Math.random() - 0.5) * 0.35;
    } while (!this.isInsidePolygon(lat, lng));

    const nomesPM = [
      'Patrulhamento de rotina',
      'Ocorrência em andamento',
      'Fiscalização de trânsito',
      'Abordagem de suspeitos',
      'Operação de bloqueio',
      'Ronda escolar',
      'Monitoramento de aglomeração',
      'Suporte a evento público'
    ];
    const descricoesPM = [
      'Equipe da PMERJ realiza patrulhamento preventivo na região, com foco em dissuadir práticas criminosas.',
      'Policiamento ostensivo em resposta a denúncia de atividade suspeita.',
      'Fiscalização de veículos e motocicletas para coibir infrações e identificar irregularidades.',
      'Abordagem de indivíduos em atitude suspeita para verificação de antecedentes.',
      'Operação de bloqueio viário com revista aleatória de veículos.',
      'Ronda escolar garantindo segurança no entorno de instituição de ensino.',
      'Monitoramento de pontos de aglomeração para manter a ordem pública.',
      'Atuação preventiva em apoio à realização de evento público.'
    ];

    const nomesEB = [
      'Ponto de observação',
      'Patrulha motorizada',
      'Posto de apoio avançado',
      'Comboio logístico',
      'Operação conjunta',
      'Reconhecimento de área',
      'Ponto de controle de acesso',
      'Deslocamento tático'
    ];
    const descricoesEB = [
      'Unidade do EB estabelece ponto de observação estratégico para monitoramento da área.',
      'Patrulha motorizada realiza deslocamento para presença dissuasória em áreas sensíveis.',
      'Posto de apoio avançado montado para suporte logístico às tropas em operação.',
      'Comboio logístico em trânsito com suprimentos para base operacional.',
      'Ação coordenada com forças de segurança locais em operação conjunta.',
      'Reconhecimento tático de terreno urbano para futura operação.',
      'Ponto de controle instalado para fiscalização de entrada e saída de veículos.',
      'Deslocamento de frações em formação tática para reforço de posição avançada.'
    ];

    let nome: string;
    let descricao: string;

    if (forca === 'PMERJ') {
      const idx = Math.floor(Math.random() * nomesPM.length);
      nome = nomesPM[idx];
      descricao = descricoesPM[idx];
    } else {
      const idx = Math.floor(Math.random() * nomesEB.length);
      nome = nomesEB[idx];
      descricao = descricoesEB[idx];
    }

    return { id: crypto.randomUUID(), forca, nome, descricao, latitude: lat, longitude: lng, ts: Date.now() };
  }

  // point-in-polygon (ray casting)
  private isInsidePolygon(lat: number, lng: number): boolean {
    let inside = false;
    const x = lng, y = lat, poly = this.rioPolygon;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

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
