import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'theme:oscuro';
const DARK_CLASS = 'app-dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly oscuro = signal<boolean>(this.leerPreferenciaGuardada());

  constructor() {
    this.aplicar(this.oscuro());
  }

  toggle(): void {
    this.set(!this.oscuro());
  }

  set(oscuro: boolean): void {
    this.oscuro.set(oscuro);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oscuro));
    this.aplicar(oscuro);
  }

  private aplicar(oscuro: boolean): void {
    document.documentElement.classList.toggle(DARK_CLASS, oscuro);
  }

  private leerPreferenciaGuardada(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  }
}
