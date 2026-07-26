import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MesResumo, RendaLancamento } from '../../../core/models/renda.models';
import { RendaDetalheDialogComponent } from '../renda-detalhe-dialog/renda-detalhe-dialog.component';
import { RendaFabButtonComponent } from '../renda-fab-button/renda-fab-button.component';
import { RendaFormDialogComponent } from '../renda-form-dialog/renda-form-dialog.component';
import { RendaMesCardListComponent } from '../renda-mes-card-list/renda-mes-card-list.component';

@Component({
  selector: 'app-renda-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    MessageModule,
    RendaDetalheDialogComponent,
    RendaFabButtonComponent,
    RendaFormDialogComponent,
    RendaMesCardListComponent
  ],
  templateUrl: './renda-page.component.html',
  styleUrl: './renda-page.component.scss'
})
export class RendaPageComponent {
  formVisible = false;
  detalheVisible = false;
  editErrorMessage = '';
  refreshKey = 0;
  selectedMonth: MesResumo | null = null;
  selectedRenda: RendaLancamento | null = null;

  openCreate(): void {
    this.selectedRenda = null;
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

  editRenda(renda: RendaLancamento): void {
    this.selectedRenda = renda;
    this.formVisible = true;
  }

  onSaved(): void {
    this.refreshKey += 1;
  }
}
