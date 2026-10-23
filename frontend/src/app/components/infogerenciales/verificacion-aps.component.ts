import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { ApiEnvelope } from '../../models/proyecciones.models';
import { redondear } from '../../shared/redondeo.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

type TabVerificacion = 'EMPRESA' | 'APS' | 'RELLENO';

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Legacy 307 Verificacion.vue: APS + month selector (Selector.vue, default today), one query per summary for the
// selected month itself (Verificacion.vue:545, the "-1" shift is commented out).
@Component({
  selector: 'app-verificacion-aps',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ToastModule, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  providers: [MessageService],
  templateUrl: './verificacion-aps.component.html',
  styleUrls: ['./verificacion-aps.component.css']
})
export class VerificacionApsComponent {
  private readonly parametros = inject(ParametrosConsultaStateService);
  private readonly hoy = new Date();

  aps = signal<number | null>(null);
  // Selector.vue:153-158: without a stored period the legacy selector starts on today.
  anno = signal<number | null>(this.parametros.getAnno() === null ? this.hoy.getFullYear() : null);
  mes = signal<number | null>(this.parametros.getMes() === null ? this.hoy.getMonth() + 1 : null);

  loading = signal(false);
  currentTab = signal<TabVerificacion>('EMPRESA');

  readonly filasEmpresa = signal<Record<string, unknown>[]>([]);
  readonly filasAps = signal<Record<string, unknown>[]>([]);
  readonly filasRelleno = signal<Record<string, unknown>[]>([]);

  readonly columnasEmpresa: TablaColumn[] = [
    { field: 'EMPR_NOMBRE', header: 'EMPRESA', filtrable: true },
    { field: 'INED_CBLJ', header: 'CBLJ', numero: true },
    { field: 'INED_LBLJ', header: 'LBLJ', numero: true },
    { field: 'INED_N', header: 'N', numero: true },
    { field: 'INED_M3AGUA', header: 'M3AGUA', numero: true },
    { field: 'INED_CP', header: 'CP', numero: true },
    { field: 'INED_M2CCJ', header: 'M2CCJ', numero: true },
    { field: 'INED_M2LAVJ', header: 'M2LAVJ', numero: true },
    { field: 'INED_TIJ', header: 'TIJ', numero: true },
    { field: 'INED_KLPJ', header: 'KLPJ', numero: true },
    { field: 'INED_TMJ', header: 'TMJ', numero: true },
    { field: 'INED_CLAVJ', header: 'CLAVJ', numero: true },
    { field: 'INED_QRTJ', header: 'QRTJ', numero: true },
    { field: 'INED_QRSJ', header: 'QRSJ', numero: true }
  ];

  readonly columnasAps: TablaColumn[] = [
    { field: 'EMPR_NOMBRE', header: 'EMPRESA', filtrable: true },
    { field: 'IAED_QRTZ', header: 'QRTZ', numero: true },
    { field: 'IAED_CPE', header: 'CPE', numero: true },
    { field: 'IAED_T', header: 'T', numero: true },
    { field: 'IAED_VACRTABC', header: 'VACRTABC', numero: true },
    { field: 'IAED_VACRT', header: 'VACRT', numero: true },
    { field: 'IAED_CRTZ', header: 'CRTZ', numero: true },
    { field: 'IAED_QBL', header: 'QBL', numero: true },
    { field: 'IAED_QLU', header: 'QLU', numero: true },
    { field: 'IAED_QR', header: 'QR', numero: true },
    { field: 'IAED_TAFA', header: 'TAFA', numero: true },
    { field: 'IAED_ND', header: 'ND', numero: true },
    { field: 'IAED_NA', header: 'NA', numero: true },
    { field: 'IAED_QNA', header: 'QNA', numero: true },
    { field: 'IAED_TAFNA', header: 'TAFNA', numero: true },
    { field: 'IAED_QA', header: 'QA', numero: true },
    { field: 'IAED_APROVECHA', header: 'APROVECHA', numero: true },
    { field: 'IAED_CRTCOMP', header: 'CRTCOMP', numero: true },
    { field: 'IAED_CDFCOMP', header: 'CDFCOMP', numero: true },
    { field: 'IAED_QRSCOMP', header: 'QRSCOMP', numero: true }
  ];

