import { Injectable, signal, computed } from '@angular/core';

export interface User {
  SISU_ID: number;
  SISU_NOMBRE: string;
  SISU_APELLIDO: string;
  SISU_CORREO: string;
  SISU_ESTADO: number;
}

export interface Sistema {
  SIST_ID: number;
  SIST_NOMBRE: string;
}

@Injectable({ providedIn: 'root' })
export class AuthState {
  // Estado privado
  private readonly _user = signal<User | null>(null);
  private readonly _sistema = signal<Sistema | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Estado público (readonly)
  readonly user = this._user.asReadonly();
  readonly sistema = this._sistema.asReadonly();
  readonly token = this._token.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed
  readonly isAuthenticated = computed(() => this._token() !== null && this._user() !== null);
  readonly userFullName = computed(() => {
    const u = this._user();
    return u ? `${u.SISU_NOMBRE} ${u.SISU_APELLIDO}` : '';
  });
  readonly sistemaId = computed(() => this._sistema()?.SIST_ID ?? null);

  // Acciones
  setUser(user: User): void {
    this._user.set(user);
  }

  setSistema(sistema: Sistema): void {
    this._sistema.set(sistema);
  }

  setToken(token: string): void {
    this._token.set(token);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearSession(): void {
    this._user.set(null);
    this._sistema.set(null);
    this._token.set(null);
    this._error.set(null);
  }

  // Hydrate desde localStorage
  hydrate(): void {
    const token = localStorage.getItem('jwtOken');
    const usuarioStr = localStorage.getItem('usuario');
    const sistemaStr = localStorage.getItem('sistema');

    if (token) {
      this._token.set(token);
    }
    if (usuarioStr) {
      try {
        this._user.set(JSON.parse(usuarioStr));
      } catch {
        this._user.set(null);
      }
    }
    if (sistemaStr) {
      try {
        this._sistema.set(JSON.parse(sistemaStr));
      } catch {
        this._sistema.set(null);
      }
    }
  }
}
