import { Injectable, OnDestroy, Inject, PLATFORM_ID, Injector, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, interval, switchMap, Subscription } from 'rxjs';
import { Evento } from './evento.model';

@Injectable({ providedIn: 'root' })
export class EventoService implements OnDestroy {
  private _eventos$ = new BehaviorSubject<Evento[]>([]);
  private apiUrl = '/api/eventos';
  private pollSubscription?: Subscription;
  private initialized = false;
  private http?: HttpClient;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() private httpClient: HttpClient | null,
    private injector: Injector
  ) {
    // Try to use injected HttpClient if available
    if (this.httpClient) {
      this.http = this.httpClient;
      console.log('EventoService: HttpClient injected via constructor');
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
      // injector.get with null as default returns null if not found instead of throwing
      const httpClient = this.injector.get(HttpClient, null);
      if (httpClient) {
        this.http = httpClient;
        console.log('EventoService: HttpClient obtained via injector');
        return this.http;
      } else {
        console.warn('EventoService: HttpClient not found in injector (returned null)');
        return null;
      }
    } catch (e: any) {
      // If injector.get still throws, log and return null
      console.warn('EventoService: Error getting HttpClient from injector:', e?.message || e);
      return null;
    }
  }

  private ensureInitialized(): void {
    if (this.initialized) {
      console.log('EventoService already initialized');
      return;
    }
    
    if (!isPlatformBrowser(this.platformId)) {
      console.log('EventoService: Not in browser, skipping initialization');
      return;
    }
    
    const http = this.getHttpClient();
    const retryCount = ((this as any)._retryCount || 0) + 1;
    (this as any)._retryCount = retryCount;
    
    if (!http) {
      // If HttpClient is not available after 3 retries, use fetch directly
      if (retryCount <= 3) {
        console.warn(`EventoService: HttpClient not available yet (attempt ${retryCount}/3), will retry in 1000ms...`);
        // Retry after a delay to allow Angular to finish hydration
        if (!(this as any)._retrying) {
          (this as any)._retrying = true;
          setTimeout(() => {
            (this as any)._retrying = false;
            if (!this.initialized) {
              console.log('EventoService: Retrying initialization...');
              this.ensureInitialized();
            }
          }, 1000);
        }
        return;
      } else {
        // After 3 retries, use fetch directly
        console.warn('EventoService: HttpClient still not available after 3 retries, using fetch directly');
      }
    }
    
    console.log('EventoService: Initializing...');
    this.initialized = true;
    (this as any)._retryCount = 0; // Reset retry count

    // Load initial events
    this.loadEvents();
    
    // Poll for new events every 2 seconds
    this.pollSubscription = interval(2000).pipe(
      switchMap(() => {
        const httpClient = this.getHttpClient();
        if (httpClient) {
          console.log('Polling events from:', this.apiUrl);
          return httpClient.get<Evento[]>(this.apiUrl);
        } else {
          // Fallback to fetch if HttpClient is not available
          console.log('HttpClient not available, using fetch to poll events from:', this.apiUrl);
          return new Observable<Evento[]>(subscriber => {
            fetch(this.apiUrl)
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then((events: Evento[]) => {
                subscriber.next(events);
                subscriber.complete();
              })
              .catch(error => {
                if (isPlatformBrowser(this.platformId)) {
                  console.error('Error polling events via fetch:', error);
                }
                subscriber.next([]);
                subscriber.complete();
              });
          });
        }
      })
    ).subscribe({
      next: (events) => {
        console.log('Polled events:', events.length, events);
        this._eventos$.next(events);
      },
      error: (error) => {
        if (isPlatformBrowser(this.platformId)) {
          console.error('Error polling events:', error);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  private loadEvents(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const http = this.getHttpClient();
    if (http) {
      // Use HttpClient if available
      console.log('Loading events from:', this.apiUrl);
      http.get<Evento[]>(this.apiUrl).subscribe({
        next: (events) => {
          console.log('Loaded events from API:', events.length, events);
          if (events && events.length > 0) {
            console.log('First event sample:', events[0]);
          }
          this._eventos$.next(events);
          console.log('Events emitted to BehaviorSubject, current value:', this._eventos$.value.length);
        },
        error: (error) => {
          if (isPlatformBrowser(this.platformId)) {
            console.error('Error loading events:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
          }
        }
      });
    } else {
      // Fallback to fetch if HttpClient is not available
      console.log('HttpClient not available, using fetch to load events from:', this.apiUrl);
      fetch(this.apiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((events: Evento[]) => {
          console.log('Loaded events from API via fetch:', events.length, events);
          if (events && events.length > 0) {
            console.log('First event sample:', events[0]);
          }
          this._eventos$.next(events);
          console.log('Events emitted to BehaviorSubject, current value:', this._eventos$.value.length);
        })
        .catch((error) => {
          if (isPlatformBrowser(this.platformId)) {
            console.error('Error loading events via fetch:', error);
          }
        });
    }
  }

  list(): Observable<Evento[]> {
    // Lazy initialization - only start polling when someone subscribes
    console.log('EventoService.list() called');
    this.ensureInitialized();
    const currentValue = this._eventos$.value;
    console.log('Current events count in BehaviorSubject:', currentValue.length);
    // Return observable that immediately emits current value, then continues with updates
    return this._eventos$.asObservable();
  }

  getById(id: string): Observable<Evento | undefined> {
    const atual = this._eventos$.value.find(e => e.id === id);
    return of(atual);
  }

  add(evt: Evento): void {
    const atual = this._eventos$.value;
    this._eventos$.next([...atual, evt]);
  }

  update(evt: Evento): void {
    const atual = this._eventos$.value.map(e => e.id === evt.id ? evt : e);
    this._eventos$.next(atual);
  }

  remove(id: string): void {
    const atual = this._eventos$.value.filter(e => e.id !== id);
    this._eventos$.next(atual);
  }
}
