import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Evento } from './evento.model';

@Injectable({ providedIn: 'root' })
export class EventoService {
  private _eventos$ = new BehaviorSubject<Evento[]>([
    { id: '1', nome: 'Ponto A', descricao: 'Teste A', latitude: -22.90, longitude: -43.17 },
    { id: '2', nome: 'Ponto B', descricao: 'Teste B', latitude: -23.55, longitude: -46.63 }
  ]);

  list(): Observable<Evento[]> {
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
