import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { PrimeNGConfig } from 'primeng/api';
import { CalendarModule } from 'primeng/calendar';
import { DespesaLancamento, DespesaRequest, DespesaTipo } from '../../../core/models/despesa.models';
import { DespesasXRenda } from '../../../core/models/DespesasXRenda.model';
import { RendaLancamento, RendaRequest, RendaTipo } from '../../../core/models/renda.models';
import { AuthService } from '../../../core/services/auth.service';
import { DespesaService } from '../../../core/services/despesa.service';
import { RendaService } from '../../../core/services/renda.service';
import { DespesaFormDialogComponent } from '../../despesas/despesa-form-dialog/despesa-form-dialog.component';
import { RendaFormDialogComponent } from '../../rendas/renda-form-dialog/renda-form-dialog.component';

type DashboardTab = 'resumo' | 'rendas' | 'despesas' | 'investimentos' | 'simulacao' | 'lancamentos' | 'adicionar';
type LancamentoTipo = 'DESPESA' | 'RENDA' | 'INVESTIMENTO';
type LancamentoFiltro = LancamentoTipo | 'TODOS';

interface TipoOption<T> {
  label: string;
  value: T;
}

interface MesOption {
  label: string;
  value: string;
}

interface LancamentoResumo {
  id: string;
  tipoMovimento: LancamentoTipo;
  descricao: string;
  categoria: string;
  valor: number;
  dataPrevista: string;
  data: Date;
}

interface ChartPoint {
  label: string;
  renda: number;
  investimento: number;
  despesa: number;
}

interface Investimento {
  id: string;
  descricao: string;
  tipo: string;
  valorAplicado: number;
  taxaAnual: number;
  dataAplicacao: string;
  origem: 'api' | 'local';
}

interface DespesaFormValue {
  descricao: FormControl<string>;
  valor: FormControl<number | null>;
  tipo: FormControl<DespesaTipo>;
  dataPagamento: FormControl<string>;
}

interface RendaFormValue {
  descricao: FormControl<string>;
  valor: FormControl<number | null>;
  tipo: FormControl<RendaTipo>;
  dataRecebimento: FormControl<string>;
}

interface InvestimentoFormValue {
  descricao: FormControl<string>;
  tipo: FormControl<string>;
  valorAplicado: FormControl<number | null>;
  taxaAnual: FormControl<number | null>;
  dataAplicacao: FormControl<string>;
}

interface SimulacaoFormValue {
  valorInicial: FormControl<number | null>;
  aporteMensal: FormControl<number | null>;
  taxaAnual: FormControl<number | null>;
  meses: FormControl<number | null>;
}

@Component({
  selector: 'app-analise-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CalendarModule, RendaFormDialogComponent, DespesaFormDialogComponent],
  templateUrl: './analise-page.component.html',
  styleUrl: './analise-page.component.scss'
})
export class AnalisePageComponent implements OnInit {
  readonly tabs: Array<{ label: string; value: DashboardTab }> = [
    { label: 'Resumo', value: 'resumo' },
    { label: 'Rendas', value: 'rendas' },
    { label: 'Despesas', value: 'despesas' },
    { label: 'Investimentos', value: 'investimentos' },
    { label: 'Simulacao', value: 'simulacao' },
    { label: 'Lancamentos', value: 'lancamentos' },
    { label: 'Adicionar', value: 'adicionar' }
  ];

  readonly despesaTipos: Array<TipoOption<DespesaTipo>> = [
    { label: 'ALIMENTACAO', value: 'ALIMENTACAO' },
    { label: 'MORADIA', value: 'MORADIA' },
    { label: 'TRANSPORTE', value: 'TRANSPORTE' },
    { label: 'LAZER', value: 'LAZER' },
    { label: 'SAUDE', value: 'SAUDE' },
    { label: 'EDUCACAO', value: 'EDUCACAO' },
    { label: 'OUTRO', value: 'OUTRO' }
  ];

  readonly rendaTipos: Array<TipoOption<RendaTipo>> = [
    { label: 'SALARIO', value: 'SALARIO' },
    { label: 'FREELANCE', value: 'FREELANCE' },
    { label: 'INVESTIMENTO', value: 'INVESTIMENTO' },
    { label: 'OUTRO', value: 'OUTRO' }
  ];

