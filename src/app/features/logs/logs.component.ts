import { Component, OnInit, OnDestroy, inject, Inject, Optional, PLATFORM_ID, Injector } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, Subscription, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success';
  source: 'server' | 'army' | 'pmerj';
  message: string;
}

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <header class="header">
        <h1>📋 Logs do Sistema</h1>
      </header>

      <div class="controls">
        <div class="filter-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filters.server" 
              (change)="applyFilters()"
            />
            <span>Servidor Principal</span>
          </label>
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filters.army" 
              (change)="applyFilters()"
            />
            <span>ARMY Mock</span>
          </label>
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filters.pmerj" 
              (change)="applyFilters()"
            />
            <span>PMERJ Mock</span>
          </label>
        </div>
        <div class="action-group">
          <button (click)="clearLogs()" class="btn btn-secondary">Limpar Logs</button>
          <button (click)="toggleAutoRefresh()" [class.active]="autoRefresh" class="btn btn-primary">
            {{ autoRefresh ? '⏸️ Pausar' : '▶️ Retomar' }}
          </button>
          <button (click)="cancel()" class="btn btn-secondary">Voltar</button>
        </div>
      </div>

      <div class="logs-container">
        <div *ngIf="filteredLogs.length === 0" class="empty-state">
          <p>Nenhum log disponível. Aguardando logs...</p>
        </div>
        <div *ngFor="let log of filteredLogs" [class]="'log-entry log-' + log.level + ' log-' + log.source">
          <span class="log-timestamp">{{ log.timestamp }}</span>
          <span class="log-source">{{ getSourceLabel(log.source) }}</span>
          <span class="log-level">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 2.5rem;
      margin: 0 0 10px 0;
      font-weight: 700;
    }

    .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      margin: 0;
    }

    .controls {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }

    .filter-group {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .filter-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 500;
      color: #0f172a;
    }

    .filter-group input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .action-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-primary.active {
      background: #10b981;
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #0f172a;
    }

    .btn-secondary:hover {
      background: #cbd5e1;
    }

    .logs-container {
      background: #1e293b;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      max-height: 70vh;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #94a3b8;
    }

    .log-entry {
      display: grid;
      grid-template-columns: 150px 100px 80px 1fr;
      gap: 15px;
      padding: 8px 12px;
      margin-bottom: 4px;
      border-left: 4px solid;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .log-entry:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .log-server {
      border-left-color: #3b82f6;
    }

    .log-army {
      border-left-color: #f59e0b;
    }

    .log-pmerj {
      border-left-color: #10b981;
    }

    .log-info {
      color: #94a3b8;
    }

    .log-success {
      color: #10b981;
    }

    .log-warn {
      color: #f59e0b;
    }

    .log-error {
      color: #ef4444;
    }

    .log-timestamp {
      color: #64748b;
      font-size: 0.85rem;
    }

    .log-source {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
    }

    .log-server .log-source {
      color: #3b82f6;
    }

    .log-army .log-source {
      color: #f59e0b;
    }

    .log-pmerj .log-source {
      color: #10b981;
    }

    .log-level {
      font-weight: 600;
      font-size: 0.8rem;
    }

    .log-message {
      color: #e2e8f0;
      word-break: break-word;
    }

    @media (max-width: 768px) {
      .log-entry {
        grid-template-columns: 1fr;
        gap: 4px;
      }

      .log-timestamp,
      .log-source,
      .log-level {
        font-size: 0.75rem;
      }
    }
  `]
})
export class LogsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private http?: HttpClient;
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() private httpClient: HttpClient | null,
    private injector: Injector
  ) {
    // Try to use injected HttpClient if available
    if (this.httpClient) {
      this.http = this.httpClient;
    }
  }

  logs: LogEntry[] = [];
  filteredLogs: LogEntry[] = [];
  autoRefresh = true;
  private refreshSubscription?: Subscription;

  filters = {
    server: true,
    army: true,
    pmerj: true
  };

  ngOnInit() {
    this.loadLogs();
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  loadLogs() {
    // Load logs from all sources
    this.loadServerLogs();
    this.loadArmyLogs();
    this.loadPmerjLogs();
  }

  private getHttpClient(): HttpClient | null {
    // If we already have it, return it
    if (this.http) {
      return this.http;
    }
    
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    
    // Try to use injected HttpClient if available
    if (this.httpClient) {
      this.http = this.httpClient;
      return this.http;
    }
    
    // Try to get from injector
    try {
      const httpClient = this.injector.get(HttpClient, null);
      if (httpClient) {
        this.http = httpClient;
        return this.http;
      }
    } catch (e: any) {
      // HttpClient not available
    }
    
    return null;
  }

  loadServerLogs() {
    const http = this.getHttpClient();
    if (!http) {
      // Fallback to fetch
      fetch('/api/logs')
        .then(res => res.json())
        .then(logs => {
          this.addLogs(logs, 'server');
          this.applyFilters();
        })
        .catch(() => {});
      return;
    }
    
    http.get<string[]>('/api/logs').pipe(
      catchError(() => of([]))
    ).subscribe(logs => {
      this.addLogs(logs, 'server');
      this.applyFilters();
    });
  }

  loadArmyLogs() {
    const http = this.getHttpClient();
    if (!http) {
      // Fallback to fetch
      fetch('http://localhost:3001/api/logs')
        .then(res => res.json())
        .then(logs => {
          this.addLogs(logs, 'army');
          this.applyFilters();
        })
        .catch(() => {});
      return;
    }
    
    http.get<string[]>('http://localhost:3001/api/logs').pipe(
      catchError(() => of([]))
    ).subscribe(logs => {
      this.addLogs(logs, 'army');
      this.applyFilters();
    });
  }

  loadPmerjLogs() {
    const http = this.getHttpClient();
    if (!http) {
      // Fallback to fetch
      fetch('http://localhost:3002/api/logs')
        .then(res => res.json())
        .then(logs => {
          this.addLogs(logs, 'pmerj');
          this.applyFilters();
        })
        .catch(() => {});
      return;
    }
    
    http.get<string[]>('http://localhost:3002/api/logs').pipe(
      catchError(() => of([]))
    ).subscribe(logs => {
      this.addLogs(logs, 'pmerj');
      this.applyFilters();
    });
  }

  addLogs(logLines: string[], source: 'server' | 'army' | 'pmerj') {
    const newLogs: LogEntry[] = logLines.map(line => {
      const level = this.parseLogLevel(line);
      return {
        timestamp: this.extractTimestamp(line) || new Date().toISOString(),
        level,
        source,
        message: line
      };
    });

    // Remove old logs from same source and add new ones
    this.logs = this.logs.filter(log => log.source !== source);
    this.logs.push(...newLogs);
    
    // Sort by timestamp (newest first)
    this.logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    // Keep only last 500 logs
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(0, 500);
    }
  }

  parseLogLevel(line: string): 'info' | 'error' | 'warn' | 'success' {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('✗') || lower.includes('failed')) {
      return 'error';
    }
    if (lower.includes('warn') || lower.includes('warning')) {
      return 'warn';
    }
    if (lower.includes('success') || lower.includes('✓') || lower.includes('completed')) {
      return 'success';
    }
    return 'info';
  }

  extractTimestamp(line: string): string | null {
    // Try to extract timestamp from log line
    const timestampMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (timestampMatch) {
      return timestampMatch[0];
    }
    return null;
  }

  applyFilters() {
    this.filteredLogs = this.logs.filter(log => {
      if (log.source === 'server' && !this.filters.server) return false;
      if (log.source === 'army' && !this.filters.army) return false;
      if (log.source === 'pmerj' && !this.filters.pmerj) return false;
      return true;
    });
  }

  clearLogs() {
    this.logs = [];
    this.filteredLogs = [];
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(2000).subscribe(() => {
      this.loadLogs();
    });
  }

  stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  getSourceLabel(source: string): string {
    const labels: { [key: string]: string } = {
      'server': 'SERVER',
      'army': 'ARMY',
      'pmerj': 'PMERJ'
    };
    return labels[source] || source.toUpperCase();
  }

  cancel() {
    this.router.navigateByUrl('/mapa');
  }
}

