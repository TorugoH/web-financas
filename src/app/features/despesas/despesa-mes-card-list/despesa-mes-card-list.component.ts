import { CommonModule, formatDate } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { catchError, of } from 'rxjs';
import { MesResumo, DespesaTotalResponse } from '../../../core/models/despesa.models';
import { DespesaService } from '../../../core/services/despesa.service';
import { DespesaMesCardComponent } from '../despesa-mes-card/despesa-mes-card.component';

@Component({
  selector: 'app-despesa-mes-card-list',
  standalone: true,
  imports: [CommonModule, DespesaMesCardComponent],
  templateUrl: './despesa-mes-card-list.component.html',
  styleUrl: './despesa-mes-card-list.component.scss'
})
export class DespesaMesCardListComponent implements AfterViewInit, OnChanges {
  @Input() refreshKey = 0;
  @Output() readonly viewMonth = new EventEmitter<MesResumo>();
  @Output() readonly editMonth = new EventEmitter<MesResumo>();
  @ViewChild('scroller') private scroller?: ElementRef<HTMLDivElement>;

  meses: MesResumo[] = this.buildMonths();

  constructor(private readonly despesaService: DespesaService) {
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
      this.despesaService
        .total(mes.periodo)
        .pipe(
          catchError(() =>
            of<DespesaTotalResponse>({
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
    const currentYear = now.getFullYear();
    const currentPeriod = formatDate(now, 'yyyy-MM', 'pt-BR');
    const months: MesResumo[] = [];

    for (let month = 0; month < 12; month += 1) {
      const date = new Date(currentYear, month, 1);
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

    current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
