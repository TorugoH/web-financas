import { TabelasTrabalhistas } from './calculos-trabalhistas';

export const TABELAS_TESTE: TabelasTrabalhistas = {
  ano: 2026, status: 'ATUALIZADA', consultadoEm: '2026-09-13T12:00:00Z', mensagem: 'Tabelas consultadas nas fontes oficiais.',
  inss: [{ limite: 1621, aliquota: .075, deducao: 0 }, { limite: 2902.84, aliquota: .09, deducao: 0 },
    { limite: 4354.27, aliquota: .12, deducao: 0 }, { limite: 8475.55, aliquota: .14, deducao: 0 }],
  irrf: [{ limite: 2428.8, aliquota: 0, deducao: 0 }, { limite: 2826.65, aliquota: .075, deducao: 182.16 },
    { limite: 3751.05, aliquota: .15, deducao: 394.16 }, { limite: 4664.68, aliquota: .225, deducao: 675.49 },
    { limite: null, aliquota: .275, deducao: 908.73 }],
  deducaoDependente: 189.59, descontoSimplificado: 607.2, isencaoAte: 5000, reducaoAte: 7350,
  reducaoMaxima: 312.89, reducaoFixa: 978.62, reducaoFator: .133145, fonteInss: '', fonteIrrf: ''
};
