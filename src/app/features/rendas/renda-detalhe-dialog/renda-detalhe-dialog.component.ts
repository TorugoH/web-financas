import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RendaLancamento } from '../../../core/models/renda.models';
import { RendaService } from '../../../core/services/renda.service';

@Component({
  selector: 'app-renda-detalhe-dialog',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ButtonModule, MessageModule, ProgressSpinnerModule, SidebarModule, TableModule, TagModule],
  templateUrl: './renda-detalhe-dialog.component.html',
  styleUrl: './renda-detalhe-dialog.component.scss'
})
export class RendaDetalheDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() periodo = '';
  @Input() label = '';
  @Input() refreshKey = 0;
  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @Output() readonly editRenda = new EventEmitter<RendaLancamento>();

  lancamentos: RendaLancamento[] = [];
  loading = false;
  errorMessage = '';

  constructor(private readonly rendaService: RendaService) {}

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
