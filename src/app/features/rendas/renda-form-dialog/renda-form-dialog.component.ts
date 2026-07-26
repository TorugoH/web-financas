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
import { RendaLancamento, RendaRequest, RendaResponse, RendaTipo, RendaValorEscopo } from '../../../core/models/renda.models';
import { RendaService } from '../../../core/services/renda.service';

interface TipoOption {
  label: string;
  value: RendaTipo;
}

interface RendaFormValue {
  descricao: FormControl<string>;
  valor: FormControl<number | null>;
  tipo: FormControl<RendaTipo>;
  recorrente: FormControl<boolean>;
  diaRecebimento: FormControl<number | null>;
  dataRecebimento: FormControl<Date | null>;
}

@Component({
  selector: 'app-renda-form-dialog',
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
  templateUrl: './renda-form-dialog.component.html'
})
export class RendaFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() renda: RendaLancamento | null = null;
  @Input() mesReferencia = '';
  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly tipos: TipoOption[] = [
    { label: 'Salario', value: 'SALARIO' },
    { label: 'Freelance', value: 'FREELANCE' },
    { label: 'Investimento', value: 'INVESTIMENTO' },
    { label: 'Outro', value: 'OUTRO' }
  ];

  readonly form = new FormGroup<RendaFormValue>({
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    valor: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipo: new FormControl<RendaTipo>('SALARIO', { nonNullable: true, validators: [Validators.required] }),
    recorrente: new FormControl(true, { nonNullable: true }),
    diaRecebimento: new FormControl<number | null>(5, [Validators.required, Validators.min(1), Validators.max(31)]),
    dataRecebimento: new FormControl<Date | null>(null)
  });

  loading = false;
  errorMessage = '';
  scopeDialogVisible = false;
  private pendingPayload: RendaRequest | null = null;

  get editing(): boolean {
    return Boolean(this.renda);
  }

  constructor(private readonly rendaService: RendaService) {
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

    if (this.renda && this.valorChanged(payload) && this.renda.recorrente) {
      this.pendingPayload = payload;
      this.scopeDialogVisible = true;
      return;
    }

    const request$ = this.renda
      ? this.rendaService.atualizarDadosGerais(this.getRendaId(this.renda), payload)
      : this.rendaService.criar(payload);

    this.save(request$);
  }

  confirmValorScope(escopo: RendaValorEscopo): void {
    if (!this.renda || !this.pendingPayload) {
      return;
    }

    const renda = this.renda;
    const payload = this.pendingPayload;
    const rendaId = this.getRendaId(renda);
    const valorRequest = {
      novoValor: payload.valor,
      mesReferencia: this.mesReferencia,
      escopo
    };

    const request$ = this.generalDataChanged(payload)
      ? this.rendaService
          .atualizarDadosGerais(rendaId, { ...payload, valor: renda.valor })
          .pipe(switchMap(() => this.rendaService.atualizarValor(rendaId, valorRequest)))
      : this.rendaService.atualizarValor(rendaId, valorRequest);

    this.scopeDialogVisible = false;
    this.save(request$);
  }

  cancelValorScope(): void {
    this.pendingPayload = null;
    this.scopeDialogVisible = false;
  }

  private populateForm(): void {
    if (!this.renda) {
      this.resetForm();
      return;
    }

    const dataPrevista = this.renda.dataPrevista ? new Date(`${this.renda.dataPrevista}T00:00:00`) : null;
    this.form.reset({
      descricao: this.renda.descricao,
      valor: this.renda.valor,
      tipo: this.renda.tipo,
      recorrente: this.renda.recorrente,
      diaRecebimento: this.renda.recorrente && dataPrevista ? dataPrevista.getDate() : 5,
      dataRecebimento: this.renda.recorrente ? null : dataPrevista
    });
  }

  private resetForm(): void {
    this.form.reset({
      descricao: '',
      valor: null,
      tipo: 'SALARIO',
      recorrente: true,
      diaRecebimento: 5,
      dataRecebimento: null
    });
  }

  private save(request$: Observable<RendaResponse>): void {
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
          this.errorMessage = 'Nao foi possivel salvar a renda. Verifique os dados e tente novamente.';
        }
      });
  }

  private updateConditionalValidators(recorrente: boolean): void {
    const dia = this.form.controls.diaRecebimento;
    const data = this.form.controls.dataRecebimento;

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

  private toPayload(): RendaRequest {
    const value = this.form.getRawValue();
    const payload: RendaRequest = {
      descricao: value.descricao.trim(),
      valor: value.valor ?? 0,
      tipo: value.tipo,
      recorrente: value.recorrente
    };

    if (value.recorrente) {
      payload.diaRecebimento = value.diaRecebimento ?? 1;
    } else if (value.dataRecebimento) {
      payload.dataRecebimento = formatDate(value.dataRecebimento, 'yyyy-MM-dd', 'pt-BR');
    }

    return payload;
  }

  private valorChanged(payload: RendaRequest): boolean {
    return Number(payload.valor.toFixed(2)) !== Number((this.renda?.valor ?? 0).toFixed(2));
  }

  private generalDataChanged(payload: RendaRequest): boolean {
    if (!this.renda) {
      return false;
    }

    const originalDate = this.renda.dataPrevista ? new Date(`${this.renda.dataPrevista}T00:00:00`) : null;
    const originalDay = originalDate?.getDate();

    return (
      payload.descricao !== this.renda.descricao ||
      payload.tipo !== this.renda.tipo ||
      payload.recorrente !== this.renda.recorrente ||
      (payload.recorrente && payload.diaRecebimento !== originalDay) ||
      (!payload.recorrente && payload.dataRecebimento !== this.renda.dataPrevista)
    );
  }

  private getRendaId(renda: RendaLancamento): number {
    return renda.rendaId ?? renda.id;
  }
}
