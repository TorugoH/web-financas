import { CommonModule, formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DespesaLancamento, DespesaRequest, DespesaResponse, DespesaTipo, DespesaValorEscopo } from '../../../core/models/despesa.models';
import { DespesaService } from '../../../core/services/despesa.service';

interface TipoOption {
  label: string;
  value: DespesaTipo;
}

interface DespesaFormValue {
  descricao: FormControl<string>;
  valor: FormControl<number | null>;
  tipo: FormControl<DespesaTipo>;
  recorrente: FormControl<boolean>;
  diaPagamento: FormControl<number | null>;
  dataPagamento: FormControl<Date | null>;
}

@Component({
  selector: 'app-despesa-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CalendarModule,
    DialogModule,
    DropdownModule,
    InputNumberModule,
    InputSwitchModule,
    InputTextModule,
    MessageModule
  ],
  templateUrl: './despesa-form-dialog.component.html'
})
export class DespesaFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() despesa: DespesaLancamento | null = null;
  @Input() mesReferencia = '';
  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly tipos: TipoOption[] = [
    { label: 'Alimentação', value: 'ALIMENTACAO' },
    { label: 'Transporte', value: 'TRANSPORTE' },
    { label: 'Moradia', value: 'MORADIA' },
    { label: 'Lazer', value: 'LAZER' },
    { label: 'Saúde', value: 'SAUDE' },
    { label: 'Educação', value: 'EDUCACAO' },
    { label: 'Outro', value: 'OUTRO' }
  ];

  readonly form = new FormGroup<DespesaFormValue>({
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    valor: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipo: new FormControl<DespesaTipo>('ALIMENTACAO', { nonNullable: true, validators: [Validators.required] }),
    recorrente: new FormControl(true, { nonNullable: true }),
    diaPagamento: new FormControl<number | null>(5, [Validators.required, Validators.min(1), Validators.max(31)]),
    dataPagamento: new FormControl<Date | null>(null)
  });

  loading = false;
  errorMessage = '';
  scopeDialogVisible = false;
  private pendingPayload: DespesaRequest | null = null;

  get editing(): boolean {
    return Boolean(this.despesa);
  }

  constructor(private readonly despesaService: DespesaService) {
    this.form.controls.recorrente.valueChanges.subscribe((recorrente) => this.updateConditionalValidators(recorrente));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.errorMessage = '';
      this.populateForm();
      this.updateConditionalValidators(this.form.controls.recorrente.value);
    }
  }

  close(): void {
    if (!this.loading) {
      this.visibleChange.emit(false);
    }
  }

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();

    if (this.despesa && this.valorChanged(payload) && this.despesa.recorrente) {
      this.pendingPayload = payload;
      this.scopeDialogVisible = true;
      return;
    }

    const request$ = this.despesa
      ? this.despesaService.atualizarDadosGerais(this.getDespesaId(this.despesa), payload)
      : this.despesaService.criar(payload);

    this.save(request$);
  }

  confirmValorScope(escopo: DespesaValorEscopo): void {
    if (!this.despesa || !this.pendingPayload) {
      return;
    }

    const despesa = this.despesa;
    const payload = this.pendingPayload;
    const despesaId = this.getDespesaId(despesa);
    const valorRequest = {
      novoValor: payload.valor,
      mesReferencia: this.mesReferencia,
      escopo
    };

    const request$ = this.generalDataChanged(payload)
      ? this.despesaService
          .atualizarDadosGerais(despesaId, { ...payload, valor: despesa.valor })
          .pipe(switchMap(() => this.despesaService.atualizarValor(despesaId, valorRequest)))
      : this.despesaService.atualizarValor(despesaId, valorRequest);

    this.scopeDialogVisible = false;
    this.save(request$);
  }

  cancelValorScope(): void {
    this.pendingPayload = null;
    this.scopeDialogVisible = false;
  }

  private populateForm(): void {
    if (!this.despesa) {
      this.resetForm();
      return;
    }

    const dataPrevista = this.despesa.dataPrevista ? new Date(`${this.despesa.dataPrevista}T00:00:00`) : null;
    this.form.reset({
      descricao: this.despesa.descricao,
      valor: this.despesa.valor,
      tipo: this.despesa.tipo,
      recorrente: this.despesa.recorrente,
      diaPagamento: this.despesa.recorrente && dataPrevista ? dataPrevista.getDate() : 5,
      dataPagamento: this.despesa.recorrente ? null : dataPrevista
    });
  }

  private resetForm(): void {
    this.form.reset({
      descricao: '',
      valor: null,
      tipo: 'ALIMENTACAO',
      recorrente: true,
      diaPagamento: 5,
      dataPagamento: null
    });
  }

  private save(request$: Observable<DespesaResponse>): void {
    this.loading = true;
    request$
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.pendingPayload = null;
          this.resetForm();
          this.saved.emit();
          this.visibleChange.emit(false);
        },
        error: () => {
          this.errorMessage = 'Nao foi possivel salvar a despesa. Verifique os dados e tente novamente.';
        }
      });
  }

  private updateConditionalValidators(recorrente: boolean): void {
    const dia = this.form.controls.diaPagamento;
    const data = this.form.controls.dataPagamento;

    if (recorrente) {
      dia.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
      data.clearValidators();
    } else {
      data.setValidators([Validators.required]);
      dia.clearValidators();
    }

    dia.updateValueAndValidity({ emitEvent: false });
    data.updateValueAndValidity({ emitEvent: false });
  }

  private toPayload(): DespesaRequest {
    const value = this.form.getRawValue();
    const payload: DespesaRequest = {
      descricao: value.descricao.trim(),
      valor: value.valor ?? 0,
      tipo: value.tipo,
      recorrente: value.recorrente
    };

    if (value.recorrente) {
      payload.diaPagamento = value.diaPagamento ?? 1;
    } else if (value.dataPagamento) {
      payload.dataPagamento = formatDate(value.dataPagamento, 'yyyy-MM-dd', 'pt-BR');
    }

    return payload;
  }

  private valorChanged(payload: DespesaRequest): boolean {
    return Number(payload.valor.toFixed(2)) !== Number((this.despesa?.valor ?? 0).toFixed(2));
  }

  private generalDataChanged(payload: DespesaRequest): boolean {
    if (!this.despesa) {
      return false;
    }

    const originalDate = this.despesa.dataPrevista ? new Date(`${this.despesa.dataPrevista}T00:00:00`) : null;
    const originalDay = originalDate?.getDate();

    return (
      payload.descricao !== this.despesa.descricao ||
      payload.tipo !== this.despesa.tipo ||
      payload.recorrente !== this.despesa.recorrente ||
      (payload.recorrente && payload.diaPagamento !== originalDay) ||
      (!payload.recorrente && payload.dataPagamento !== this.despesa.dataPrevista)
    );
  }

  private getDespesaId(despesa: DespesaLancamento): number {
    return despesa.despesaId ?? despesa.id;
  }
}
