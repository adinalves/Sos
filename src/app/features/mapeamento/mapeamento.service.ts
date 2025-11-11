import { Injectable, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { MapeamentoConfig, DEFAULT_MAPPING } from './mapeamento.model';

@Injectable({
  providedIn: 'root'
})
export class MapeamentoService {
  private apiUrl = '/api/mapeamento';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() private http: HttpClient | null
  ) {}

  private getHttpClient(): HttpClient | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return this.http;
  }

  getMapeamento(): Observable<MapeamentoConfig> {
    const http = this.getHttpClient();
    if (!http) {
      // Return default mapping if not in browser
      return of({ ...DEFAULT_MAPPING });
    }
    return http.get<MapeamentoConfig>(this.apiUrl);
  }

  updateMapeamento(config: MapeamentoConfig): Observable<MapeamentoConfig> {
    const http = this.getHttpClient();
    if (!http) {
      // Return the config as-is if not in browser (shouldn't happen, but safe fallback)
      return of(config);
    }
    return http.post<MapeamentoConfig>(this.apiUrl, config);
  }

  getDefaultMapping(): MapeamentoConfig {
    return { ...DEFAULT_MAPPING };
  }
}

