import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { ApsOption, Proyeccion } from '../../models/proyecciones.models';

@Component({
  selector: 'app-ejecutar-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule],
  templateUrl: './ejecutar-page.component.html',
  styleUrls: ['./proyecciones-page.component.css']
})
export class EjecutarPageComponent {
  apsaId = signal<number | null>(null);
  proyId = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  proyecciones = signal<Proyeccion[]>([]);
  loading = signal(false);
  resultado = signal<string>('');

  constructor(private readonly service: ProyeccionesService) {
    this.service.listarAps().subscribe({ next: (x) => this.apsOptions.set(x || []) });
  }

  cargarProyecciones(): void {
    if (!this.apsaId()) return;
    this.service.consulta(this.apsaId()!).subscribe({ next: (r) => this.proyecciones.set(r.data || []) });
  }

  ejecutar(): void {
    if (!this.apsaId() || !this.proyId()) return;
    this.loading.set(true);
    this.service.ejecutarProyectar(this.apsaId()!, this.proyId()!).subscribe({
      next: (r) => {
        this.resultado.set(r.data?.resultado || r.message || 'Sin respuesta');
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
