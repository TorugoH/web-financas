import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TabelasTrabalhistas } from './calculos-trabalhistas';

@Injectable({ providedIn: 'root' })
export class TabelasTrabalhistasService {
  constructor(private readonly http: HttpClient) {}

  consultar() {
    return this.http.get<TabelasTrabalhistas>(`${environment.apiUrl}/simulacoes/tabelas`, { params: { ano: 2026 } });
  }
}
