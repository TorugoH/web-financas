import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './perfil.component.html'
})
export class PerfilComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;
}