  // IARE_C_QRSMUNRECP es un alias sintético del mismo campo real IARE_C -- el legacy
  // (Verificacion.vue) muestra IARE_C dos veces con encabezados distintos ("QRSmunrecp"
  // y "C"); tabla-avanzada indexa su estado de columnas por `field`, así que necesita
  // una clave única por columna aunque el valor subyacente sea el mismo.
  readonly columnasRelleno: TablaColumn[] = [
    { field: 'RELL_NOMRELLENO', header: 'RELLENO', filtrable: true },
    { field: 'IARE_QRS', header: 'QRS', numero: true },
    { field: 'IARE_C_QRSMUNRECP', header: 'QRSmunrecp', numero: true },
    { field: 'IARE_CDFK', header: 'CDFK', numero: true },
    { field: 'IARE_VACDFABC', header: 'VACDFABC', numero: true },
    { field: 'IARE_VACDF', header: 'VACDF', numero: true },
    { field: 'IARE_VL', header: 'VL', numero: true },
    { field: 'IARE_CTMLX', header: 'CTMLX', numero: true },
    { field: 'IARE_CTLK', header: 'CTLK', numero: true },
    { field: 'IARE_VACTLABC', header: 'VACTLABC', numero: true },
    { field: 'IARE_VACTL', header: 'VACTL', numero: true },
    { field: 'IARE_ESCENARIO', header: 'ESCENARIO', numero: true },
    { field: 'IARE_C', header: 'C', numero: true }
  ];

  // Verificacion.vue:538-541 redondeo(valor, 4) (null/0 -> 0) on every numeric column except INED_QRSJ (:135-141).
  private readonly decimalesEmpresa = this.decimales(this.columnasEmpresa, ['INED_QRSJ']);
  private readonly decimalesAps = this.decimales(this.columnasAps, []);
  private readonly decimalesRelleno = this.decimales(this.columnasRelleno, []);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly service: InfoGerencialService,
    private readonly messages: MessageService
  ) {}

  onApsChange(value: number | null): void {
    this.aps.set(value);
    this.consultar();
  }

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
    this.consultar();
  }

  onMesChange(value: number | null): void {
    this.mes.set(value);
    this.consultar();
  }

  onTabChange(value: string | number | undefined): void {
    const tab = String(value ?? 'EMPRESA') as TabVerificacion;
    this.currentTab.set(['EMPRESA', 'APS', 'RELLENO'].includes(tab) ? tab : 'EMPRESA');
  }

  private consultar(): void {
    const apsId = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (!apsId || !anno || !mes) return;

    this.loading.set(true);
    const vacio: ApiEnvelope<Record<string, unknown>[]> = { status: false, data: [], message: '' };
    forkJoin({
      empr: this.service.infoemprdivi(apsId, anno, mes),
      apsEmpr: this.service.infoapsemprdivi(apsId, anno, mes),
      relleno: this.service.infoapsrelleno(apsId, anno, mes)
    })
      .pipe(
        catchError((err: any) => {
          this.messages.add({
            severity: 'error',
            summary: 'Verificación',
            detail: err?.error?.message || `Error al consultar el mes ${NOMBRES_MESES[mes - 1]}.`
          });
          return of({ empr: vacio, apsEmpr: vacio, relleno: vacio });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ empr, apsEmpr, relleno }) => {
        this.loading.set(false);
        this.filasEmpresa.set(this.redondearFilas(empr.data || [], this.decimalesEmpresa));
        this.filasAps.set(this.redondearFilas(apsEmpr.data || [], this.decimalesAps));
        const rellenos = (relleno.data || []).map(row => ({ ...row, IARE_C_QRSMUNRECP: row['IARE_C'] }));
        this.filasRelleno.set(this.redondearFilas(rellenos, this.decimalesRelleno));
      });
  }

  // Like legacy redondeo, a missing/null value is shown as 0.
  private redondearFilas(rows: Record<string, unknown>[], decimales: Record<string, number>): Record<string, unknown>[] {
    return rows.map(row => {
      const copia: Record<string, unknown> = { ...row };
      for (const [campo, precision] of Object.entries(decimales)) copia[campo] = redondear(copia[campo], precision);
      return copia;
    });
  }

  private decimales(columnas: TablaColumn[], sinRedondeo: string[]): Record<string, number> {
    return Object.fromEntries(
      columnas.filter(col => col.numero && !sinRedondeo.includes(col.field)).map(col => [col.field, 4])
    );
  }
}
