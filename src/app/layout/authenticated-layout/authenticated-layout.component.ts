import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-authenticated-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, SidebarModule],
  templateUrl: './authenticated-layout.component.html',
  styleUrl: './authenticated-layout.component.scss'
})
export class AuthenticatedLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  sidebarVisible = !this.isMobileViewport();
  isMobile = this.isMobileViewport();

  @HostListener('window:resize')
  onResize(): void {
    const nextIsMobile = this.isMobileViewport();
    this.isMobile = nextIsMobile;
    this.sidebarVisible = !nextIsMobile;
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  closeMobileSidebar(): void {
    if (this.isMobile) {
      this.sidebarVisible = false;
    }
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' ? window.innerWidth < 900 : false;
  }
}
