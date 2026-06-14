import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppState {
  // Estado privado
  private readonly _globalLoading = signal(false);
  private readonly _globalError = signal<string | null>(null);
  private readonly _notification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Estado público
  readonly globalLoading = this._globalLoading.asReadonly();
  readonly globalError = this._globalError.asReadonly();
  readonly notification = this._notification.asReadonly();

  // Computed
  readonly hasNotification = computed(() => this._notification() !== null);

  // Acciones
  setGlobalLoading(loading: boolean): void {
    this._globalLoading.set(loading);
  }

  setGlobalError(error: string | null): void {
    this._globalError.set(error);
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this._notification.set({ message, type });
    // Auto-clear después de 5 segundos
    setTimeout(() => this.clearNotification(), 5000);
  }

  clearNotification(): void {
    this._notification.set(null);
  }

  clearAllErrors(): void {
    this._globalError.set(null);
    this._notification.set(null);
  }
}
