import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthRequest, AuthResponse, AuthUser, RegisterRequest } from '../models/auth.models';

const API_URL = environment.apiUrl;
const TOKEN_KEY = 'web-financas.token';
const USER_KEY = 'web-financas.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(this.readToken());
  private readonly userState = signal<AuthUser | null>(this.readUser());

  readonly token = computed(() => this.tokenState());
  readonly user = computed(() => this.userState());
  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));

  constructor(private readonly http: HttpClient) {}

  login(payload: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, payload).pipe(tap((response) => this.setSession(response)));
  }

  registrar(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/registar`, payload).pipe(tap((response) => this.setSession(response)));
  }

  logout(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private setSession(response: AuthResponse): void {
    const user: AuthUser = { nome: response.nome, email: response.email };
    this.tokenState.set(response.token);
    this.userState.set(user);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private readToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private readUser(): AuthUser | null {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) {
      return this.userFromToken(this.readToken());
    }

    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      return this.userFromToken(this.readToken());
    }
  }

  private userFromToken(token: string | null): AuthUser | null {
    if (!token) {
      return null;
    }

    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    try {
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Partial<AuthUser> & { sub?: string };
      const email = decoded.email ?? decoded.sub;
      if (!decoded.nome || !email) {
        return null;
      }

      return { nome: decoded.nome, email };
    } catch {
      return null;
    }
  }
}
