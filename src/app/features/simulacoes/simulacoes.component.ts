import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import {
  Aviso, MotivoRescisao, Resultado, TabelasTrabalhistas,
  calcularFerias, calcularInvestimento, calcularRescisao, calcularSalario, diasAviso
} from './calculos-trabalhistas';
import { TabelasTrabalhistasService } from './tabelas-trabalhistas.service';

type Modo = 'salario' | 'rescisao' | 'ferias' | 'investimentos';
function numero(valor: number, maximo = 1_000_000, inteiro = false, minimo = 0) {
  return new FormControl(valor, { nonNullable: true, validators: [
    Validators.required, Validators.min(minimo), Validators.max(maximo),
    control => Number.isFinite(control.value) && (!inteiro || Number.isInteger(control.value)) ? null : { numero: true }
  ] });
}

@Component({
  selector: 'app-simulacoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './simulacoes.component.html',
  styleUrl: './simulacoes.component.scss'
})
export class SimulacoesComponent implements OnInit {
  private readonly service = inject(TabelasTrabalhistasService);
  private readonly destroyRef = inject(DestroyRef);
  readonly modos: { valor: Modo; label: string; icone: string }[] = [
    { valor: 'salario', label: 'Salario liquido', icone: 'pi-wallet' },
    { valor: 'rescisao', label: 'Rescisao', icone: 'pi-briefcase' },
    { valor: 'ferias', label: 'Ferias', icone: 'pi-calendar' },
    { valor: 'investimentos', label: 'Investimentos', icone: 'pi-chart-line' }
  ];
  modo: Modo = 'salario';
  tabelas: TabelasTrabalhistas | null = null;
  carregando = false;
  erro = '';
  resultado: Resultado | null = null;

  readonly salario = new FormGroup({
    salario: numero(2600), adicionais: numero(0), dependentes: numero(0, 30, true),
    vtPercentual: numero(6, 6),
    custoVt: new FormControl<number | null>(null, [Validators.min(0), Validators.max(1_000_000)]),
    outrosDescontos: numero(0)
  });
  readonly ferias = new FormGroup({
    salario: numero(2600), medias: numero(0), dependentes: numero(0, 30, true),
    dias: numero(30, 30, true, 1), adiantamentoDecimo: new FormControl(false, { nonNullable: true }),
    outrosDescontos: numero(0)
  });
  readonly rescisao = new FormGroup({
    salario: numero(2600), medias: numero(0), dependentes: numero(0, 30, true),
    motivo: new FormControl<MotivoRescisao>('SEM_JUSTA_CAUSA', { nonNullable: true }),
    aviso: new FormControl<Aviso>('INDENIZADO', { nonNullable: true }),
    anosCompletos: numero(0, 80, true), diasSaldo: numero(15, 30, true),
    avosDecimo: numero(0, 12, true), avosFerias: numero(0, 12, true),
    periodosIntegrais: numero(0, 10, true), periodosDobro: numero(0, 10, true),
    saldoFgts: numero(0), outrosDescontos: numero(0)
  });
  readonly investimentos = new FormGroup({
    inicial: numero(1000), aporte: numero(200), taxa: numero(12, 100), meses: numero(12, 600, true, 1)
  });

  get form() {
    return this.modo === 'salario' ? this.salario : this.modo === 'rescisao' ? this.rescisao
      : this.modo === 'ferias' ? this.ferias : this.investimentos;
  }

  get avisoDias(): number {
    const anos = this.rescisao.controls.anosCompletos;
    return anos.valid ? diasAviso(anos.value) : 30;
  }

  get tituloResultado(): string {
    return this.modo === 'salario' ? 'Salario liquido estimado' : this.modo === 'rescisao'
      ? 'Liquido da rescisao' : this.modo === 'ferias' ? 'Liquido do recibo de ferias' : 'Montante bruto projetado';
  }

  ngOnInit(): void {
    this.rescisao.controls.motivo.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.alterarMotivo());
    const forms: FormGroup[] = [this.salario, this.ferias, this.rescisao, this.investimentos];
    forms.forEach(form =>
      form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.calcular())
    );
    this.consultarTabelas();
  }

  selecionar(modo: Modo): void {
    this.modo = modo;
    this.calcular();
  }

  consultarTabelas(): void {
    if (this.carregando) return;
    this.carregando = true;
    this.erro = '';
    this.service.consultar().pipe(
      timeout(15000), takeUntilDestroyed(this.destroyRef), finalize(() => this.carregando = false)
    ).subscribe({
      next: tabelas => { this.tabelas = tabelas; this.calcular(); },
      error: () => {
        this.tabelas = null;
        this.erro = 'Nao foi possivel obter as tabelas. Verifique se o backend esta atualizado e disponivel.';
        this.calcular();
      }
    });
  }

  alterarMotivo(): void {
    const motivo = this.rescisao.controls.motivo.value;
    const controls = this.rescisao.controls;
    [controls.avosDecimo, controls.avosFerias, controls.anosCompletos].forEach(control => {
      if (motivo === 'JUSTA_CAUSA') control.disable({ emitEvent: false });
      else control.enable({ emitEvent: false });
    });
    if (motivo === 'SEM_JUSTA_CAUSA' || motivo === 'ACORDO') controls.saldoFgts.enable({ emitEvent: false });
    else controls.saldoFgts.disable({ emitEvent: false });
    this.rescisao.controls.aviso.setValue(motivo === 'PEDIDO' ? 'TRABALHADO'
      : motivo === 'JUSTA_CAUSA' ? 'DISPENSADO' : 'INDENIZADO', { emitEvent: false });
    this.calcular();
  }

  calcular(): void {
    this.resultado = null;
    if (this.form.invalid) return;
    if (this.modo === 'investimentos') {
      const v = this.investimentos.getRawValue();
      this.resultado = calcularInvestimento(v.inicial, v.aporte, v.taxa, v.meses);
      return;
    }
    if (!this.tabelas) return;
    if (this.modo === 'salario') this.resultado = calcularSalario(this.salario.getRawValue(), this.tabelas);
    if (this.modo === 'ferias') this.resultado = calcularFerias(this.ferias.getRawValue(), this.tabelas);
    if (this.modo === 'rescisao') this.resultado = calcularRescisao(this.rescisao.getRawValue(), this.tabelas);
  }
}
