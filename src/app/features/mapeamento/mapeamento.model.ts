export type Forca = 'PMERJ' | 'EB';

export interface FieldMapping {
  // Campo esperado no sistema -> campo recebido do servidor
  id?: string;           // Campo do JSON que contém o ID (opcional, pode ser gerado)
  nome: string;          // Campo do JSON que contém o nome
  descricao?: string;    // Campo do JSON que contém a descrição (opcional)
  latitude: string;      // Campo do JSON que contém a latitude
  longitude: string;     // Campo do JSON que contém a longitude
  ts?: string;          // Campo do JSON que contém o timestamp (opcional)
}

export interface MapeamentoConfig {
  army: FieldMapping;
  pmerj: FieldMapping;
}

export const DEFAULT_MAPPING: MapeamentoConfig = {
  army: {
    id: 'identificador',
    nome: 'titulo',
    descricao: 'detalhes',
    latitude: 'lat',
    longitude: 'lng',
    ts: 'dataHora'
  },
  pmerj: {
    id: 'codigo',
    nome: 'name',
    descricao: 'description',
    latitude: 'lat',
    longitude: 'lon',
    ts: 'timestamp'
  }
};

