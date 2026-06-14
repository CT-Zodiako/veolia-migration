import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { ApsOption, Proyeccion, SubcontItem } from '../../models/proyecciones.models';

@Component({
  selector: 'app-subcont-proy-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, InputNumberModule],
  templateUrl: './subcont-proy-page.component.html',
  styleUrls: ['./proyecciones-page.component.css']
})
export class SubcontProyPageComponent {
  apsaId = signal<number | null>(null);
  proyId = signal<number | null>(null);
  anno = new Date().getFullYear();
  mes = 1;
  apsOptions = signal<ApsOption[]>([]);
  proyecciones = signal<Proyeccion[]>([]);
  items: SubcontItem[] = [];

  constructor(private readonly service: ProyeccionesService) {
    this.service.listarAps().subscribe({ next: (x) => this.apsOptions.set(x || []) });
  }

  cargarProyecciones(): void {
    if (!this.apsaId()) return;
    this.service.consulta(this.apsaId()!).subscribe({ next: (r) => this.proyecciones.set(r.data || []) });
  }

  consultar(): void {
    if (!this.apsaId() || !this.proyId()) return;
    this.service.consultaSubcont({ apsaId: this.apsaId()!, proyId: this.proyId()!, anno: this.anno, mes: this.mes }).subscribe({ next: (r) => this.items = r.data || [] });
  }

  guardar(): void {
    if (!this.apsaId() || !this.proyId()) return;
    this.service.editarPorcSubCon({ apsaId: this.apsaId()!, proyId: this.proyId()!, anno: this.anno, mes: this.mes, items: this.items }).subscribe();
  }
}
