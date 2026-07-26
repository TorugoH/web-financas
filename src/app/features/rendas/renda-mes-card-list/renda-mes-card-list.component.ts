import { CommonModule, formatDate } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { catchError, of } from 'rxjs';
import { MesResumo, RendaTotalResponse } from '../../../core/models/renda.models';
import { RendaService } from '../../../core/services/renda.service';
import { RendaMesCardComponent } from '../renda-mes-card/renda-mes-card.component';

@Component({
  selector: 'app-renda-mes-card-list',
  standalone: true,
  imports: [CommonModule, RendaMesCardComponent],
  templateUrl: './renda-mes-card-list.component.html',
  styleUrl: './renda-mes-card-list.component.scss'
})
export class RendaMesCardListComponent implements AfterViewInit, OnChanges {
  @Input() refreshKey = 0;
  @Output() readonly monthSelected = new EventEmitter<MesResumo>();
  @ViewChild('scroller') private scroller?: ElementRef<HTMLDivElement>;

  meses: MesResumo[] = this.buildMonths();

  constructor(private readonly rendaService: RendaService) {
    this.loadTotals();
  }

  ngAfterViewInit(): void {
    window.setTimeout(() => this.centerCurrentMonth(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange) {
      this.loadTotals();
    }
  }

  trackByPeriodo(_: number, mes: MesResumo): string {
    return mes.periodo;
  }

  private loadTotals(): void {
    this.meses = this.meses.map((mes) => ({ ...mes, loading: true, erro: undefined }));

    this.meses.forEach((mes, index) => {
      this.rendaService
        .total(mes.periodo)
        .pipe(
          catchError(() =>
            of<RendaTotalResponse>({
              periodo: mes.periodo,
              total: 0
            })
          )
        )
        .subscribe((response) => {
          this.meses[index] = {
            ...this.meses[index],
            total: response.total,
            loading: false,
            erro: response.periodo === mes.periodo ? undefined : 'Falha ao carregar'
          };
        });
    });
  }

  private buildMonths(): MesResumo[] {
    const now = new Date();
    const currentPeriod = formatDate(now, 'yyyy-MM', 'pt-BR');
    const months: MesResumo[] = [];

    for (let offset = -12; offset <= 12; offset += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const periodo = formatDate(date, 'yyyy-MM', 'pt-BR');
      months.push({
        periodo,
        label: formatDate(date, 'MMMM yyyy', 'pt-BR'),
        total: 0,
        loading: true,
        atual: periodo === currentPeriod
      });
    }

    return months;
  }

  private centerCurrentMonth(): void {
    const container = this.scroller?.nativeElement;
    if (!container) {
      return;
    }

    const current = container.querySelector<HTMLElement>('.current-card');
    if (!current) {
      return;
    }

    container.scrollLeft = current.offsetLeft - container.clientWidth / 2 + current.clientWidth / 2;
  }
}
