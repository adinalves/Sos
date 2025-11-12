import { Injectable, Inject, Optional, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MapeamentoConfig, DEFAULT_MAPPING } from './mapeamento.model';

@Injectable({
  providedIn: 'root'
})
export class MapeamentoService {
  private apiUrl = '/api/mapeamento';
  private http?: HttpClient;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() private httpClient: HttpClient | null,
    private injector: Injector
  ) {
    // Try to use injected HttpClient if available
    if (this.httpClient) {
      this.http = this.httpClient;
      console.log('[SERVICE] MapeamentoService: HttpClient injected via constructor');
    }
  }

  private getHttpClient(): HttpClient | null {
    // If we already have it, return it
    if (this.http) {
      return this.http;
    }
    
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    
    // Try to get from injector - use null as default to avoid throwing
    try {
      const httpClient = this.injector.get(HttpClient, null);
      if (httpClient) {
        this.http = httpClient;
        console.log('[SERVICE] MapeamentoService: HttpClient obtained via injector');
        return this.http;
      } else {
        console.warn('[SERVICE] MapeamentoService: HttpClient not found in injector (returned null)');
        return null;
      }
    } catch (e: any) {
      console.warn('[SERVICE] MapeamentoService: Error getting HttpClient from injector:', e?.message || e);
      return null;
    }
  }

  getMapeamento(): Observable<MapeamentoConfig> {
    console.log('[SERVICE] getMapeamento() called');
    console.log('[SERVICE] API URL:', this.apiUrl);
    
    const http = this.getHttpClient();
    console.log('[SERVICE] HttpClient available?', http !== null);
    
    if (http) {
      console.log('[SERVICE] Using HttpClient to fetch mapeamento');
      return http.get<MapeamentoConfig>(this.apiUrl).pipe(
        tap({
          next: (config) => {
            console.log('[SERVICE] ✓ GET request successful, response:', config);
            console.log('[SERVICE] Army allowedIp in response:', config.army?.security?.allowedIp);
            console.log('[SERVICE] PMERJ allowedIp in response:', config.pmerj?.security?.allowedIp);
          },
          error: (error) => {
            console.error('[SERVICE] ✗ GET request failed:', error);
          }
        })
      );
    }
    
    // Fallback to fetch if HttpClient is not available
    console.warn('[SERVICE] HttpClient not available, using fetch directly');
    return new Observable(observer => {
      fetch(this.apiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('[SERVICE] ✓ Fetch GET request successful, response:', data);
          console.log('[SERVICE] Army allowedIp in response:', data.army?.security?.allowedIp);
          console.log('[SERVICE] PMERJ allowedIp in response:', data.pmerj?.security?.allowedIp);
          observer.next(data);
          observer.complete();
        })
        .catch(error => {
          console.error('[SERVICE] ✗ Fetch GET request failed:', error);
          console.log('[SERVICE] Returning default mapping');
          observer.next({ ...DEFAULT_MAPPING });
          observer.complete();
        });
    });
  }

  updateMapeamento(config: MapeamentoConfig): Observable<MapeamentoConfig> {
    console.log('[SERVICE] updateMapeamento() called');
    console.log('[SERVICE] Config to send:', JSON.stringify(config, null, 2));
    console.log('[SERVICE] API URL:', this.apiUrl);
    
    const http = this.getHttpClient();
    console.log('[SERVICE] HttpClient available?', http !== null);
    console.log('[SERVICE] Is browser?', typeof window !== 'undefined');
    
    if (http) {
      console.log('[SERVICE] Using HttpClient to send POST request');
      const observable = http.post<MapeamentoConfig>(this.apiUrl, config);
      
      // Use tap operator to log without subscribing (to avoid double subscription)
      return observable.pipe(
        tap({
          next: (response) => {
            console.log('[SERVICE] ✓ POST request successful, response:', response);
          },
          error: (error) => {
            console.error('[SERVICE] ✗ POST request failed:', error);
            console.error('[SERVICE] Error details:', JSON.stringify(error, null, 2));
          }
        })
      );
    }
    
    // Fallback to fetch if HttpClient is not available
    console.warn('[SERVICE] HttpClient not available, using fetch directly');
    return new Observable(observer => {
      fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[SERVICE] ✓ Fetch POST request successful, response:', data);
        observer.next(data);
        observer.complete();
      })
      .catch(error => {
        console.error('[SERVICE] ✗ Fetch POST request failed:', error);
        observer.error(error);
      });
    });
  }

  getDefaultMapping(): MapeamentoConfig {
    return { ...DEFAULT_MAPPING };
  }
}

