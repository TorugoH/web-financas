import { Component, EventEmitter, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-renda-fab-button',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <p-button
      icon="pi pi-plus"
      [rounded]="true"
      size="large"
      styleClass="renda-fab"
      ariaLabel="Adicionar renda"
      (onClick)="add.emit()"
    />
  `,
  styles: [
    `
      :host {
        position: fixed;
        right: 1.5rem;
        bottom: 1.5rem;
        z-index: 1000;
      }

      @media (min-width: 1280px) {
        :host {
          right: calc((100vw - 1180px) / 2 - 0.5rem);
        }
      }

      :host ::ng-deep .renda-fab {
        box-shadow: 0 12px 28px rgba(15, 159, 143, 0.28);
        height: 3.25rem;
        width: 3.25rem;
      }
    `
  ]
})
export class RendaFabButtonComponent {
  @Output() readonly add = new EventEmitter<void>();
}
