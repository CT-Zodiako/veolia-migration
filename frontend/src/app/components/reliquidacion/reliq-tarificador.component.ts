import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ReliqTarificadorService } from '../../services/reliquidacion/reliq-tarificador.service';
import { Reliquidacion } from '../../models/reliquidacion.model';

@Component({
  selector: 'app-reliq-tarificador',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ...CommonPrimeNgModules],
  templateUrl: './reliq-tarificador.component.html',
  styleUrls: ['./reliq-tarificador.component.css']
})
export class ReliqTarificadorComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly loading = signal(false);
  readonly showApproveModal = signal(false);
  readonly estado = signal<{ ok: boolean; estado: string; puedeAprobar: boolean } | null>(null);
  readonly resumenes = signal<{ usuarios?: unknown; empresa?: unknown; adicional?: unknown; relleno?: unknown; aps?: unknown }>({});

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly tarificadorService: ReliqTarificadorService
  ) {
    this.reliqService.getReliquidaciones().subscribe((res) => this.reliquidaciones.set(res.data || []));
  }

  consultar(): void {
    if (!this.selectedReliq()) return;
    const reliq = this.selectedReliq()!;
    this.loading.set(true);
    forkJoin({
      usuarios: this.tarificadorService.resumenUsuarios(reliq),
      empresa: this.tarificadorService.resumenEmpresa(reliq),
      adicional: this.tarificadorService.resumenAdicional(reliq),
      relleno: this.tarificadorService.resumenRelleno(reliq),
      aps: this.tarificadorService.resumenAps(reliq),
      estado: this.tarificadorService.estadoReliquidacion(reliq)
    }).subscribe({
      next: (res) => {
        this.resumenes.set({
          usuarios: res.usuarios.data,
          empresa: res.empresa.data,
          adicional: res.adicional.data,
          relleno: res.relleno.data,
          aps: res.aps.data
        });
        this.estado.set(res.estado.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  abrirAprobar(): void {
    this.showApproveModal.set(true);
  }

  aprobar(): void {
    if (!this.selectedReliq()) return;
    this.tarificadorService.aprobarReliquidacion(this.selectedReliq()!).subscribe({
      next: () => {
        this.showApproveModal.set(false);
        this.consultar();
      }
    });
  }
}
