import { Injectable, Inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ServerConfig {
  ipArmy: string;
  ipPMERJ: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private apiUrl = '/api/config';
  private _config$ = new BehaviorSubject<ServerConfig>({ ipArmy: 'ip_army', ipPMERJ: 'ip_pmerj' });
  private configLoaded = false;
  private http?: HttpClient;

  constructor(
    private injector: Injector,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Don't inject HttpClient in constructor to avoid SSR issues
  }

  private getHttpClient(): HttpClient | null {
    if (!this.http && isPlatformBrowser(this.platformId)) {
      try {
        this.http = this.injector.get(HttpClient);
      } catch (e) {
        console.warn('HttpClient not available');
        return null;
      }
    }
    return this.http || null;
  }

  private loadConfig(): void {
    if (!isPlatformBrowser(this.platformId) || this.configLoaded) return;
    
    const http = this.getHttpClient();
    if (!http) return;
    
    this.configLoaded = true;
    http.get<ServerConfig>(this.apiUrl).subscribe({
      next: (config) => this._config$.next(config),
      error: (error) => {
        if (isPlatformBrowser(this.platformId)) {
          console.error('Error loading config:', error);
        }
      }
    });
  }

  getConfig(): Observable<ServerConfig> {
    // Lazy initialization - load config when first requested
    this.loadConfig();
    return this._config$.asObservable();
  }

  updateConfig(config: Partial<ServerConfig>): Observable<ServerConfig> {
    return new Observable(observer => {
      const http = this.getHttpClient();
      if (!http) {
        observer.error(new Error('HttpClient not available'));
        return;
      }
      
      http.post<ServerConfig>(this.apiUrl, config).subscribe({
        next: (updatedConfig) => {
          this._config$.next(updatedConfig);
          observer.next(updatedConfig);
          observer.complete();
        },
        error: (error) => {
          console.error('Error updating config:', error);
          observer.error(error);
        }
      });
    });
  }
}
