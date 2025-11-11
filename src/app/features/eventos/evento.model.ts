export type Forca = 'PMERJ' | 'EB';

export interface Evento {
  id: string;
  forca?: Forca;
  nome: string;
  descricao: string;
  latitude: number;
  longitude: number;
  ts?: number;
}
