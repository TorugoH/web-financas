import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RendaLancamento,
  RendaRequest,
  RendaResponse,
  RendaTotalResponse,
  RendaValorRequest
} from '../models/renda.models';

const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class RendaService {
  private readonly baseUrl = API_URL;

  constructor(private readonly http: HttpClient) {}

  criar(payload: RendaRequest): Observable<RendaResponse> {
    return this.http.post<RendaResponse>(`${this.baseUrl}/rendas`, payload);
  }

  atualizar(id: number, payload: RendaRequest): Observable<RendaResponse> {
    return this.atualizarDadosGerais(id, payload);
  }

  atualizarDadosGerais(id: number, payload: RendaRequest): Observable<RendaResponse> {
    return this.http.put<RendaResponse>(`${this.baseUrl}/rendas/${id}`, payload);
  }

  atualizarValor(id: number, payload: RendaValorRequest): Observable<RendaResponse> {
    return this.http.patch<RendaResponse>(`${this.baseUrl}/rendas/${id}/valor`, payload);
  }

  total(mes?: string): Observable<RendaTotalResponse> {
    const params = mes ? new HttpParams().set('mes', mes) : undefined;
    return this.http.get<RendaTotalResponse>(`${this.baseUrl}/rendas/total`, { params });
  }

  lancamentos(mes: string): Observable<RendaLancamento[]> {
    const params = new HttpParams().set('mes', mes);
    return this.http.get<RendaLancamento[]>(`${this.baseUrl}/rendas/lancamentos`, { params });
  }
}
