import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DespesaService } from '../../../core/services/despesa.service';
import { RendaService } from '../../../core/services/renda.service';
import { AnalisePageComponent } from './analise-page.component';

describe('AnalisePageComponent - recorrencia na inclusao', () => {
  let fixture: ComponentFixture<AnalisePageComponent>;
  let component: AnalisePageComponent;
  let criarRenda: jasmine.Spy;
  let criarDespesa: jasmine.Spy;

  beforeEach(async () => {
    registerLocaleData(localePt);
    criarRenda = jasmine.createSpy('criarRenda').and.returnValue(of({}));
    criarDespesa = jasmine.createSpy('criarDespesa').and.returnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [AnalisePageComponent, NoopAnimationsModule],
      providers: [
        { provide: RendaService, useValue: { criar: criarRenda } },
        { provide: DespesaService, useValue: { criar: criarDespesa } },
        { provide: AuthService, useValue: {} },
        { provide: Router, useValue: {} }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(AnalisePageComponent);
    component = fixture.componentInstance;
    spyOn(component, 'buscarDados');
  });

  for (const tipo of ['renda', 'despesa'] as const) {
    for (const aba of [tipo === 'renda' ? 'rendas' : 'despesas', 'adicionar'] as const) {
      describe(`${tipo} na aba ${aba}`, () => {
        function preencherQuantidade(form: HTMLFormElement, value: string) {
          const input = form.querySelector<HTMLInputElement>('input[formControlName="quantidadeMeses"]')!;
          input.value = value;
          input.dispatchEvent(new Event('input'));
        }

        function preparar() {
          component.abaSelecionada = aba;
          component.formRenda.patchValue({ descricao: 'Salario', valor: 2600, dataRecebimento: '2027-02-15' });
          component.formDespesa.patchValue({ descricao: 'Aluguel', valor: 1770, dataPagamento: '2027-02-15' });
          fixture.detectChanges();
          const field = tipo === 'renda' ? 'dataRecebimento' : 'dataPagamento';
          const input = fixture.nativeElement.querySelector(`input[formControlName="${field}"]`) as HTMLInputElement;
          const form = input.closest('form')!;
          return {
            form,
            checkbox: form.querySelector<HTMLInputElement>('input[type="checkbox"]')!,
            criar: tipo === 'renda' ? criarRenda : criarDespesa,
            field,
            dia: tipo === 'renda' ? 'diaRecebimento' : 'diaPagamento',
            base: tipo === 'renda'
              ? { descricao: 'Salario', valor: 2600, tipo: 'SALARIO' }
              : { descricao: 'Aluguel', valor: 1770, tipo: 'OUTRO' }
          };
        }

        it('envia somente a data escolhida quando a repeticao esta desligada', () => {
          const { form, checkbox, criar, field, base } = preparar();
          expect(checkbox.checked).toBeFalse();
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          expect(criar).toHaveBeenCalledOnceWith({ ...base, recorrente: false, [field]: '2027-02-15' });
        });

        it('troca a data pelo dia mensal e envia a recorrencia ao salvar', () => {
          const { form, checkbox, criar, field, dia, base } = preparar();
          checkbox.click();
          fixture.detectChanges();
          expect(form.querySelector(`input[formControlName="${field}"]`)).toBeNull();
          const inputDia = form.querySelector<HTMLInputElement>(`input[formControlName="${dia}"]`)!;
          inputDia.value = '31';
          inputDia.dispatchEvent(new Event('input'));
          preencherQuantidade(form, '6');
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          expect(criar).toHaveBeenCalledOnceWith({ ...base, recorrente: true, [dia]: 31, quantidadeMeses: 6 });
          fixture.detectChanges();
          expect(checkbox.checked).toBeFalse();
          expect(form.querySelector(`input[formControlName="${field}"]`)).not.toBeNull();
        });

        it('restaura a data e ignora um dia mensal invalido ao desmarcar', () => {
          const { form, checkbox, criar, field, dia, base } = preparar();
          checkbox.click();
          fixture.detectChanges();
          const inputDia = form.querySelector<HTMLInputElement>(`input[formControlName="${dia}"]`)!;
          inputDia.value = '32';
          inputDia.dispatchEvent(new Event('input'));
          preencherQuantidade(form, '6');
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          expect(criar).not.toHaveBeenCalled();
          checkbox.click();
          fixture.detectChanges();
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          expect(criar).toHaveBeenCalledOnceWith({ ...base, recorrente: false, [field]: '2027-02-15' });
        });

        it('mantem a recorrencia e o dia preenchido quando o salvamento falha', () => {
          const { form, checkbox, criar, dia } = preparar();
          criar.and.returnValue(throwError(() => new Error('Falha de rede')));
          checkbox.click();
          fixture.detectChanges();
          preencherQuantidade(form, '18');
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          fixture.detectChanges();
          expect(criar).toHaveBeenCalledTimes(1);
          expect(checkbox.checked).toBeTrue();
          expect(form.querySelector(`input[formControlName="${dia}"]`)).not.toBeNull();
          expect(component.errorMessage).toContain('Nao foi possivel');
        });

        it('exige a quantidade sem preencher um padrao e rejeita valores invalidos', () => {
          const { form, checkbox, criar } = preparar();
          checkbox.click();
          fixture.detectChanges();
          const input = form.querySelector<HTMLInputElement>('input[formControlName="quantidadeMeses"]')!;
          expect(input.value).toBe('');
          for (const valor of ['', '0', '-1', '1.5', '121']) {
            preencherQuantidade(form, valor);
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            expect(criar).not.toHaveBeenCalled();
          }
        });

        for (const meses of [1, 3, 18]) {
          it(`envia exatamente ${meses} meses`, () => {
            const { form, checkbox, criar } = preparar();
            checkbox.click();
            fixture.detectChanges();
            preencherQuantidade(form, String(meses));
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            expect(criar).toHaveBeenCalledTimes(1);
            expect(criar.calls.mostRecent().args[0].quantidadeMeses).toBe(meses);
          });
        }
      });
    }
  }
});
