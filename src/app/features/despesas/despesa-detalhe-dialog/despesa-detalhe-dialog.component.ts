import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DespesaLancamento } from '../../../core/models/despesa.models';
import { DespesaService } from '../../../core/services/despesa.service';
import {ConfirmationService} from 'primeng/api';
import {ConfirmDialogModule} from 'primeng/confirmdialog';

@Component({
  selector: 'app-despesa-detalhe-dialog',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ButtonModule, MessageModule, ProgressSpinnerModule, SidebarModule, TableModule, TagModule, ConfirmDialogModule ],
  providers: [ConfirmationService],
  templateUrl: './despesa-detalhe-dialog.component.html',
  styleUrl: './despesa-detalhe-dialog.component.scss'
})
export class DespesaDetalheDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() periodo = '';
  @Input() label = '';
  @Input() refreshKey = 0;
  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly editDespesa = new EventEmitter<DespesaLancamento>();
  @Output() inativarLancamento = new EventEmitter<DespesaLancamento>();

  lancamentos: DespesaLancamento[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private readonly despesaService: DespesaService,
    private confirmationService: ConfirmationService
  ) {}

  close(): void {
    this.visibleChange.emit(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const shouldLoad =
      this.visible &&
      this.periodo &&
      (changes['visible']?.currentValue === true || changes['periodo'] || (!changes['refreshKey']?.firstChange && changes['refreshKey']));
    if (shouldLoad) {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.despesaService
      .lancamentos(this.periodo)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (items) => {
          this.lancamentos = items;
        },
        error: () => {
          this.lancamentos = [];
          this.errorMessage = 'Não foi possível carregar o extrato deste mês.';
        }
      });
  }

  confirmarInativar(lancamento: DespesaLancamento): void {
    this.confirmationService.confirm({
      message: `Deseja inativar o lançamento "${lancamento.descricao}"?`,
      header: 'Confirmar inativação',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, inativar',
      rejectLabel: 'Cancelar',
      accept: () => this.inativarLancamento.emit(lancamento)
    });
  }
}
