import { Injectable, signal } from '@angular/core';

export type SupportErrorOrigen = 'db' | 'backend' | 'red' | 'frontend';

export interface SupportErrorLogEntry {
  timestamp: Date;
  method: string;
  url: string;
  status: number;
  message: string;
  oraCode?: string;
  origen: SupportErrorOrigen;
}

/** Clasifica el origen del error a partir de la respuesta HTTP:
 *  - oraCode o "ORA-" en el mensaje -> error de base de datos (Oracle)
 *  - status 0 -> falla de red/infraestructura (backend caído, CORS, timeout)
 *  - resto -> error del servicio/backend (validaciones, negocio, auth) */
export function clasificarOrigen(status: number, oraCode?: string, message?: string): SupportErrorOrigen {
  if (oraCode || (message ?? '').includes('ORA-')) {
    return 'db';
  }
  if (status === 0) {
    return 'red';
  }
  return 'backend';
}

export const ORIGEN_LABELS: Record<SupportErrorOrigen, string> = {
  db: 'Base de datos',
  backend: 'Backend',
  red: 'Red',
  frontend: 'Frontend'
};

@Injectable({ providedIn: 'root' })
export class SupportErrorLogService {
  private readonly _logs = signal<SupportErrorLogEntry[]>([]);
  readonly logs = this._logs.asReadonly();

  push(entry: Omit<SupportErrorLogEntry, 'timestamp' | 'origen'>): void {
    this._logs.update(logs => [{
      ...entry,
      origen: clasificarOrigen(entry.status, entry.oraCode, entry.message),
      timestamp: new Date()
    }, ...logs]);
  }

  /** Errores JS del propio frontend (no pasan por el interceptor HTTP). */
  pushFrontend(message: string): void {
    this._logs.update(logs => [{
      timestamp: new Date(),
      method: 'JS',
      url: window.location.href,
      status: 0,
      message,
      origen: 'frontend'
    }, ...logs]);
  }

  clear(): void {
    this._logs.set([]);
  }
}
