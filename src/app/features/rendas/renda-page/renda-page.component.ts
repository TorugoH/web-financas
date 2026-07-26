import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../core/services/auth.service';
import { MesResumo } from '../../../core/models/renda.models';
import { RendaDetalheDialogComponent } from '../renda-detalhe-dialog/renda-detalhe-dialog.component';
import { RendaFabButtonComponent } from '../renda-fab-button/renda-fab-button.component';
import { RendaFormDialogComponent } from '../renda-form-dialog/renda-form-dialog.component';
import { RendaMesCardListComponent } from '../renda-mes-card-list/renda-mes-card-list.component';

@Component({
  selector: 'app-renda-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    RendaDetalheDialogComponent,
    RendaFabButtonComponent,
    RendaFormDialogComponent,
    RendaMesCardListComponent
  ],
  templateUrl: './renda-page.component.html',
  styleUrl: './renda-page.component.scss'
})
export class RendaPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  formVisible = false;
  detalheVisible = false;
  refreshKey = 0;
  selectedMonth: MesResumo | null = null;
  readonly user = this.authService.user;

  openDetalhe(mes: MesResumo): void {
    this.selectedMonth = mes;
    this.detalheVisible = true;
  }

  onSaved(): void {
    this.refreshKey += 1;
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
