import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventoService } from '../evento.service';
import { Evento, Forca } from '../evento.model';

@Component({
  selector: 'app-evento-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evento-form.component.html',
  styleUrls: ['./evento-form.component.css']
})
export class EventoFormComponent implements OnInit {
  private svc = inject(EventoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  titulo = 'Novo evento';
  model: Evento = { 
    id: crypto.randomUUID(), 
    nome: '', 
    descricao: '', 
    latitude: -22.9068, 
    longitude: -43.1729,
    forca: undefined,
    ts: Date.now()
  };
  
  forcas: Forca[] = ['PMERJ', 'EB'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'novo') {
      console.log('EventoFormComponent: Loading event with id:', id);
      this.svc.getById(id).subscribe(evt => {
        if (evt) {
          this.model = { ...evt };
          this.titulo = 'Editar evento';
          console.log('EventoFormComponent: Event loaded:', evt);
        } else {
          console.warn('EventoFormComponent: Event not found with id:', id);
        }
      });
    }
  }

  salvar() {
    console.log('EventoFormComponent: Saving event:', this.model);
    // Ensure ts is set
    if (!this.model.ts) {
      this.model.ts = Date.now();
    }
    
    // Check if event exists
    this.svc.getById(this.model.id).subscribe(existe => {
      if (existe) {
        this.svc.update(this.model);
        console.log('EventoFormComponent: Event updated');
      } else {
        this.svc.add(this.model);
        console.log('EventoFormComponent: Event added');
      }

      this.router.navigateByUrl('/eventos');
    });
  }

  cancelar() {
    this.router.navigateByUrl('/eventos');
  }
}
