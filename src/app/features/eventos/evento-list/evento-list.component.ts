import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventoService } from '../evento.service';
import { Observable } from 'rxjs';
import { Evento } from '../evento.model';

@Component({
  selector: 'app-evento-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './evento-list.component.html',
  styleUrls: ['./evento-list.component.css']
})
export class EventoListComponent implements OnInit {
  private svc = inject(EventoService);
  eventos$: Observable<Evento[]> = this.svc.list();

  ngOnInit() {
    console.log('EventoListComponent: Initialized, subscribing to events');
    this.eventos$.subscribe(events => {
      console.log('EventoListComponent: Received events:', events.length, events);
    });
  }

  remover(id: string) {
    if (confirm('Tem certeza que deseja remover este evento?')) {
      this.svc.remove(id);
    }
  }

  trackById(index: number, event: Evento): string {
    return event.id;
  }
}
