import { Routes } from '@angular/router';
import { MapaComponent } from './features/mapa/mapa.component';
import { ConfigComponent } from './features/config/config.component';
import { EventoListComponent } from './features/eventos/evento-list/evento-list.component';
import { EventoFormComponent } from './features/eventos/evento-form/evento-form.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { path: 'mapa', component: MapaComponent },
  { path: 'config', component: ConfigComponent },
  { path: 'eventos', component: EventoListComponent },
  { path: 'eventos/novo', component: EventoFormComponent },
  { path: 'eventos/:id', component: EventoFormComponent },
];
