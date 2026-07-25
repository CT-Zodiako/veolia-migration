import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../../shared/parametros-consulta.component';
import { InfPropiaComponent } from './inf-propia/inf-propia.component';
import { InfCompetidorComponent } from './inf-competidor/inf-competidor.component';
import { CargueComercialComponent } from './cargue-comercial/cargue-comercial.component';
import { InfTercerosComponent } from './inf-terceros/inf-terceros.component';
import { SuministrosService } from '../../../services/suministros.service';
import { CertificarMensualItem } from '../../../models/cargue-mensual.models';
import { periodoAnterior } from '../../../shared/periodo-anterior.util';

type TabCargueMensual = 'PROPIA' | 'COMPETIDOR' | 'USUARIOS' | 'TERCEROS';
const TABS_VALIDOS: TabCargueMensual[] = ['PROPIA', 'COMPETIDOR', 'USUARIOS', 'TERCEROS'];

@Component({
  selector: 'app-cargue-mensual',
  standalone: true,
  imports: [
    CommonModule,
    MessageModule,
    DialogModule,
    ...CommonPrimeNgModules,
    ParametrosConsultaComponent,
    InfPropiaComponent,
    InfCompetidorComponent,
    CargueComercialComponent,
    InfTercerosComponent
  ],
  templateUrl: './cargue-mensual.component.html',
  styleUrl: './cargue-mensual.component.css'
})
export class CargueMensualComponent {
  readonly aps = signal<number | null>(null);
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);
  readonly currentTab = signal<TabCargueMensual>('PROPIA');

  readonly verificando = signal(false);
  readonly tarifasExistentes = signal<boolean | null>(null);
  readonly certificando = signal(false);
  readonly estado = signal('');
  readonly error = signal('');

  readonly mostrarModal = signal(false);
  readonly datosModal = signal<CertificarMensualItem[]>([]);

  readonly filtrosValidos = computed(() => !!this.aps() && !!this.anno() && !!this.mes());
  readonly mostrarTabs = computed(() => this.filtrosValidos() && this.tarifasExistentes() === false);

  constructor(
    private readonly service: SuministrosService,
    private readonly confirmation: ConfirmationService
  ) {}

  consultar(): void {
    if (!this.filtrosValidos()) return;
    this.estado.set('');
    this.error.set('');
    this.verificarTarifas();
  }

  limpiar(): void {
    this.tarifasExistentes.set(null);
    this.estado.set('');
    this.error.set('');
  }

  private verificarTarifas(): void {
    this.verificando.set(true);
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    this.service.getcanCertificate({ aps: this.aps()!, anno: periodo.anno, mes: periodo.mes }).subscribe({
      next: (res) => {
        this.tarifasExistentes.set((res.data?.length ?? 0) > 0);
        this.verificando.set(false);
      },
      error: () => {
        this.tarifasExistentes.set(null);
        this.verificando.set(false);
      }
    });
  }

  onTabChange(value: string | number | undefined): void {
    const tab = String(value ?? 'PROPIA') as TabCargueMensual;
    this.currentTab.set(TABS_VALIDOS.includes(tab) ? tab : 'PROPIA');
  }

  onGuardadoHijo(): void {
    this.verificarTarifas();
  }

  certificar(): void {
    if (!this.filtrosValidos() || this.tarifasExistentes() !== false) return;

    this.confirmation.confirm({
      header: 'Certificar tarifas',
      message: '¿Está seguro de certificar tarifas para el APS y período seleccionados? Esta acción calcula las tarifas del período.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Certificar',
      rejectLabel: 'Cancelar',
      accept: () => this.ejecutarCertificar()
    });
  }

  private ejecutarCertificar(): void {
    this.certificando.set(true);
    this.error.set('');
    this.estado.set('');
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    const payload = { aps: this.aps()!, anno: periodo.anno, mes: periodo.mes };

    this.service.certificar(payload).subscribe({
      next: (res) => {
        if (res.data !== '1') {
          this.error.set('Error al certificar tarifas.');
        } else {
          this.estado.set('Certificado correctamente.');
        }
        this.ejecutarCertificarMensual(payload);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Error al certificar tarifas.');
        this.ejecutarCertificarMensual(payload);
      }
    });
  }

  private ejecutarCertificarMensual(payload: { aps: number; anno: number; mes: number }): void {
    this.service.certificarMensual(payload).subscribe({
      next: (res) => {
        this.certificando.set(false);
        this.verificarTarifas();
        this.abrirModalResultado(res.data);
      },
      error: () => {
        this.certificando.set(false);
        this.verificarTarifas();
      }
    });
  }

  private abrirModalResultado(raw: string | null): void {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      this.datosModal.set(parsed?.clus ?? []);
      this.mostrarModal.set(true);
    } catch {
      // respuesta no era JSON parseable, no hay datos para el modal
    }
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  claseCelda(color: string | undefined): string {
    if (color === 'rojo') return 'custom-rojo-style';
    if (color === 'verde') return 'custom-verde-style';
    return '';
  }
}
