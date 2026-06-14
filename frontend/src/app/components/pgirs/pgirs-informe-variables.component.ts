import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PgirsService } from '../../services/pgirs.service';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { ApsOption } from '../../models/proyecciones.models';

@Component({
  selector: 'app-pgirs-informe-variables',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, ToastModule],
  providers: [MessageService],
  templateUrl: './pgirs-informe-variables.component.html',
  styleUrls: ['./pgirs-informe-variables.component.css']
})
export class PgirsInformeVariablesComponent {
  aps = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  loading = signal(false);
  data = signal<any[]>([]);
  error = signal<string | null>(null);

  constructor(
    private readonly service: PgirsService,
    private readonly proyService: ProyeccionesService,
    private readonly messages: MessageService
  ) {
    this.proyService.listarAps().subscribe({
      next: (data: any) => this.apsOptions.set(data || [])
    });
  }

  consultar(): void {
    const apsId = this.aps();
    if (!apsId) {
      this.messages.add({ severity: 'warn', summary: 'PGIRS', detail: 'Seleccione un APS' });
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.service.getInformeVariables(apsId).subscribe({
      next: (res: any) => {
        this.data.set(res.data || []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Error al consultar informe de variables');
        this.loading.set(false);
      }
    });
  }
}
