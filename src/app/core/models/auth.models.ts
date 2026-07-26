export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends AuthRequest {
  nome: string;
}

export interface AuthResponse {
  token: string;
  nome: string;
  email: string;
}

export interface AuthUser {
  nome: string;
  email: string;
}
