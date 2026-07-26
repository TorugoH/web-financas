import { CommonModule, formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { RendaRequest, RendaTipo } from '../../../core/models/renda.models';
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
  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly tipos: TipoOption[] = [
    { label: 'Salário', value: 'SALARIO' },
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

  constructor(private readonly rendaService: RendaService) {
    this.form.controls.recorrente.valueChanges.subscribe((recorrente) => this.updateConditionalValidators(recorrente));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.errorMessage = '';
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
    this.loading = true;
    this.rendaService
      .criar(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.form.reset({
            descricao: '',
            valor: null,
            tipo: 'SALARIO',
            recorrente: true,
            diaRecebimento: 5,
            dataRecebimento: null
          });
          this.saved.emit();
          this.visibleChange.emit(false);
        },
        error: () => {
          this.errorMessage = 'Não foi possível salvar a renda. Verifique os dados e tente novamente.';
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
}
