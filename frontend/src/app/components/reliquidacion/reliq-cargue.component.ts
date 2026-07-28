import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ReliInfoAdicional, ReliInfoAps, ReliInfoEmpresa, ReliInfoRelleno, ReliInfoUsuarios, Reliquidacion } from '../../models/reliquidacion.model';

type CargueTab = 'usuarios' | 'empresa' | 'aps' | 'relleno' | 'adicional';

@Component({
  selector: 'app-reliq-cargue',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, ...CommonPrimeNgModules],
  providers: [MessageService],
  templateUrl: './reliq-cargue.component.html',
  styleUrls: ['./reliq-cargue.component.css']
})
export class ReliqCargueComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly currentTab = signal<CargueTab>('usuarios');
  readonly loading = signal(false);
  readonly reliquidando = signal(false);
  readonly guardando = signal(false);
  readonly usuarios = signal<ReliInfoUsuarios[]>([]);
  readonly empresa = signal<ReliInfoEmpresa[]>([]);
  readonly aps = signal<ReliInfoAps[]>([]);
  readonly relleno = signal<ReliInfoRelleno[]>([]);
  readonly adicional = signal<ReliInfoAdicional[]>([]);

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly cargueService: ReliqCargueService,
    private readonly messages: MessageService,
    private readonly confirmationService: ConfirmationService
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
      error: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Reliquidación - Cargue', detail: 'No se pudo consultar la información.' });
      }
    });
  }

  reliquidarTarifa(): void {
    const reliqId = this.selectedReliq();
    if (!reliqId) return;

    const reliq = this.reliquidaciones().find((r) => r.relqId === reliqId);
    const apsaId = reliq?.apsaId;
    if (!apsaId) {
      this.messages.add({ severity: 'error', summary: 'Reliquidar Tarifa', detail: 'No se pudo determinar el APS de la reliquidación seleccionada.' });
      return;
    }

    this.confirmationService.confirm({
      header: 'Reliquidar Tarifa',
      message: '¿Seguro que querés reliquidar la tarifa de esta reliquidación?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reliquidar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.confirmarReliquidarTarifa(reliqId, apsaId)
    });
  }

  private confirmarReliquidarTarifa(reliqId: number, apsaId: number): void {
    this.reliquidando.set(true);
    this.cargueService.compararCostosCargue(reliqId, apsaId).subscribe({
      next: (res) => {
        this.reliquidando.set(false);
        const detalle = res.data?.resultado || res.message || 'Proceso finalizado.';
        this.messages.add({ severity: res.status ? 'success' : 'error', summary: 'Reliquidar Tarifa', detail: detalle });
      },
      error: (err) => {
        this.reliquidando.set(false);
        this.messages.add({ severity: 'error', summary: 'Reliquidar Tarifa', detail: err?.error?.message || 'No se pudo reliquidar la tarifa.' });
      }
    });
  }

  guardar(tab: CargueTab): void {
    this.guardando.set(true);
    const req$ =
      tab === 'usuarios' ? this.cargueService.updateReliInfoUsuarios(this.usuarios()) :
      tab === 'empresa' ? this.cargueService.updateResumenEmpresa(this.empresa()) :
      tab === 'aps' ? this.cargueService.updateResumenAps(this.aps()) :
      tab === 'relleno' ? this.cargueService.updateResumenRelleno(this.relleno()) :
      this.cargueService.updateResumenAdicional(this.adicional());

    req$.subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.messages.add({ severity: res.status ? 'success' : 'error', summary: 'Reliquidación - Cargue', detail: res.message || 'Cambios guardados.' });
      },
      error: (err) => {
        this.guardando.set(false);
        this.messages.add({ severity: 'error', summary: 'Reliquidación - Cargue', detail: err?.error?.message || 'No se pudo guardar.' });
      }
    });
  }

  onTabChange(value: string | number | undefined): void {
    this.currentTab.set(String(value || 'usuarios') as CargueTab);
  }
}
