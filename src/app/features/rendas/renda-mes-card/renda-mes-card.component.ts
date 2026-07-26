import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MesResumo } from '../../../core/models/renda.models';

@Component({
  selector: 'app-renda-mes-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ButtonModule, CardModule, SkeletonModule],
  templateUrl: './renda-mes-card.component.html',
  styleUrl: './renda-mes-card.component.scss'
})
export class RendaMesCardComponent {
  @Input({ required: true }) mes!: MesResumo;
  @Output() readonly view = new EventEmitter<MesResumo>();
  @Output() readonly edit = new EventEmitter<MesResumo>();
}
