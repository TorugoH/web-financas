import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, PasswordModule],
  templateUrl: './cadastro.component.html'
})
export class CadastroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group(
    {
      nome: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmacao: ['', Validators.required]
    },
    { validators: [this.senhasIguais] }
  );

  loading = false;
  errorMessage = '';

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, email, password } = this.form.getRawValue();
    this.loading = true;
    this.authService
      .registrar({ nome, email, password })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/rendas'),
        error: () => {
          this.errorMessage = 'Não foi possível concluir o cadastro. Verifique os dados e tente novamente.';
        }
      });
  }

  private senhasIguais(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value as string | undefined;
    const confirmacao = control.get('confirmacao')?.value as string | undefined;
    return password && confirmacao && password !== confirmacao ? { senhasDiferentes: true } : null;
  }
}
