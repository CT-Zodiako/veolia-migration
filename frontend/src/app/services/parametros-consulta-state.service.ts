import { Injectable } from '@angular/core';
import { AuthState } from '../state/auth.state';

interface ParametrosGuardados {
  aps: number | null;
  anno: number | null;
  mes: number | null;
  proyeccion: number | null;
}

const VACIO: ParametrosGuardados = { aps: null, anno: null, mes: null, proyeccion: null };

@Injectable({ providedIn: 'root' })
export class ParametrosConsultaStateService {
  constructor(private readonly authState: AuthState) {}

  getAps(): number | null {
    return this.leer().aps;
  }

  getAnno(): number | null {
    return this.leer().anno;
  }

  getMes(): number | null {
    return this.leer().mes;
  }

  setAps(value: number | null): void {
    this.guardar({ ...this.leer(), aps: value });
  }

  setAnno(value: number | null): void {
    this.guardar({ ...this.leer(), anno: value });
  }

  setMes(value: number | null): void {
    this.guardar({ ...this.leer(), mes: value });
  }

  getProyeccion(): number | null {
    return this.leer().proyeccion;
  }

  setProyeccion(value: number | null): void {
    this.guardar({ ...this.leer(), proyeccion: value });
  }

  private storageKey(): string {
    const sisuId = this.authState.user()?.SISU_ID ?? 'anonimo';
    const idSistema = this.authState.sistemaId() ?? 'sin-sistema';
    return `parametros-consulta:${sisuId}:${idSistema}`;
  }

  private leer(): ParametrosGuardados {
    try {
      const raw = localStorage.getItem(this.storageKey());
      return raw ? { ...VACIO, ...JSON.parse(raw) } : VACIO;
    } catch {
      return VACIO;
    }
  }

  private guardar(valores: ParametrosGuardados): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(valores));
  }
}
