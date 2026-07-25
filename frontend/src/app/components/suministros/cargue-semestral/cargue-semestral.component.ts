import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, computed, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { ApsSelectorComponent } from '../../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../../shared/anno-selector.component';
import { InfPropiaSemComponent } from './inf-propia-sem/inf-propia-sem.component';
import { InfCompetidorSemComponent } from './inf-competidor-sem/inf-competidor-sem.component';
import { CargueComercialSemComponent } from './cargue-comercial-sem/cargue-comercial-sem.component';
import { InfRuralComponent } from './inf-rural/inf-rural.component';
import { SuministrosService } from '../../../services/suministros.service';
import { BarridoItem } from '../../../models/cargue-semestral.models';

type TabCargueSemestral = 'PROPIA' | 'COMPETIDOR' | 'USUARIOS' | 'RURAL';
const TABS_VALIDOS: TabCargueSemestral[] = ['PROPIA', 'COMPETIDOR', 'USUARIOS', 'RURAL'];

interface FilaModal extends BarridoItem {
  pgris: number;
}

@Component({
  selector: 'app-cargue-semestral',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MessageModule,
    DialogModule,
    ...CommonPrimeNgModules,
    ApsSelectorComponent,
    AnnoSelectorComponent,
    InfPropiaSemComponent,
    InfCompetidorSemComponent,
    CargueComercialSemComponent,
    InfRuralComponent
  ],
  templateUrl: './cargue-semestral.component.html',
  styleUrl: './cargue-semestral.component.css'
})
export class CargueSemestralComponent {
  readonly aps = signal<number | null>(null);
  readonly anno = signal<number | null>(null);
  readonly semestre = signal<number | null>(null);
  readonly currentTab = signal<TabCargueSemestral>('PROPIA');

  readonly verificando = signal(false);
  readonly tarifasExistentes = signal<boolean | null>(null);
  readonly rellenoExiste = signal(false);
  readonly certificando = signal(false);
  readonly estado = signal('');
  readonly error = signal('');

  readonly mostrarModal = signal(false);
  readonly datosModal = signal<FilaModal[]>([]);

  readonly semestres = [
    { label: 'Semestre 1', value: 1 },
    { label: 'Semestre 2', value: 2 }
  ];

  readonly filtrosValidos = computed(() => !!this.aps() && !!this.anno() && !!this.semestre());
  readonly mostrarTabs = computed(() => this.filtrosValidos() && this.tarifasExistentes() === false);

  constructor(
    private readonly service: SuministrosService,
    private readonly confirmation: ConfirmationService
  ) {}

  onApsChange(value: number | null): void {
    this.aps.set(value);
    this.consultarSiCompleto();
  }

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
    this.consultarSiCompleto();
  }

  onSemestreChange(value: number | null): void {
    this.semestre.set(value);
    this.consultarSiCompleto();
  }

  private consultarSiCompleto(): void {
    if (!this.filtrosValidos()) {
      this.tarifasExistentes.set(null);
      this.rellenoExiste.set(false);
      return;
    }
    this.estado.set('');
    this.error.set('');
    this.verificarEstado();
  }

  private verificarEstado(): void {
    this.verificando.set(true);
    const payload = { aps: this.aps()!, anno: this.anno()!, semestre: this.semestre()! };

    this.service.getcanCertificateSemestral(payload).subscribe({
      next: (res) => {
        this.tarifasExistentes.set((res.data ?? 0) > 0);
        this.verificando.set(false);
      },
      error: () => {
        this.tarifasExistentes.set(null);
        this.verificando.set(false);
      }
    });

    this.service.existeRelleno(payload).subscribe({
      next: (res) => this.rellenoExiste.set(!!res.data),
      error: () => this.rellenoExiste.set(false)
    });
  }

  onTabChange(value: string | number | undefined): void {
    const tab = String(value ?? 'PROPIA') as TabCargueSemestral;
    this.currentTab.set(TABS_VALIDOS.includes(tab) ? tab : 'PROPIA');
  }

  onGuardadoHijo(): void {
    this.verificarEstado();
  }

  certificar(): void {
    if (!this.filtrosValidos() || this.tarifasExistentes() !== false) return;

    this.confirmation.confirm({
      header: 'Certificar tarifas semestrales',
      message: '¿Está seguro de certificar tarifas para el APS, año y semestre seleccionados?',
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
    const payload = { aps: this.aps()!, anno: this.anno()!, semestre: this.semestre()! };

    this.service.certificarSemestral(payload).subscribe({
      next: (res) => {
        if (res.data !== 1) {
          this.error.set('No se pudieron certificar las variables.');
        } else {
          this.estado.set('Certificado correctamente.');
        }
        this.ejecutarPlCertificar(payload);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Error al certificar tarifas semestrales.');
        this.ejecutarPlCertificar(payload);
      }
    });
  }

  private ejecutarPlCertificar(payload: { aps: number; anno: number; semestre: number }): void {
    this.service.plcertificarSemestral(payload).subscribe({
      next: (res) => {
        this.certificando.set(false);
        this.verificarEstado();
        this.abrirModalResultado(res.data);
      },
      error: () => {
        this.certificando.set(false);
        this.verificarEstado();
      }
    });
  }

  private abrirModalResultado(data: { dataset: { pgris: number[]; barrido: BarridoItem[] }[] } | null): void {
    const primerDataset = data?.dataset?.[0];
    if (!primerDataset) return;

    const pgrisConstante = primerDataset.pgris?.[0] ?? 0;
    this.datosModal.set(primerDataset.barrido.map((item) => ({ ...item, pgris: pgrisConstante })));
    this.mostrarModal.set(true);
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
