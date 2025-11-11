import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventoService } from '../evento.service';
import { Evento } from '../evento.model';

@Component({
  selector: 'app-evento-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evento-form.component.html',
  styleUrls: ['./evento-form.component.css']
})
export class EventoFormComponent {
  private svc = inject(EventoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  titulo = 'Novo evento';
  model: Evento = { id: crypto.randomUUID(), nome: '', descricao: '', latitude: 0, longitude: 0 };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'novo') {
      this.svc.getById(id).subscribe(evt => {
        if (evt) {
          this.model = { ...evt };
          this.titulo = 'Editar evento';
        }
      });
    }
  }

  salvar() {
    // decide entre add/update
    this.svc.getById(this.model.id).subscribe(existe => {
      if (existe) this.svc.update(this.model);
      else this.svc.add(this.model);

      this.router.navigateByUrl('/eventos');
    });
  }
}
