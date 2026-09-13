export interface Faixa {
  limite: number | null;
  aliquota: number;
  deducao: number;
}

export interface TabelasTrabalhistas {
  ano: number;
  status: 'ATUALIZADA' | 'DESATUALIZADA' | 'CONTINGENCIA';
  consultadoEm: string | null;
  mensagem: string;
  inss: Faixa[];
  irrf: Faixa[];
  deducaoDependente: number;
  descontoSimplificado: number;
  isencaoAte: number;
  reducaoAte: number;
  reducaoMaxima: number;
  reducaoFixa: number;
  reducaoFator: number;
  fonteInss: string;
  fonteIrrf: string;
}

export interface Parcela { nome: string; valor: number; }
export interface Resultado {
  proventos: Parcela[];
  descontos: Parcela[];
  bruto: number;
  totalDescontos: number;
  liquido: number;
  multaFgts?: number;
}

export interface Salario {
  salario: number;
  adicionais: number;
  dependentes: number;
  vtPercentual: number;
  custoVt: number | null;
  outrosDescontos: number;
}

export type MotivoRescisao = 'SEM_JUSTA_CAUSA' | 'PEDIDO' | 'ACORDO' | 'JUSTA_CAUSA';
export type Aviso = 'INDENIZADO' | 'TRABALHADO' | 'DISPENSADO' | 'DESCONTADO';
export interface Rescisao {
  salario: number;
  medias: number;
  dependentes: number;
  motivo: MotivoRescisao;
  aviso: Aviso;
  anosCompletos: number;
  diasSaldo: number;
  avosDecimo: number;
  avosFerias: number;
  periodosIntegrais: number;
  periodosDobro: number;
  saldoFgts: number;
  outrosDescontos: number;
}

export interface Ferias {
  salario: number;
  medias: number;
  dependentes: number;
  dias: number;
  adiantamentoDecimo: boolean;
  outrosDescontos: number;
}

export const dinheiro = (valor: number): number => {
  const absoluto = Math.abs(valor);
  return Math.sign(valor) * Math.round((absoluto + Number.EPSILON * Math.max(1, absoluto)) * 100) / 100;
};

function validar(valor: number, maximo = 100_000_000, inteiro = false): void {
  if (!Number.isFinite(valor) || valor < 0 || valor > maximo || (inteiro && !Number.isInteger(valor))) {
    throw new Error('Valor invalido para a simulacao.');
  }
}

export function calcularInss(base: number, tabelas: TabelasTrabalhistas): number {
  validar(base);
  let inicio = 0;
  let total = 0;
  for (const faixa of tabelas.inss) {
    const fim = faixa.limite!;
    total += Math.max(0, Math.min(base, fim) - inicio) * faixa.aliquota;
    inicio = fim;
  }
  return dinheiro(total);
}

export function calcularIrrf(bruto: number, inss: number, dependentes: number, tabelas: TabelasTrabalhistas): number {
  validar(bruto);
  validar(inss);
  validar(dependentes, 30, true);
  const deducao = Math.max(inss + dependentes * tabelas.deducaoDependente, tabelas.descontoSimplificado);
  const base = Math.max(0, bruto - deducao);
  const faixa = tabelas.irrf.find(f => f.limite === null || base <= f.limite);
  if (!faixa || tabelas.ano !== 2026) throw new Error('Tabela tributaria nao suportada.');
  const imposto = dinheiro(Math.max(0, base * faixa.aliquota - faixa.deducao));
  // O redutor considera o rendimento tributavel bruto, nao a base apos deducoes.
  const reducao = bruto <= tabelas.isencaoAte ? tabelas.reducaoMaxima
    : bruto <= tabelas.reducaoAte ? Math.max(0, dinheiro(tabelas.reducaoFixa - tabelas.reducaoFator * bruto)) : 0;
  return dinheiro(Math.max(0, imposto - reducao));
}

function resultado(proventos: Parcela[], descontos: Parcela[]): Resultado {
  const bruto = dinheiro(proventos.reduce((s, p) => s + p.valor, 0));
  const totalDescontos = dinheiro(descontos.reduce((s, p) => s + p.valor, 0));
  return { proventos, descontos, bruto, totalDescontos, liquido: dinheiro(bruto - totalDescontos) };
}

export function calcularSalario(v: Salario, t: TabelasTrabalhistas): Resultado {
  [v.salario, v.adicionais, v.outrosDescontos].forEach(n => validar(n));
  validar(v.vtPercentual, 6);
  if (v.custoVt !== null) validar(v.custoVt);
  const bruto = dinheiro(v.salario + v.adicionais);
  const inss = calcularInss(bruto, t);
  const vt = dinheiro(Math.min(v.salario * v.vtPercentual / 100, v.custoVt ?? Infinity));
  return resultado([
    { nome: 'Salario base', valor: dinheiro(v.salario) },
    { nome: 'Adicionais tributaveis', valor: dinheiro(v.adicionais) }
  ], [
    { nome: 'INSS progressivo', valor: inss },
    { nome: 'IRRF', valor: calcularIrrf(bruto, inss, v.dependentes, t) },
    { nome: 'Vale-transporte', valor: vt },
    { nome: 'Outros descontos', valor: dinheiro(v.outrosDescontos) }
  ]);
}

