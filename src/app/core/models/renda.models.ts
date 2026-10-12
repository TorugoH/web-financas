export type RendaTipo = 'SALARIO' | 'FREELANCE' | 'INVESTIMENTO' | 'OUTRO';
export type RendaValorEscopo = 'APENAS_ESTE_MES' | 'ESTE_E_FUTUROS';

export interface RendaRequest {
  taxaAnual?: number;
  quantidadeMeses?: number;
  descricao: string;
  valor: number;
  tipo: RendaTipo;
  recorrente: boolean;
  diaRecebimento?: number;
  dataRecebimento?: string;
}

export interface RendaResponse {
  taxaAnual?: number | null;
  id: number;
  descricao: string;
  valor: number;
  tipo: RendaTipo;
  recorrente: boolean;
  diaRecebimento?: number;
}

export interface RendaValorRequest {
  novoValor: number;
  mesReferencia: string;
  escopo: RendaValorEscopo;
}

export interface RendaTotalResponse {
  total: number;
  periodo: string;
}

export interface RendaLancamento {
  taxaAnual?: number | null;
  id: number;
  rendaId?: number;
  descricao: string;
  tipo: RendaTipo;
  valor: number;
  dataPrevista: string;
  recorrente: boolean;
}

export interface MesResumo {
  periodo: string;
  label: string;
  total: number;
  loading: boolean;
  erro?: string;
  atual: boolean;
}
