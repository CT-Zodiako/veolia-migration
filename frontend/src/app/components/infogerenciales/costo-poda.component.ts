import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ApsOption } from '../../models/proyecciones.models';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { InfoGerencialService } from '../../services/infogerenciales.service';

@Component({
  selector: 'app-costo-poda',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, TableModule, ToastModule, SelectModule],
  providers: [MessageService],
  templateUrl: './costo-poda.component.html',
  styleUrls: ['./costo-poda.component.css']
})
export class CostoPodaComponent {
  aps = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  columns = signal<string[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<any[]>([]);

  constructor(
    private readonly service: InfoGerencialService,
    private readonly proyService: ProyeccionesService,
    private readonly messages: MessageService
  ) {
    this.proyService.listarAps().subscribe({
      next: (rows) => this.apsOptions.set(rows || []),
      error: () => this.apsOptions.set([])
    });
  }

  consultar(): void {
    const apsId = this.aps();
    if (!apsId) {
      this.error.set('Debés seleccionar un APS.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.data.set([]);
    this.columns.set([]);

    this.service.costoPoda(apsId).subscribe({
      next: (res) => {
        const rows = res?.data || [];
        this.data.set(rows);
        this.columns.set(rows.length > 0 ? Object.keys(rows[0]) : []);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Error al consultar costos de poda';
        this.error.set(msg);
        this.messages.add({ severity: 'error', summary: 'Costo poda', detail: msg });
        this.loading.set(false);
      }
    });
  }
}
