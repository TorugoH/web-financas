import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { SimulacoesComponent } from './simulacoes.component';
import { TabelasTrabalhistasService } from './tabelas-trabalhistas.service';
import { TABELAS_TESTE as t } from './tabelas-trabalhistas.fixture';

describe('SimulacoesComponent', () => {
  let consultar: jasmine.Spy;
  beforeEach(async () => {
    registerLocaleData(localePt);
    consultar = jasmine.createSpy('consultar').and.returnValue(of(t));
    await TestBed.configureTestingModule({
      imports: [SimulacoesComponent],
      providers: [{ provide: TabelasTrabalhistasService, useValue: { consultar } }]
    }).compileComponents();
  });

  it('consulta tabelas automaticamente e abre salario com VT 6%', () => {
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.salario.controls.vtPercentual.value).toBe(6);
    expect(fixture.componentInstance.resultado?.liquido).toBe(2234.31);
    expect(fixture.nativeElement.textContent).toContain('2026');
  });
  it('edicao pelo input recalcula resultado e campo vazio oculta total antigo', () => {
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[formControlName="salario"]') as HTMLInputElement;
    input.value = '3000';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.resultado?.bruto).toBe(3000);
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.resultado).toBeNull();
    expect(fixture.nativeElement.querySelector('.validation')).not.toBeNull();
  });
  it('muda entre os quatro modos sem nova consulta e preserva entradas', () => {
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.salario.controls.salario.setValue(3500);
    for (const modo of ['rescisao', 'ferias', 'investimentos', 'salario'] as const) {
      c.selecionar(modo);
      fixture.detectChanges();
      expect(c.resultado).not.toBeNull();
    }
    expect(c.salario.controls.salario.value).toBe(3500);
    expect(consultar).toHaveBeenCalledTimes(1);
  });
  it('mostra contingencia de forma visivel', () => {
    consultar.and.returnValue(of({ ...t, status: 'CONTINGENCIA', consultadoEm: null, mensagem: 'Tabela de contingencia de 2026.' }));
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.table-status.warning').textContent).toContain('contingencia');
  });
  it('erro na API nao vira tabela atualizada e nao bloqueia investimentos', () => {
    consultar.and.returnValue(throwError(() => new Error('503')));
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.resultado).toBeNull();
    expect(fixture.componentInstance.erro).toContain('backend');
    fixture.componentInstance.selecionar('investimentos');
    fixture.detectChanges();
    expect(fixture.componentInstance.resultado).not.toBeNull();
  });
  it('nao duplica consultas enquanto carrega', () => {
    consultar.and.returnValue(new Subject());
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    fixture.componentInstance.consultarTabelas();
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.carregando).toBeTrue();
  });
  it('muda opcoes de aviso de acordo com o motivo', () => {
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selecionar('rescisao');
    c.rescisao.controls.motivo.setValue('PEDIDO');
    c.alterarMotivo();
    fixture.detectChanges();
    expect(c.rescisao.controls.aviso.value).toBe('TRABALHADO');
    c.rescisao.controls.motivo.setValue('JUSTA_CAUSA');
    c.alterarMotivo();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="avosDecimo"]')).toBeNull();
  });

  it('campos que deixam de se aplicar nao bloqueiam outro motivo', () => {
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selecionar('rescisao');
    c.rescisao.controls.avosDecimo.setValue(NaN);
    c.rescisao.controls.saldoFgts.setValue(NaN);
    expect(c.resultado).toBeNull();
    c.rescisao.controls.motivo.setValue('JUSTA_CAUSA');
    c.alterarMotivo();
    expect(c.resultado).not.toBeNull();
    c.rescisao.controls.motivo.setValue('SEM_JUSTA_CAUSA');
    c.alterarMotivo();
    expect(c.resultado).toBeNull();
  });

  it('rejeita prazo fracionado e excessivo sem interromper recalculos posteriores', () => {
    const fixture = TestBed.createComponent(SimulacoesComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selecionar('investimentos');
    for (const meses of [1.5, 1e9, Infinity, NaN]) {
      c.investimentos.controls.meses.setValue(meses);
      expect(c.resultado).toBeNull();
    }
    c.investimentos.controls.meses.setValue(12);
    expect(c.resultado).not.toBeNull();
  });
});
