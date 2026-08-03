import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DespesaService } from '../../../core/services/despesa.service';
import {DespesasXRenda} from '../../../core/models/DespesasXRenda.model';

@Component({
  selector: 'app-analise-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analise-page.component.html',
  styleUrl: './analise-page.component.scss'
})
export class AnalisePageComponent implements OnInit {

  dados: DespesasXRenda[] = [];
  carregando = false;

  constructor(private readonly despesaService: DespesaService) {}

  ngOnInit(): void {
    this.buscarDados();
  }

  private buscarDados(): void {
    this.carregando = true;

    this.despesaService.dashboard().subscribe({
      next: (response) => {
        this.dados = response;
        this.carregando = false;
      },
      error: (err) => {
        console.error(err);
        this.carregando = false;
      }
    });
  }
}
