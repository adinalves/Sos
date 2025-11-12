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

export interface SecurityConfig {
  token?: string;      // Token de autenticação (opcional, se vazio desabilita validação)
  allowedIp?: string;  // IP permitido (opcional, se vazio permite qualquer IP)
}

export interface ServerMapping {
  mapping: FieldMapping;
  security: SecurityConfig;
}

export interface MapeamentoConfig {
  army: ServerMapping;
  pmerj: ServerMapping;
}

export const DEFAULT_MAPPING: MapeamentoConfig = {
  army: {
    mapping: {
      id: 'identificador',
      nome: 'titulo',
      descricao: 'detalhes',
      latitude: 'lat',
      longitude: 'lng',
      ts: 'dataHora'
    },
    security: {
      token: 'army-secret-token-123',
      allowedIp: '127.0.0.1'
    }
  },
  pmerj: {
    mapping: {
      id: 'codigo',
      nome: 'name',
      descricao: 'description',
      latitude: 'lat',
      longitude: 'lon',
      ts: 'timestamp'
    },
    security: {
      token: 'pmerj-secret-token-456',
      allowedIp: '127.0.0.1'
    }
  }
};

