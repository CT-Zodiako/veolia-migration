import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { Proyeccion, CrecimientoUsuariosItem, CrecimientoPropiaItem, CrecimientoTercerosItem, DescuentoItem } from '../../models/proyecciones.models';
import { ApsSelectorComponent } from '../shared/aps-selector.component';

@Component({
  selector: 'app-crecimiento-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, TabsModule, ApsSelectorComponent],
  templateUrl: './crecimiento-page.component.html',
  styleUrls: ['./proyecciones-page.component.css']
})
export class CrecimientoPageComponent {
  apsaId = signal<number | null>(null);
  proyId = signal<number | null>(null);
  proyecciones = signal<Proyeccion[]>([]);

  usuarios: CrecimientoUsuariosItem[] = [];
  propia: CrecimientoPropiaItem[] = [];
  terceros: CrecimientoTercerosItem[] = [];
  descuentos: DescuentoItem[] = [];

  constructor(private readonly service: ProyeccionesService) {}

  onApsChange(apsaId: number | null): void {
    this.apsaId.set(apsaId);
    this.cargarProyecciones();
  }

  cargarProyecciones(): void {
    if (!this.apsaId()) return;
    this.service.consulta(this.apsaId()!).subscribe({ next: (r) => this.proyecciones.set(r.data || []) });
  }

  consultar(): void {
    if (!this.proyId() || !this.apsaId()) return;
    this.service.consultarCrecimiento(this.apsaId()!, this.proyId()!).subscribe({
      next: (r) => {
        this.usuarios = r.data?.usuarios || [];
        this.propia = r.data?.propia || [];
        this.terceros = r.data?.terceros || [];
        this.descuentos = r.data?.descuentos || [];
      }
    });
  }

  guardarUsuarios(): void { this.service.registrarCrecimientoUsuarios({ apsaId: this.apsaId(), proyId: this.proyId(), items: this.usuarios }).subscribe(); }
  guardarPropia(): void { this.service.registrarCrecimientoInfPropia({ apsaId: this.apsaId(), proyId: this.proyId(), items: this.propia }).subscribe(); }
  guardarTerceros(): void { this.service.registrarCrecimientoInfTerceros({ apsaId: this.apsaId(), proyId: this.proyId(), items: this.terceros }).subscribe(); }
  guardarDescuentos(): void { this.service.registrarDescuento({ apsaId: this.apsaId(), proyId: this.proyId(), items: this.descuentos }).subscribe(); }
}
