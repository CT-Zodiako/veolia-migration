import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReversionHistoryItem, SuministrosService } from '../../services/suministros.service';

@Component({
  selector: 'app-historico-reversion',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <div class="card">
      <h3>Histórico Reversiones</h3>
      <p-table [value]="rows" [loading]="loading" [paginator]="true" [rows]="10" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr>
            <th>ID</th><th>APS</th><th>Año</th><th>Mes</th><th>Motivo</th><th>Fecha</th><th>Usuario</th><th>APS Nombre</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ row.id }}</td>
            <td>{{ row.aps }}</td>
            <td>{{ row.anno }}</td>
            <td>{{ row.mes }}</td>
            <td>{{ row.motivo }}</td>
            <td>{{ row.fecha }}</td>
            <td>{{ row.usuario }}</td>
            <td>{{ row.nombreAps }}</td>
          </tr>
        </ng-template>
      </p-table>
      <p class="mt-2" *ngIf="error" style="color: var(--color-brand-medium)">{{ error }}</p>
    </div>
  `
})
export class HistoricoReversionComponent implements OnInit {
  rows: ReversionHistoryItem[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly suministrosService: SuministrosService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';

    this.suministrosService.getReversion().subscribe({
      next: (data) => {
        this.rows = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.data || 'Error al consultar histórico';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
