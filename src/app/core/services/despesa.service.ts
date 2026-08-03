import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DespesaLancamento,
  DespesaRequest,
  DespesaResponse,
  DespesaTotalResponse,
  DespesaValorRequest
} from '../models/despesa.models';
import {DespesasXRenda} from '../models/DespesasXRenda.model';

const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class DespesaService {
  private readonly baseUrl = API_URL;

  constructor(private readonly http: HttpClient) {}

  criar(payload: DespesaRequest): Observable<DespesaResponse> {
    return this.http.post<DespesaResponse>(`${this.baseUrl}/despesas`, payload);
  }

  atualizar(id: number, payload: DespesaRequest): Observable<DespesaResponse> {
    return this.atualizarDadosGerais(id, payload);
  }

  atualizarDadosGerais(id: number, payload: DespesaRequest): Observable<DespesaResponse> {
    return this.http.put<DespesaResponse>(`${this.baseUrl}/despesas/${id}`, payload);
  }

  atualizarValor(id: number, payload: DespesaValorRequest): Observable<DespesaResponse> {
    return this.http.patch<DespesaResponse>(`${this.baseUrl}/despesas/${id}/valor`, payload);
  }

  total(mes?: string): Observable<DespesaTotalResponse> {
    const params = mes ? new HttpParams().set('mes', mes) : undefined;
    return this.http.get<DespesaTotalResponse>(`${this.baseUrl}/despesas/total`, { params });
  }

  lancamentos(mes: string): Observable<DespesaLancamento[]> {
    const params = new HttpParams().set('mes', mes);
    return this.http.get<DespesaLancamento[]>(`${this.baseUrl}/despesas/lancamentos`, { params });
  }

  inativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/despesas/lancamentos/${id}/inativar`, {});
  }

  dashboard(): Observable<DespesasXRenda[]> {
    return this.http.get<DespesasXRenda[]>(
      `${this.baseUrl}/despesas/renda-despesas`
    );
  }

}
