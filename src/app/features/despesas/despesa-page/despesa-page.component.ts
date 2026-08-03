import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { finalize } from 'rxjs';
import { MesResumo, DespesaLancamento } from '../../../core/models/despesa.models';
import { DespesaService } from '../../../core/services/despesa.service';
import { DespesaDetalheDialogComponent } from '../despesa-detalhe-dialog/despesa-detalhe-dialog.component';
import { DespesaFabButtonComponent } from '../despesa-fab-button/despesa-fab-button.component';
import { DespesaFormDialogComponent } from '../despesa-form-dialog/despesa-form-dialog.component';
import { DespesaMesCardListComponent } from '../despesa-mes-card-list/despesa-mes-card-list.component';

@Component({
  selector: 'app-despesa-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    MessageModule,
    DespesaDetalheDialogComponent,
    DespesaFabButtonComponent,
    DespesaFormDialogComponent,
    DespesaMesCardListComponent
  ],
  templateUrl: './despesa-page.component.html',
  styleUrl: './despesa-page.component.scss'
})
export class DespesaPageComponent {
  formVisible = false;
  detalheVisible = false;
  editErrorMessage = '';
  refreshKey = 0;
  selectedMonth: MesResumo | null = null;
  selectedDespesa: DespesaLancamento | null = null;

  constructor(private readonly despesaService: DespesaService) {}

  openCreate(): void {
    this.selectedDespesa = null;
    this.formVisible = true;
  }

  openDetalhe(mes: MesResumo): void {
    this.selectedMonth = mes;
    this.detalheVisible = true;
  }

  openEdit(mes: MesResumo): void {
    this.editErrorMessage = '';
    this.openDetalhe(mes);
  }

  editDespesa(despesa: DespesaLancamento): void {
    this.selectedDespesa = despesa;
    this.formVisible = true;
  }

  onSaved(): void {
    this.refreshKey += 1;
  }

  inativarDespesa(despesa: DespesaLancamento): void {
    this.despesaService
      .inativar(despesa.id)
      .pipe(finalize(() => {}))
      .subscribe({
        next: () => {
          this.refreshKey += 1;
        },
        error: () => {
          this.editErrorMessage = 'Não foi possível inativar o lançamento.';
        }
      });
  }
}
