import { calcularInss, calcularIrrf, calcularSalario, calcularFerias, calcularRescisao, calcularInvestimento, diasAviso, Rescisao } from './calculos-trabalhistas';
import { TABELAS_TESTE as t } from './tabelas-trabalhistas.fixture';

describe('Calculos trabalhistas 2026', () => {
  it('aplica INSS progressivo e respeita teto', () => {
    expect(calcularInss(0, t)).toBe(0);
    expect(calcularInss(1621, t)).toBe(121.58);
    expect(calcularInss(2600, t)).toBe(209.69);
    expect(calcularInss(8475.55, t)).toBe(988.09);
    expect(calcularInss(25000, t)).toBe(988.09);
  });
  it('isenta IRRF ate 5000, inclusive', () => {
    [0, 1621, 4000, 5000].forEach(bruto => expect(calcularIrrf(bruto, calcularInss(bruto, t), 0, t)).toBe(0));
  });
  it('reproduz exemplo da Receita: bruto 6000, INSS informado 649,60', () => {
    expect(calcularIrrf(6000, 649.60, 0, t)).toBe(382.88);
  });
  it('nao aplica redutor acima de 7350', () => {
    expect(calcularIrrf(8000, 0, 0, t)).toBe(1124.29);
  });
  it('dependentes reduzem IR sem acumular desconto simplificado', () => {
    expect(calcularIrrf(8000, 0, 0, t)).toBe(calcularIrrf(8000, 0, 1, t));
    expect(calcularIrrf(8000, 988.09, 2, t)).toBeLessThan(calcularIrrf(8000, 988.09, 0, t));
  });
  it('calcula salario de 2600 com VT de 6%', () => {
    const r = calcularSalario({ salario: 2600, adicionais: 0, dependentes: 0, vtPercentual: 6, custoVt: null, outrosDescontos: 0 }, t);
    expect(r.liquido).toBe(2234.31);
    expect(r.descontos.find(p => p.nome === 'Vale-transporte')?.valor).toBe(156);
  });
  it('limita VT ao custo real e nao tributa adicionais com VT', () => {
    const r = calcularSalario({ salario: 2600, adicionais: 400, dependentes: 0, vtPercentual: 6, custoVt: 100, outrosDescontos: 0 }, t);
    expect(r.descontos.find(p => p.nome === 'Vale-transporte')?.valor).toBe(100);
  });
  it('permite VT zerado', () => {
    expect(calcularSalario({ salario: 2600, adicionais: 0, dependentes: 0, vtPercentual: 0, custoVt: null, outrosDescontos: 0 }, t).liquido).toBe(2390.31);
  });
  it('calcula ferias de 30 dias com um terco e sem VT', () => {
    const r = calcularFerias({ salario: 3000, medias: 0, dependentes: 0, dias: 30, adiantamentoDecimo: false, outrosDescontos: 0 }, t);
    expect(r.bruto).toBe(4000);
    expect(r.liquido).toBe(4000 - calcularInss(4000, t));
  });
  it('separa adiantamento do decimo dos tributos do recibo', () => {
    const v = { salario: 6000, medias: 0, dependentes: 0, dias: 20, adiantamentoDecimo: false, outrosDescontos: 0 };
    const normal = calcularFerias(v, t);
    const adiantado = calcularFerias({ ...v, adiantamentoDecimo: true }, t);
    expect(adiantado.totalDescontos).toBe(normal.totalDescontos);
    expect(adiantado.liquido - normal.liquido).toBeCloseTo(3000, 2);
  });
  const rescisao: Rescisao = {
    salario: 3000, medias: 0, dependentes: 0, motivo: 'SEM_JUSTA_CAUSA', aviso: 'INDENIZADO',
    anosCompletos: 2, diasSaldo: 15, avosDecimo: 6, avosFerias: 6, periodosIntegrais: 1,
    periodosDobro: 0, saldoFgts: 10000, outrosDescontos: 0
  };
  it('calcula sem justa causa e FGTS fora do liquido', () => {
    const r = calcularRescisao(rescisao, t);
    expect(r.bruto).toBe(12600);
    expect(r.totalDescontos).toBe(225);
    expect(r.liquido).toBe(12375);
    expect(r.multaFgts).toBe(4000);
  });
  it('acordo paga metade do aviso e multa de 20%', () => {
    const r = calcularRescisao({ ...rescisao, motivo: 'ACORDO' }, t);
    expect(r.bruto).toBe(10800);
    expect(r.multaFgts).toBe(2000);
  });
  it('pedido desconta somente 30 dias e nao gera multa', () => {
    const r = calcularRescisao({ ...rescisao, motivo: 'PEDIDO', aviso: 'DESCONTADO' }, t);
    expect(r.proventos.find(p => p.nome === 'Aviso previo indenizado')?.valor).toBe(0);
    expect(r.descontos.find(p => p.nome.startsWith('Aviso nao'))?.valor).toBe(3000);
    expect(r.multaFgts).toBe(0);
  });
  it('aviso trabalhado nao duplica saldo de salario', () => {
    expect(calcularRescisao({ ...rescisao, aviso: 'TRABALHADO' }, t).bruto).toBe(9000);
  });
  it('justa causa exclui proporcionais e mantem ferias integrais', () => {
    const r = calcularRescisao({ ...rescisao, motivo: 'JUSTA_CAUSA' }, t);
    expect(r.bruto).toBe(5500);
    expect(r.multaFgts).toBe(0);
  });
  it('ferias em dobro nao duplicam periodos simples', () => {
    const r = calcularRescisao({ ...rescisao, periodosIntegrais: 0, periodosDobro: 1 }, t);
    expect(r.proventos.find(p => p.nome === 'Ferias indenizadas')?.valor).toBe(7500);
  });
  it('limita aviso proporcional a 90 dias', () => {
    expect(diasAviso(0)).toBe(30);
    expect(diasAviso(1)).toBe(33);
    expect(diasAviso(2)).toBe(36);
    expect(diasAviso(40)).toBe(90);
  });
  it('rejeita valores negativos, NaN e quantidades fracionadas', () => {
    expect(() => calcularInss(-1, t)).toThrow();
    expect(() => calcularInss(NaN, t)).toThrow();
    expect(() => calcularRescisao({ ...rescisao, avosFerias: 13 }, t)).toThrow();
    expect(() => calcularRescisao({ ...rescisao, avosDecimo: 1.5 }, t)).toThrow();
    expect(() => calcularFerias({ salario: 1000, medias: 0, dependentes: 0, dias: 0, adiantamentoDecimo: false, outrosDescontos: 0 }, t)).toThrow();
  });
  it('preserva investimentos e limita prazo para nao travar', () => {
    expect(calcularInvestimento(1000, 200, 0, 12).liquido).toBe(3400);
    expect(calcularInvestimento(1000, 0, 12, 12).liquido).toBe(1120);
    expect(() => calcularInvestimento(1000, 200, 12, 1e9)).toThrow();
    expect(() => calcularInvestimento(1000, 200, 12, 1.5)).toThrow();
  });
});
