import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { ApsOption, Proyeccion, ProyeccionCreate } from '../../models/proyecciones.models';

@Component({
  selector: 'app-proyecciones-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, DialogModule, InputTextModule, InputNumberModule, ToastModule],
  providers: [MessageService],
  templateUrl: './proyecciones-page.component.html',
  styleUrls: ['./proyecciones-page.component.css']
})
export class ProyeccionesPageComponent {
  aps = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  rows = signal<Proyeccion[]>([]);
  loading = signal(false);
  showDialog = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);

  form: ProyeccionCreate = {
    apsaId: 0,
    proyNombre: '',
    proyTipo100: 1,
    proyAnnoDes: new Date().getFullYear(),
    proyMesDes: 1,
    proyAnnoHas: new Date().getFullYear(),
    proyMesHas: 12
  };

  constructor(private readonly service: ProyeccionesService, private readonly messages: MessageService) {
    this.service.listarAps().subscribe({ next: (data) => this.apsOptions.set(data || []) });
    this.consultaGeneral();
  }

  consultaGeneral(): void {
    this.loading.set(true);
    this.service.consultaGeneral().subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  consultar(): void {
    if (!this.aps()) return this.consultaGeneral();
    this.loading.set(true);
    this.service.consulta(this.aps()!).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  nueva(): void {
    this.editingId.set(null);
    this.form = { ...this.form, apsaId: this.aps() || 0, proyNombre: '' };
    this.showDialog.set(true);
  }

  editar(row: Proyeccion): void {
    this.editingId.set(row.proyId);
    this.form = {
      apsaId: row.apsaId,
      proyNombre: row.proyNombre,
      proyTipo100: row.proyTipo100,
      proyAnnoDes: row.proyAnnoDes,
      proyMesDes: row.proyMesDes,
      proyAnnoHas: row.proyAnnoHas,
      proyMesHas: row.proyMesHas
    };
    this.showDialog.set(true);
  }

  guardar(): void {
    const payload = this.form;
    if (!payload.apsaId || !payload.proyNombre.trim()) return;
    this.saving.set(true);
    const req$ = this.editingId() ? this.service.editar(this.editingId()!, payload) : this.service.crear(payload);
    req$.subscribe({
      next: (res) => {
        this.messages.add({ severity: res.status ? 'success' : 'error', summary: 'Proyecciones', detail: res.message });
        this.saving.set(false);
        this.showDialog.set(false);
        this.consultar();
      },
      error: () => this.saving.set(false)
    });
  }

  eliminar(row: Proyeccion): void {
    if (!window.confirm(`¿Eliminar ${row.proyNombre}?`)) return;
    this.service.eliminar(row.proyId).subscribe({ next: () => this.consultar() });
  }
}
