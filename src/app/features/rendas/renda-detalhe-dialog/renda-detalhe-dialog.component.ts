import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RendaLancamento } from '../../../core/models/renda.models';
import { RendaService } from '../../../core/services/renda.service';

@Component({
  selector: 'app-renda-detalhe-dialog',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ButtonModule, DialogModule, MessageModule, ProgressSpinnerModule, TableModule, TagModule],
  templateUrl: './renda-detalhe-dialog.component.html'
})
export class RendaDetalheDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() periodo = '';
  @Input() label = '';
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  lancamentos: RendaLancamento[] = [];
  loading = false;
  errorMessage = '';

  constructor(private readonly rendaService: RendaService) {}

  ngOnChanges(changes: SimpleChanges): void {
    const shouldLoad = this.visible && this.periodo && (changes['visible']?.currentValue === true || changes['periodo']);
    if (shouldLoad) {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.rendaService
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
}
