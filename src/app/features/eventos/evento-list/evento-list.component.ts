import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventoService } from '../evento.service';
import { Observable } from 'rxjs';
import { Evento } from '../evento.model';

@Component({
  selector: 'app-evento-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './evento-list.component.html',
  styleUrls: ['./evento-list.component.css']
})
export class EventoListComponent {
  private svc = inject(EventoService);
  eventos$: Observable<Evento[]> = this.svc.list();

  remover(id: string) {
    this.svc.remove(id);
  }
}
