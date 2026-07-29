import { Injectable, signal } from '@angular/core';

export interface SupportErrorLogEntry {
  timestamp: Date;
  method: string;
  url: string;
  status: number;
  message: string;
  oraCode?: string;
}

@Injectable({ providedIn: 'root' })
export class SupportErrorLogService {
  private readonly _logs = signal<SupportErrorLogEntry[]>([]);
  readonly logs = this._logs.asReadonly();

  push(entry: Omit<SupportErrorLogEntry, 'timestamp'>): void {
    this._logs.update(logs => [{ ...entry, timestamp: new Date() }, ...logs]);
  }

  clear(): void {
    this._logs.set([]);
  }
}
