import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { SuministrosService } from '../../services/suministros.service';

@Component({
  selector: 'app-ejecutar-reversion',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent],
  template: `
    <div class="card">
      <h3>Ejecutar Reversión</h3>
      <div class="grid">
        <div class="col-12 md:col-4"><app-aps-selector [(selectedAps)]="aps"></app-aps-selector></div>
        <div class="col-12 md:col-4"><app-anno-selector [(selectedAnno)]="anno"></app-anno-selector></div>
        <div class="col-12 md:col-4"><app-mes-selector [(selectedMes)]="mes"></app-mes-selector></div>
      </div>
      <div class="field mt-3">
        <label>Motivo</label>
        <textarea pTextarea rows="4" class="w-full" [(ngModel)]="motivo"></textarea>
      </div>
      <div class="field-checkbox mt-2">
        <p-checkbox [(ngModel)]="confirmado" [binary]="true" inputId="confirmReversion"></p-checkbox>
        <label for="confirmReversion" class="ml-2">Confirmo que esta reversión es destructiva</label>
      </div>
      <button pButton type="button" [disabled]="loading" (click)="ejecutar()" label="Ejecutar"></button>

      <p class="mt-2" *ngIf="success" style="color: #15803d">{{ success }}</p>
      <p class="mt-2" *ngIf="error" style="color: #b91c1c">{{ error }}</p>
    </div>
  `
})
export class EjecutarReversionComponent implements OnInit {
  aps: number | null = null;
  anno: number | null = null;
  mes: number | null = null;
  motivo = '';
  confirmado = false;

  loading = false;
  success = '';
  error = '';

  constructor(
    private readonly suministrosService: SuministrosService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    this.anno = date.getFullYear();
    this.mes = date.getMonth() + 1;
  }

  ejecutar(): void {
    if (this.aps === null || this.anno === null || this.mes === null || !this.motivo.trim() || !this.confirmado) {
      this.error = 'Debe seleccionar APS, año, mes, motivo y confirmar la reversión';
      this.success = '';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.suministrosService.setReversion({
      aps: this.aps,
      anno: this.anno,
      mes: this.mes,
      motivo: this.motivo.trim()
    }).subscribe({
      next: (data) => {
        this.loading = false;
        if (data?.ok) {
          this.success = `Reversión ejecutada correctamente (ID: ${data.reversionId ?? 'N/A'})`;
          this.motivo = '';
          this.confirmado = false;
        } else {
          this.error = data?.message || 'No fue posible ejecutar la reversión';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.error?.data || 'Error al ejecutar reversión';
        this.cdr.detectChanges();
      }
    });
  }
}
