import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Formato19Component } from './formato-19.component';
import { Formato23Component } from './formato-23.component';
import { Formato24Component } from './formato-24.component';
import { Formato35Component } from './formato-35.component';
import { Formato36Component } from './formato-36.component';
import { SuiReversionRow, SuiReversionesService } from '../../services/sui-reversiones.service';

@Component({
  selector: 'app-sui-reversiones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...CommonPrimeNgModules,
    Formato19Component,
    Formato23Component,
    Formato24Component,
    Formato35Component,
    Formato36Component
  ],
  template: `
    <div class="card">
      <h3>SUI Reversiones</h3>

      <div class="flex gap-2 align-items-end mb-3">
        <div class="field">
          <label for="aps">APS</label>
          <p-inputnumber inputId="aps" [(ngModel)]="aps" [useGrouping]="false"></p-inputnumber>
        </div>
        <button pButton type="button" label="Consultar" (click)="cargar()" [disabled]="loading"></button>
      </div>

      <p *ngIf="error" style="color:var(--color-brand-medium)">{{ error }}</p>

      <p-tabs value="0">
        <p-tablist>
          <p-tab value="0">Formato 19</p-tab>
          <p-tab value="1">Formato 23</p-tab>
          <p-tab value="2">Formato 24</p-tab>
          <p-tab value="3">Formato 35</p-tab>
          <p-tab value="4">Formato 36</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0"><app-formato-19 [rows]="f19"></app-formato-19></p-tabpanel>
          <p-tabpanel value="1"><app-formato-23 [rows]="f23"></app-formato-23></p-tabpanel>
          <p-tabpanel value="2"><app-formato-24 [rows]="f24"></app-formato-24></p-tabpanel>
          <p-tabpanel value="3"><app-formato-35 [rows]="f35"></app-formato-35></p-tabpanel>
          <p-tabpanel value="4"><app-formato-36 [rows]="f36"></app-formato-36></p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
  `
})
export class SuiReversionesComponent {
  aps: number | null = null;
  loading = false;
  error = '';

  f19: SuiReversionRow[] = [];
  f23: SuiReversionRow[] = [];
  f24: SuiReversionRow[] = [];
  f35: SuiReversionRow[] = [];
  f36: SuiReversionRow[] = [];

  constructor(
    private readonly service: SuiReversionesService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  cargar(): void {
    if (!this.aps || this.aps <= 0) {
      this.error = 'Ingresá un APS válido';
      return;
    }

    this.loading = true;
    this.error = '';

    forkJoin({
      f19: this.service.getReversionesF19(this.aps),
      f23: this.service.getReversionesF23(this.aps),
      f24: this.service.getReversionesF24(this.aps),
      f35: this.service.getReversionesF35(this.aps),
      f36: this.service.getReversionesF36(this.aps)
    }).subscribe({
      next: (data) => {
        this.f19 = data.f19 || [];
        this.f23 = data.f23 || [];
        this.f24 = data.f24 || [];
        this.f35 = data.f35 || [];
        this.f36 = data.f36 || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.data || 'Error consultando reversiones SUI';
        this.loading = false;
      }
    });
  }
}