export function calcularFerias(v: Ferias, t: TabelasTrabalhistas): Resultado {
  [v.salario, v.medias, v.outrosDescontos].forEach(n => validar(n));
  validar(v.dias, 30, true);
  if (v.dias < 1) throw new Error('Dias de ferias invalidos.');
  const base = v.salario + v.medias;
  const ferias = dinheiro(base / 30 * v.dias);
  const terco = dinheiro(ferias / 3);
  const brutoTributavel = dinheiro(ferias + terco);
  const inss = calcularInss(brutoTributavel, t);
  return resultado([
    { nome: 'Ferias gozadas', valor: ferias },
    { nome: 'Adicional de 1/3', valor: terco },
    { nome: 'Adiantamento do 13o', valor: v.adiantamentoDecimo ? dinheiro(base / 2) : 0 }
  ], [
    { nome: 'INSS estimado do recibo', valor: inss },
    { nome: 'IRRF sobre ferias', valor: calcularIrrf(brutoTributavel, inss, v.dependentes, t) },
    { nome: 'Outros descontos', valor: dinheiro(v.outrosDescontos) }
  ]);
}

export function diasAviso(anosCompletos: number): number {
  validar(anosCompletos, 80, true);
  return Math.min(30 + anosCompletos * 3, 90);
}

export function calcularRescisao(v: Rescisao, t: TabelasTrabalhistas): Resultado {
  [v.salario, v.medias, v.outrosDescontos].forEach(n => validar(n));
  const justaCausa = v.motivo === 'JUSTA_CAUSA';
  const temMulta = v.motivo === 'SEM_JUSTA_CAUSA' || v.motivo === 'ACORDO';
  if (temMulta) validar(v.saldoFgts);
  validar(v.diasSaldo, 30, true);
  if (!justaCausa) {
    validar(v.avosDecimo, 12, true);
    validar(v.avosFerias, 12, true);
  }
  validar(v.periodosIntegrais, 10, true);
  validar(v.periodosDobro, 10, true);
  const dias = justaCausa ? 0 : diasAviso(v.anosCompletos);
  const base = v.salario + v.medias;
  const saldo = dinheiro(base / 30 * v.diasSaldo);
  const decimo = justaCausa ? 0 : dinheiro(base / 12 * v.avosDecimo);
  const ferias = dinheiro(base * (v.periodosIntegrais + 2 * v.periodosDobro + (justaCausa ? 0 : v.avosFerias / 12)));
  const aviso = v.aviso === 'INDENIZADO' && (v.motivo === 'SEM_JUSTA_CAUSA' || v.motivo === 'ACORDO')
    ? dinheiro(base / 30 * dias * (v.motivo === 'ACORDO' ? 0.5 : 1)) : 0;
  const inssSaldo = calcularInss(saldo, t);
  const inssDecimo = calcularInss(decimo, t);
  const res = resultado([
    { nome: 'Saldo de salario', valor: saldo },
    { nome: '13o proporcional', valor: decimo },
    { nome: 'Ferias indenizadas', valor: ferias },
    { nome: '1/3 das ferias indenizadas', valor: dinheiro(ferias / 3) },
    { nome: 'Aviso previo indenizado', valor: aviso }
  ], [
    { nome: 'INSS sobre saldo de salario', valor: inssSaldo },
    { nome: 'INSS sobre 13o (separado)', valor: inssDecimo },
    { nome: 'IRRF sobre saldo de salario', valor: calcularIrrf(saldo, inssSaldo, v.dependentes, t) },
    { nome: 'IRRF sobre 13o (separado)', valor: calcularIrrf(decimo, inssDecimo, v.dependentes, t) },
    { nome: 'Aviso nao cumprido (30 dias)', valor: v.motivo === 'PEDIDO' && v.aviso === 'DESCONTADO' ? dinheiro(base) : 0 },
    { nome: 'Adiantamentos e outros descontos', valor: dinheiro(v.outrosDescontos) }
  ]);
  return { ...res, multaFgts: temMulta ? dinheiro(v.saldoFgts * (v.motivo === 'SEM_JUSTA_CAUSA' ? 0.4 : 0.2)) : 0 };
}

export function calcularInvestimento(inicial: number, aporte: number, taxa: number, meses: number): Resultado {
  validar(inicial);
  validar(aporte);
  validar(taxa, 100);
  validar(meses, 600, true);
  if (meses < 1) throw new Error('Prazo invalido.');
  const mensal = Math.pow(1 + taxa / 100, 1 / 12) - 1;
  let total = inicial;
  for (let i = 0; i < meses; i++) total = total * (1 + mensal) + aporte;
  const aplicado = dinheiro(inicial + aporte * meses);
  return resultado([
    { nome: 'Capital e aportes', valor: aplicado },
    { nome: 'Rendimento bruto projetado', valor: dinheiro(total - aplicado) }
  ], []);
}
