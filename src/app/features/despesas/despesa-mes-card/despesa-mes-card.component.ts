import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MesResumo } from '../../../core/models/despesa.models';

@Component({
  selector: 'app-despesa-mes-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ButtonModule, CardModule, SkeletonModule],
  templateUrl: './despesa-mes-card.component.html',
  styleUrl: './despesa-mes-card.component.scss'
})
export class DespesaMesCardComponent {
  @Input({ required: true }) mes!: MesResumo;
  @Output() readonly view = new EventEmitter<MesResumo>();
  @Output() readonly edit = new EventEmitter<MesResumo>();
}
