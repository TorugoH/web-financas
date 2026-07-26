import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./features/auth/cadastro/cadastro.component').then((m) => m.CadastroComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/authenticated-layout/authenticated-layout.component').then((m) => m.AuthenticatedLayoutComponent),
    children: [
      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil.component').then((m) => m.PerfilComponent)
      },
      {
        path: 'rendas',
        loadComponent: () => import('./features/rendas/renda-page/renda-page.component').then((m) => m.RendaPageComponent)
      }
    ]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'rendas'
  },
  {
    path: '**',
    redirectTo: 'rendas'
  }
];
