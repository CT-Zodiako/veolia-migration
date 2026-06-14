import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { ApsOption, LineaTiempoRow, Proyeccion } from '../../models/proyecciones.models';

@Component({
  selector: 'app-linea-tiempo-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, InputNumberModule, ToastModule],
  providers: [MessageService],
  templateUrl: './linea-tiempo-page.component.html',
  styleUrls: ['./proyecciones-page.component.css']
})
export class LineaTiempoPageComponent {
  apsaId = signal<number | null>(null);
  proyId = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  proyecciones = signal<Proyeccion[]>([]);
  rows: LineaTiempoRow[] = [];
  loading = signal(false);

  constructor(private readonly service: ProyeccionesService, private readonly messages: MessageService) {
    this.service.listarAps().subscribe({ next: (x) => this.apsOptions.set(x || []) });
  }

  cargarProyecciones(): void {
    if (!this.apsaId()) return;
    this.service.consulta(this.apsaId()!).subscribe({ next: (r) => this.proyecciones.set(r.data || []) });
  }

  consultar(): void {
    if (!this.proyId()) return;
    this.loading.set(true);
    this.service.lineaTiempoByProyId(this.proyId()!).subscribe({
      next: (r) => {
        this.rows = (r.data?.length ? r.data : this.defaultRows()).slice(0, 12);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  guardar(): void {
    if (!this.proyId() || !this.apsaId()) return;
    const payload = { proyId: this.proyId()!, apsaId: this.apsaId()!, isNew: false, rows: this.rows };
    this.service.registrarLineaTiempo(payload).subscribe({ next: (r) => this.messages.add({ severity: r.status ? 'success' : 'error', summary: 'Línea de tiempo', detail: r.message }) });
  }

  private defaultRows(): LineaTiempoRow[] {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => ({ proyId: this.proyId() || 0, apsaId: this.apsaId() || 0, anno: year, mes: i + 1 }));
  }
}
