import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ReliInfoAdicional, ReliInfoAps, ReliInfoEmpresa, ReliInfoRelleno, ReliInfoUsuarios, Reliquidacion } from '../../models/reliquidacion.model';

type CargueTab = 'usuarios' | 'empresa' | 'aps' | 'relleno' | 'adicional';

@Component({
  selector: 'app-reliq-cargue',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './reliq-cargue.component.html',
  styleUrls: ['./reliq-cargue.component.css']
})
export class ReliqCargueComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly currentTab = signal<CargueTab>('usuarios');
  readonly loading = signal(false);
  readonly usuarios = signal<ReliInfoUsuarios[]>([]);
  readonly empresa = signal<ReliInfoEmpresa[]>([]);
  readonly aps = signal<ReliInfoAps[]>([]);
  readonly relleno = signal<ReliInfoRelleno[]>([]);
  readonly adicional = signal<ReliInfoAdicional[]>([]);

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly cargueService: ReliqCargueService
  ) {
    this.reliqService.getReliquidaciones().subscribe((res) => this.reliquidaciones.set(res.data || []));
  }

  consultar(): void {
    if (!this.selectedReliq()) return;
    this.loading.set(true);
    const reliqId = this.selectedReliq()!;
    forkJoin({
      usuarios: this.cargueService.getReliInfoUsuarios(reliqId),
      empresa: this.cargueService.getResumenEmpresa(reliqId),
      aps: this.cargueService.getResumenAps(reliqId),
      relleno: this.cargueService.getResumenRelleno(reliqId),
      adicional: this.cargueService.getReliInfoAdicional(reliqId)
    }).subscribe({
      next: (res) => {
        this.usuarios.set(res.usuarios.data || []);
        this.empresa.set(res.empresa.data || []);
        this.aps.set(res.aps.data || []);
        this.relleno.set(res.relleno.data || []);
        this.adicional.set(res.adicional.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  guardar(tab: CargueTab): void {
    if (tab === 'usuarios') this.cargueService.updateReliInfoUsuarios(this.usuarios()).subscribe();
    if (tab === 'empresa') this.cargueService.updateResumenEmpresa(this.empresa()).subscribe();
    if (tab === 'aps') this.cargueService.updateResumenAps(this.aps()).subscribe();
    if (tab === 'relleno') this.cargueService.updateResumenRelleno(this.relleno()).subscribe();
    if (tab === 'adicional') this.cargueService.updateResumenAdicional(this.adicional()).subscribe();
  }

  onTabChange(value: string | number | undefined): void {
    this.currentTab.set(String(value || 'usuarios') as CargueTab);
  }
}
