import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RendaLancamento,
  RendaRequest,
  RendaResponse,
  RendaTotalResponse,
  RendaValorRequest
} from '../models/renda.models';

const API_URL = 'http://localhost:8081';

@Injectable({ providedIn: 'root' })
export class RendaService {
  constructor(private readonly http: HttpClient) {}

  criar(payload: RendaRequest): Observable<RendaResponse> {
    return this.http.post<RendaResponse>(`${API_URL}/rendas`, payload);
  }

  atualizar(id: number, payload: RendaRequest): Observable<RendaResponse> {
    return this.http.put<RendaResponse>(`${API_URL}/rendas/${id}`, payload);
  }

  atualizarValor(id: number, payload: RendaValorRequest): Observable<RendaResponse> {
    return this.http.patch<RendaResponse>(`${API_URL}/rendas/${id}/valor`, payload);
  }

  total(mes?: string): Observable<RendaTotalResponse> {
    const params = mes ? new HttpParams().set('mes', mes) : undefined;
    return this.http.get<RendaTotalResponse>(`${API_URL}/rendas/total`, { params });
  }

  lancamentos(mes: string): Observable<RendaLancamento[]> {
    const params = new HttpParams().set('mes', mes);
    return this.http.get<RendaLancamento[]>(`${API_URL}/rendas/lancamentos`, { params });
  }
}
