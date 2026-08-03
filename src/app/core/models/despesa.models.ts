export type DespesaTipo = 'ALIMENTACAO' | 'TRANSPORTE' | 'MORADIA' | 'LAZER' | 'SAUDE' | 'EDUCACAO' | 'OUTRO';
export type DespesaValorEscopo = 'APENAS_ESTE_MES' | 'ESTE_E_FUTUROS';

export interface DespesaRequest {
  descricao: string;
  valor: number;
  tipo: DespesaTipo;
  recorrente: boolean;
  diaPagamento?: number;
  dataPagamento?: string;
}

export interface DespesaResponse {
  id: number;
  descricao: string;
  valor: number;
  tipo: DespesaTipo;
  recorrente: boolean;
  diaPagamento?: number;
}

export interface DespesaValorRequest {
  novoValor: number;
  mesReferencia: string;
  escopo: DespesaValorEscopo;
}

export interface DespesaTotalResponse {
  total: number;
  periodo: string;
}

export interface DespesaLancamento {
  id: number;
  despesaId?: number;
  descricao: string;
  tipo: DespesaTipo;
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
