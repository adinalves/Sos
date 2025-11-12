import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Routes with dynamic parameters should use server-side rendering
  {
    path: 'eventos/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'eventos/novo',
    renderMode: RenderMode.Server
  },
  // Static routes can use prerendering
  {
    path: 'mapa',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'mapeamento',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'logs',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'eventos',
    renderMode: RenderMode.Prerender
  },
  // Default for all other routes
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