  readonly investimentoTipos = ['CDB', 'Tesouro Direto', 'LCI/LCA', 'Fundo', 'Acao', 'Cripto', 'Outro'];
  readonly today = new Date();

  dados: DespesasXRenda[] = [];
  despesas: DespesaLancamento[] = [];
  rendas: RendaLancamento[] = [];
  investimentosLocais: Investimento[] = [];
  abaSelecionada: DashboardTab = 'resumo';
  carregando = false;
  salvandoDespesa = false;
  salvandoRenda = false;
  salvandoInvestimento = false;
  errorMessage = '';
  successMessage = '';
  diaCorte = 10;
  dataInicio: Date | null = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  dataFim: Date | null = new Date(this.today.getFullYear(), this.today.getMonth() + 6, 0);
  mesSelecionado = formatDate(this.mesReferenciaAtual, 'yyyy-MM', 'pt-BR');
  mesSelecionadoDateValue: Date | null = this.monthInputToDate(this.mesSelecionado);
  lancamentoFiltro: LancamentoFiltro = 'TODOS';
  lancamentoDataInicio: Date | null = this.startOfDay(this.today);
  lancamentoDataFim: Date | null = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + 30);
  rendaDialogVisible = false;
  despesaDialogVisible = false;
  selectedRenda: RendaLancamento | null = null;
  selectedDespesa: DespesaLancamento | null = null;

  readonly formInvestimento = new FormGroup<InvestimentoFormValue>({
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipo: new FormControl('CDB', { nonNullable: true, validators: [Validators.required] }),
    valorAplicado: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    taxaAnual: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    dataAplicacao: new FormControl(this.toInputDate(this.today), { nonNullable: true, validators: [Validators.required] })
  });

  readonly formDespesa = new FormGroup<DespesaFormValue>({
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    valor: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipo: new FormControl<DespesaTipo>('OUTRO', { nonNullable: true, validators: [Validators.required] }),
    dataPagamento: new FormControl(this.toInputDate(this.today), { nonNullable: true, validators: [Validators.required] })
  });

  readonly formRenda = new FormGroup<RendaFormValue>({
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    valor: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipo: new FormControl<RendaTipo>('SALARIO', { nonNullable: true, validators: [Validators.required] }),
    dataRecebimento: new FormControl(this.toInputDate(this.today), { nonNullable: true, validators: [Validators.required] })
  });

  readonly formSimulacao = new FormGroup<SimulacaoFormValue>({
    valorInicial: new FormControl<number | null>(1000, [Validators.required, Validators.min(0)]),
    aporteMensal: new FormControl<number | null>(200, [Validators.required, Validators.min(0)]),
    taxaAnual: new FormControl<number | null>(12, [Validators.required, Validators.min(0)]),
    meses: new FormControl<number | null>(12, [Validators.required, Validators.min(1)])
  });

  constructor(
    private readonly despesaService: DespesaService,
    private readonly rendaService: RendaService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly primengConfig: PrimeNGConfig
  ) {
    this.primengConfig.setTranslation({
      accept: 'Sim',
      reject: 'Nao',
      clear: 'Limpar',
      today: 'Hoje',
      dayNames: ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'],
      dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
      dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
      monthNames: [
        'janeiro',
        'fevereiro',
        'marco',
        'abril',
        'maio',
        'junho',
        'julho',
        'agosto',
        'setembro',
        'outubro',
        'novembro',
        'dezembro'
      ],
      monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
      firstDayOfWeek: 0,
      dateFormat: 'dd/mm/yy'
    });
  }

  ngOnInit(): void {
    this.buscarDados();
  }

  get periodoInicio(): Date {
    return this.startOfDay(this.dataInicio ?? this.today);
  }

  get periodoFim(): Date {
    return this.startOfDay(this.dataFim ?? this.today);
  }

  get despesasFiltradas(): DespesaLancamento[] {
    return this.despesas.filter((despesa) => this.isDentroPeriodo(despesa.dataPrevista));
  }

  get rendasFiltradas(): RendaLancamento[] {
    return this.rendas.filter((renda) => this.isDentroPeriodo(renda.dataPrevista));
  }

  get rendasSemInvestimento(): RendaLancamento[] {
    return this.rendasFiltradas.filter((renda) => renda.tipo !== 'INVESTIMENTO');
  }

  get rendasDoMesSelecionado(): RendaLancamento[] {
    return this.rendas
      .filter((renda) => renda.tipo !== 'INVESTIMENTO')
      .filter((renda) => this.isMesmoMes(renda.dataPrevista, this.mesSelecionado))
      .sort((a, b) => this.toDate(a.dataPrevista).getTime() - this.toDate(b.dataPrevista).getTime());
  }

  get despesasDoMesSelecionado(): DespesaLancamento[] {
    return this.despesas
      .filter((despesa) => this.isMesmoMes(despesa.dataPrevista, this.mesSelecionado))
      .sort((a, b) => this.toDate(a.dataPrevista).getTime() - this.toDate(b.dataPrevista).getTime());
  }

  get investimentos(): Investimento[] {
    const investimentosApi = this.rendas
      .filter((renda) => renda.tipo === 'INVESTIMENTO')
      .filter((renda) => !this.hasLocalInvestmentMatch(renda))
      .map((renda) => ({
        id: `api-${renda.id}`,
        descricao: renda.descricao,
        tipo: 'Investimento',
        valorAplicado: Number(renda.valor || 0),
        taxaAnual: 0,
        dataAplicacao: renda.dataPrevista,
        origem: 'api' as const
      }));

    return [...investimentosApi, ...this.investimentosLocais].sort(
      (a, b) => this.toDate(a.dataAplicacao).getTime() - this.toDate(b.dataAplicacao).getTime()
    );
  }

  get mesAtualLabel(): string {
    return this.formatFullMonth(this.mesReferenciaAtual);
  }

  get mesSeguinteLabel(): string {
    return this.formatFullMonth(this.mesReferenciaSeguinte);
  }

  get mesSelecionadoLabel(): string {
    return this.formatFullMonth(this.monthInputToDate(this.mesSelecionado));
  }

  get miniCalendarioTitulo(): string {
    return this.abaSelecionada === 'despesas' ? 'Calendário de despesas' : 'Calendário de rendas';
  }

  get miniCalendarioSubtitulo(): string {
    return 'Total por mês';
  }

  get mesesDisponiveis(): MesOption[] {
    const meses = new Set<string>(this.mesesParaLancamentos());

    this.dados.forEach((item) => meses.add(formatDate(this.toDate(String(item.dataReferencia)), 'yyyy-MM', 'pt-BR')));
    this.rendas.forEach((item) => meses.add(formatDate(this.toDate(item.dataPrevista), 'yyyy-MM', 'pt-BR')));
    this.despesas.forEach((item) => meses.add(formatDate(this.toDate(item.dataPrevista), 'yyyy-MM', 'pt-BR')));

    return [...meses]
      .sort((a, b) => this.monthInputToDate(a).getTime() - this.monthInputToDate(b).getTime())
      .map((value) => ({ value, label: this.formatFullMonth(this.monthInputToDate(value)) }));
  }

  get totalRendas(): number {
    return this.rendasSemInvestimento.reduce((sum, renda) => sum + Number(renda.valor || 0), 0);
  }

  get totalDespesas(): number {
    return this.despesasFiltradas.reduce((sum, despesa) => sum + Number(despesa.valor || 0), 0);
  }

  get totalRendasMesSelecionado(): number {
    return this.rendasDoMesSelecionado.reduce((sum, renda) => sum + Number(renda.valor || 0), 0);
  }

  get totalDespesasMesSelecionado(): number {
    return this.despesasDoMesSelecionado.reduce((sum, despesa) => sum + Number(despesa.valor || 0), 0);
  }

  get patrimonioInvestido(): number {
    return this.investimentos.reduce((sum, investimento) => sum + investimento.valorAplicado, 0);
  }

  get valorAtualInvestimentos(): number {
    return this.investimentos.reduce((sum, investimento) => sum + this.calcularValorAtual(investimento), 0);
  }

  get rendimentoDia(): number {
    return this.investimentos.reduce((sum, investimento) => sum + this.rendimentoPorPeriodo(investimento, 1), 0);
  }

  get rendimentoMes(): number {
    return this.investimentos.reduce((sum, investimento) => sum + this.rendimentoPorPeriodo(investimento, 30), 0);
  }

  get saldoPeriodo(): number {
    return this.totalRendas + this.patrimonioInvestido - this.totalDespesas;
  }

  get mesAtualResumo(): DespesasXRenda | null {
    return this.findResumoMensal(this.mesReferenciaAtual);
  }

  get mesSeguinteResumo(): DespesasXRenda | null {
    return this.findResumoMensal(this.mesReferenciaSeguinte);
  }

  get resumosFiltrados(): DespesasXRenda[] {
    return [...this.dados]
      .filter((item) => this.isDentroPeriodo(String(item.dataReferencia)))
      .sort((a, b) => this.toDate(String(a.dataReferencia)).getTime() - this.toDate(String(b.dataReferencia)).getTime());
  }

  get chartPoints(): ChartPoint[] {
    return this.resumosFiltrados
      .map((item) => {
        const investimento = Number(item.valorInvestimento ?? 0);
        return {
          label: this.formatMonth(String(item.dataReferencia || item.mes)),
          renda: Math.max(Number(item.valorRenda || 0) - investimento, 0),
          investimento,
          despesa: Number(item.valorDespesa || 0)
        };
      });
  }

  get chartMax(): number {
    return Math.max(...this.chartPoints.flatMap((item) => [item.renda, item.investimento, item.despesa]), 1);
  }

  get totalLancamentosRenda(): number {
    return this.rendasSemInvestimento.length;
  }

  get totalLancamentosDespesa(): number {
    return this.despesasFiltradas.length;
  }

  get miniCalendarioRendas(): Array<{ periodo: string; label: string; total: number }> {
    return [...this.dados]
      .sort((a, b) => this.toDate(String(a.dataReferencia)).getTime() - this.toDate(String(b.dataReferencia)).getTime())
      .map((item) => ({
        periodo: formatDate(this.toDate(String(item.dataReferencia)), 'yyyy-MM', 'pt-BR'),
        label: this.formatMonth(String(item.dataReferencia || item.mes)),
        total: this.abaSelecionada === 'despesas' ? Number(item.valorDespesa || 0) : this.rendaSemInvestimento(item)
      }));
  }

  get evolucaoInvestimentos(): Array<{ periodo: string; label: string; total: number; acumulado: number }> {
    let acumulado = 0;

    return [...this.dados]
      .sort((a, b) => this.toDate(String(a.dataReferencia)).getTime() - this.toDate(String(b.dataReferencia)).getTime())
      .map((item) => {
        const total = Number(item.valorInvestimento || 0);
        acumulado += total;

        return {
          periodo: formatDate(this.toDate(String(item.dataReferencia)), 'yyyy-MM', 'pt-BR'),
          label: this.formatMonth(String(item.dataReferencia || item.mes)),
          total,
          acumulado
        };
      });
  }

  get investimentoChartPoints(): Array<{ periodo: string; label: string; total: number; acumulado: number }> {
    return this.evolucaoInvestimentos;
  }

  get investimentoChartMax(): number {
    return Math.max(...this.investimentoChartPoints.flatMap((item) => [item.total, item.acumulado]), 1);
  }

  get investimentoChartAxis(): number[] {
    const max = this.investimentoChartMax;
    return [1, 0.75, 0.5, 0.25, 0].map((fraction) => Math.round(max * fraction));
  }

  get despesasPorTipo(): Array<{ name: string; value: number; color: string }> {
    const colors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#7c3aed', '#0891b2'];
    const grouped = this.despesasFiltradas.reduce<Record<string, number>>((acc, despesa) => {
      acc[despesa.tipo] = (acc[despesa.tipo] ?? 0) + Number(despesa.valor || 0);
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }));
  }

  get lancamentosProximos(): LancamentoResumo[] {
    const despesas = this.despesas.map((despesa) => ({
      id: `despesa-${despesa.id}`,
      tipoMovimento: 'DESPESA' as const,
      descricao: despesa.descricao,
      categoria: despesa.tipo,
      valor: Number(despesa.valor || 0),
      dataPrevista: despesa.dataPrevista,
      data: this.toDate(despesa.dataPrevista)
    }));

    const rendas = this.rendas.map((renda) => ({
      id: `renda-${renda.id}`,
      tipoMovimento: renda.tipo === 'INVESTIMENTO' ? 'INVESTIMENTO' as const : 'RENDA' as const,
      descricao: renda.descricao,
      categoria: renda.tipo,
      valor: Number(renda.valor || 0),
      dataPrevista: renda.dataPrevista,
      data: this.toDate(renda.dataPrevista)
    }));

    return [...despesas, ...rendas].sort((a, b) => a.data.getTime() - b.data.getTime());
  }

  get lancamentosFiltrados(): LancamentoResumo[] {
    const inicio = this.startOfDay(this.lancamentoDataInicio ?? this.today);
    const fim = this.startOfDay(this.lancamentoDataFim ?? this.today);

    return this.lancamentosProximos.filter((item) => {
      const matchesTipo = this.lancamentoFiltro === 'TODOS' || item.tipoMovimento === this.lancamentoFiltro;
      return matchesTipo && item.data >= inicio && item.data <= fim;
    });
  }

  get simulacaoResultado(): number {
    const valorInicial = Number(this.formSimulacao.controls.valorInicial.value || 0);
    const aporteMensal = Number(this.formSimulacao.controls.aporteMensal.value || 0);
    const taxaMensal = Math.pow(1 + Number(this.formSimulacao.controls.taxaAnual.value || 0) / 100, 1 / 12) - 1;
    const meses = Number(this.formSimulacao.controls.meses.value || 0);
    let total = valorInicial;

    for (let i = 0; i < meses; i++) {
      total = total * (1 + taxaMensal) + aporteMensal;
    }

    return total;
  }

  buscarDados(): void {
    this.carregando = true;
    this.errorMessage = '';

    const meses = this.mesesParaLancamentos();
    forkJoin({
      dados: this.despesaService.dashboard(),
      despesasPorMes: forkJoin(meses.map((mes) => this.despesaService.lancamentos(mes))),
      rendasPorMes: forkJoin(meses.map((mes) => this.rendaService.lancamentos(mes)))
    })
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: ({ dados, despesasPorMes, rendasPorMes }) => {
          this.dados = dados;
          this.despesas = despesasPorMes.flat();
          this.rendas = rendasPorMes.flat();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = 'Nao foi possivel carregar o dashboard.';
        }
      });
  }

  selecionarAba(aba: DashboardTab): void {
    this.abaSelecionada = aba;
    this.successMessage = '';
    this.errorMessage = '';
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  abrirEdicaoRenda(renda: RendaLancamento): void {
    this.selectedRenda = renda;
    this.rendaDialogVisible = true;
  }

  abrirEdicaoDespesa(despesa: DespesaLancamento): void {
    this.selectedDespesa = despesa;
    this.despesaDialogVisible = true;
  }

  fecharDialogRenda(visible: boolean): void {
    this.rendaDialogVisible = visible;
    if (!visible) {
      this.selectedRenda = null;
    }
  }

  fecharDialogDespesa(visible: boolean): void {
    this.despesaDialogVisible = visible;
    if (!visible) {
      this.selectedDespesa = null;
    }
  }

  onRendaDialogSaved(): void {
    this.fecharDialogRenda(false);
    this.successMessage = 'Renda atualizada.';
    this.buscarDados();
  }

  onDespesaDialogSaved(): void {
    this.fecharDialogDespesa(false);
    this.successMessage = 'Despesa atualizada.';
    this.buscarDados();
  }

  atualizarMesSelecionado(data: Date | null): void {
    if (!data) {
      return;
    }

    this.mesSelecionadoDateValue = data;
    this.mesSelecionado = this.toInputMonth(data);
  }

  inativarRenda(lancamento: RendaLancamento): void {
    if (!confirm(`Deseja excluir a renda "${lancamento.descricao}"?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.rendaService.inativar(this.getRendaId(lancamento)).subscribe({
      next: () => {
        this.successMessage = 'Renda excluída.';
        this.buscarDados();
      },
      error: () => {
        this.errorMessage = 'Nao foi possivel excluir a renda.';
      }
    });
  }

  inativarDespesa(lancamento: DespesaLancamento): void {
    if (!confirm(`Deseja excluir a despesa "${lancamento.descricao}"?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.despesaService.inativar(this.getDespesaId(lancamento)).subscribe({
      next: () => {
        this.successMessage = 'Despesa excluída.';
        this.buscarDados();
      },
      error: () => {
        this.errorMessage = 'Nao foi possivel excluir a despesa.';
      }
    });
  }

  selecionarMes(periodo: string, aba: DashboardTab = 'rendas'): void {
    this.mesSelecionado = periodo;
    this.mesSelecionadoDateValue = this.monthInputToDate(periodo);
    this.selecionarAba(aba);
  }

  aplicarPeriodo(meses: number): void {
    this.dataInicio = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.dataFim = new Date(this.today.getFullYear(), this.today.getMonth() + meses, 0);
  }

  usarMesAtual(): void {
    this.dataInicio = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.dataFim = this.startOfDay(this.today);
  }

  adicionarInvestimento(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.formInvestimento.invalid) {
      this.formInvestimento.markAllAsTouched();
      return;
    }

    const value = this.formInvestimento.getRawValue();
    const investimento: Investimento = {
      id: `local-${Date.now()}`,
      descricao: value.descricao.trim(),
      tipo: value.tipo,
      valorAplicado: Number(value.valorAplicado || 0),
      taxaAnual: Number(value.taxaAnual || 0),
      dataAplicacao: value.dataAplicacao,
      origem: 'local'
    };

    const payload: RendaRequest = {
      descricao: `${investimento.tipo} - ${investimento.descricao}`,
      valor: investimento.valorAplicado,
      tipo: 'INVESTIMENTO',
      recorrente: false,
      dataRecebimento: investimento.dataAplicacao
    };

    this.salvandoInvestimento = true;
    this.rendaService
      .criar(payload)
      .pipe(finalize(() => (this.salvandoInvestimento = false)))
      .subscribe({
        next: () => {
          this.investimentosLocais.push(investimento);
          this.formInvestimento.reset({
            descricao: '',
            tipo: 'CDB',
            valorAplicado: null,
            taxaAnual: null,
            dataAplicacao: this.toInputDate(this.today)
          });
          this.successMessage = 'Investimento adicionado.';
          this.buscarDados();
        },
        error: () => {
          this.errorMessage = 'Nao foi possivel adicionar o investimento.';
        }
      });
  }

  adicionarDespesa(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.formDespesa.invalid) {
      this.formDespesa.markAllAsTouched();
      return;
    }

    const value = this.formDespesa.getRawValue();
    const payload: DespesaRequest = {
      descricao: value.descricao.trim(),
      valor: value.valor ?? 0,
      tipo: value.tipo,
      recorrente: false,
      dataPagamento: value.dataPagamento
    };

    this.salvandoDespesa = true;
    this.despesaService
      .criar(payload)
      .pipe(finalize(() => (this.salvandoDespesa = false)))
      .subscribe({
        next: () => {
          this.formDespesa.reset({ descricao: '', valor: null, tipo: 'OUTRO', dataPagamento: this.toInputDate(this.today) });
          this.successMessage = 'Despesa adicionada.';
          this.buscarDados();
        },
        error: () => {
          this.errorMessage = 'Nao foi possivel adicionar a despesa.';
        }
      });
  }

  adicionarRenda(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.formRenda.invalid) {
      this.formRenda.markAllAsTouched();
      return;
    }

    const value = this.formRenda.getRawValue();
    const payload: RendaRequest = {
      descricao: value.descricao.trim(),
      valor: value.valor ?? 0,
      tipo: value.tipo,
      recorrente: false,
      dataRecebimento: value.dataRecebimento
    };

    this.salvandoRenda = true;
    this.rendaService
      .criar(payload)
      .pipe(finalize(() => (this.salvandoRenda = false)))
      .subscribe({
        next: () => {
          this.formRenda.reset({ descricao: '', valor: null, tipo: 'SALARIO', dataRecebimento: this.toInputDate(this.today) });
          this.successMessage = 'Renda adicionada.';
          this.buscarDados();
        },
        error: () => {
          this.errorMessage = 'Nao foi possivel adicionar a renda.';
        }
      });
  }

  getBarHeight(value: number, max: number = this.chartMax): number {
    return Math.max((value / max) * 100, value > 0 ? 2 : 0);
  }

  rendaSemInvestimento(item: DespesasXRenda | null): number {
    if (!item) {
      return 0;
    }

    return Math.max(Number(item.valorRenda || 0) - Number(item.valorInvestimento ?? 0), 0);
  }

  formatarMesResumo(item: DespesasXRenda): string {
    return this.formatFullMonth(this.toDate(String(item.dataReferencia)));
  }

  getPieSliceStyle(index: number): string {
    const total = this.despesasPorTipo.reduce((sum, item) => sum + item.value, 0);
    const previous = this.despesasPorTipo.slice(0, index).reduce((sum, item) => sum + item.value, 0);
    const item = this.despesasPorTipo[index];
    const start = total ? (previous / total) * 360 : 0;
    const size = total ? (item.value / total) * 360 : 0;
    return `conic-gradient(from ${start}deg, ${item.color} 0deg ${size}deg, transparent ${size}deg 360deg)`;
  }

  calcularValorAtual(investimento: Investimento): number {
    const dias = Math.max(this.daysBetween(investimento.dataAplicacao, this.toInputDate(this.today)), 0);
    return investimento.valorAplicado * Math.pow(1 + investimento.taxaAnual / 100, dias / 365);
  }

  private rendimentoPorPeriodo(investimento: Investimento, dias: number): number {
    return investimento.valorAplicado * (Math.pow(1 + investimento.taxaAnual / 100, dias / 365) - 1);
  }

  private mesesParaLancamentos(): string[] {
    const meses = new Set<string>();
    const inicio = new Date(this.today.getFullYear(), this.today.getMonth() - 18, 1);
    for (let i = 0; i < 37; i++) {
      const data = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
      meses.add(formatDate(data, 'yyyy-MM', 'pt-BR'));
    }
    return [...meses];
  }

  private get mesReferenciaAtual(): Date {
    const offset = this.today.getDate() > Number(this.diaCorte || 31) ? 1 : 0;
    return new Date(this.today.getFullYear(), this.today.getMonth() + offset, 1);
  }

  private get mesReferenciaSeguinte(): Date {
    return new Date(this.mesReferenciaAtual.getFullYear(), this.mesReferenciaAtual.getMonth() + 1, 1);
  }

  private findResumoMensal(date: Date): DespesasXRenda | null {
    const key = formatDate(date, 'yyyy-MM', 'pt-BR');
    return this.dados.find((item) => String(item.dataReferencia).startsWith(key)) ?? null;
  }

  private isDentroPeriodo(value: string): boolean {
    const data = this.toDate(value);
    return data >= this.periodoInicio && data <= this.periodoFim;
  }

  private isMesmoMes(value: string, mes: string): boolean {
    return Boolean(value) && value.startsWith(mes);
  }

  private parseInputDate(value: string): Date {
    if (!value) {
      return this.startOfDay(this.today);
    }
    return new Date(`${value}T00:00:00`);
  }

  private monthStart(value: string): Date {
    const date = this.monthInputToDate(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private monthEnd(value: string): Date {
    const date = this.monthInputToDate(value);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  private toDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
  }

  private monthInputToDate(value: string): Date {
    return new Date(`${value || formatDate(this.mesReferenciaAtual, 'yyyy-MM', 'pt-BR')}-01T00:00:00`);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toInputDate(date: Date): string {
    return formatDate(date, 'yyyy-MM-dd', 'pt-BR');
  }

  private toInputMonth(date: Date): string {
    return formatDate(date, 'yyyy-MM', 'pt-BR');
  }

  private formatMonth(value: string): string {
    const date = value.length === 7 ? new Date(`${value}-01T00:00:00`) : this.toDate(value);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }

  private daysBetween(start: string, end: string): number {
    const diff = this.toDate(end).getTime() - this.toDate(start).getTime();
    return Math.floor(diff / 86400000);
  }

  private formatFullMonth(date: Date): string {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  private hasLocalInvestmentMatch(renda: RendaLancamento): boolean {
    return this.investimentosLocais.some(
      (item) =>
        item.dataAplicacao === renda.dataPrevista &&
        Number(item.valorAplicado.toFixed(2)) === Number(Number(renda.valor || 0).toFixed(2)) &&
        renda.descricao.includes(item.descricao)
    );
  }

  private getRendaId(renda: RendaLancamento): number {
    return renda.rendaId ?? renda.id;
  }

  private getDespesaId(despesa: DespesaLancamento): number {
    return despesa.despesaId ?? despesa.id;
  }
}
