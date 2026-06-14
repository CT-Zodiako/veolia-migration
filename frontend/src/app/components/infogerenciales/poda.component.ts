import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { ApsOption } from '../../models/proyecciones.models';
import { ProyeccionesService } from '../../services/proyecciones.service';

@Component({
  selector: 'app-poda',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, ToastModule],
  providers: [MessageService],
  templateUrl: './poda.component.html',
  styleUrls: ['./poda.component.css']
})
export class PodaComponent {
  aps = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  loading = signal(false);
  data = signal<any[]>([]);
  error = signal<string | null>(null);

  constructor(
    private readonly service: InfoGerencialService,
    private readonly proyService: ProyeccionesService,
    private readonly messages: MessageService
  ) {
    this.proyService.listarAps().subscribe({
      next: (data) => this.apsOptions.set(data || [])
    });
  }

  consultar(): void {
    const apsId = this.aps();
    if (!apsId) {
      this.messages.add({ severity: 'warn', summary: 'Poda', detail: 'Seleccione un APS' });
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.service.costoPoda(apsId).subscribe({
      next: (res) => {
        this.data.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al consultar costos de poda');
        this.loading.set(false);
      }
    });
  }
}
