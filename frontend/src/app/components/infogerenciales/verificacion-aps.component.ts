import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { ApiEnvelope } from '../../models/proyecciones.models';
import { VariableApsClave, VariablesApsResponse } from '../../models/info-gerencial.model';
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

interface MetricaPromedio {
  codigo: string;
  clave: VariableApsClave;
  nombre: string;
  marca?: boolean;
}

interface GrupoPromedio {
  titulo: string;
  icono: string;
  columnas: number;
  grande?: boolean;
  metricas: MetricaPromedio[];
}

// odd/tasks/verificacion-promedio-semestre.md S4 (artboard 05): grupos, códigos y claves de fauco_getvariablesaps.
const GRUPOS_PROMEDIO: GrupoPromedio[] = [
  {
    titulo: 'Toneladas', icono: 'pi pi-truck', columnas: 5, metricas: [
      { codigo: 'QRT', clave: 'qrt', nombre: 'Residuos recolectados y transportados' },
      { codigo: 'QBL', clave: 'qbl', nombre: 'Barrido y limpieza' },
      { codigo: 'QLU', clave: 'qlu', nombre: 'Limpieza urbana' },
      { codigo: 'QR', clave: 'qr', nombre: 'Rechazos de aprovechamiento' },
      { codigo: 'QNA', clave: 'qna', nombre: 'No aprovechables' },
      { codigo: 'Qa', clave: 'qa', nombre: 'Aprovechables' },
      { codigo: 'QRS', clave: 'qrs', nombre: 'Residuos sólidos dispuestos' },
      { codigo: 'QRSmun', clave: 'qrsmunrecp', nombre: 'Dispuestos del municipio' },
      { codigo: 'C', clave: 'c', nombre: 'Disposición (C)' },
      { codigo: 'TAFNA', clave: 'tafna', nombre: 'TAFNA' }
    ]
  },
  {
    titulo: 'Suscriptores', icono: 'pi pi-users', columnas: 4, grande: true, metricas: [
      { codigo: 'N', clave: 'n', nombre: 'Suscriptores' },
      { codigo: 'Na', clave: 'na', nombre: 'Suscriptores aforados' },
      { codigo: 'Naa', clave: 'naa', nombre: 'Aforados aprovechamiento' },
      { codigo: 'Nd', clave: 'nd', nombre: 'Desocupados' }
    ]
  },
  {
    titulo: 'Otros', icono: 'pi pi-th-large', columnas: 2, metricas: [
      { codigo: 'Lbl', clave: 'lbl', nombre: 'Longitud barrido (km)' },
      { codigo: 'VL', clave: 'vl', nombre: 'Volumen lixiviados' }
    ]
  },
  {
    titulo: 'Costos', icono: 'pi pi-wallet', columnas: 2, metricas: [
      { codigo: 'CRTcomp', clave: 'crt', nombre: 'Costo recolección y transporte', marca: true },
      { codigo: 'CDFcomp', clave: 'cdf', nombre: 'Costo disposición final', marca: true }
    ]
  }
];

// Coma decimal, hasta 4 decimales y sin separador de miles, como el artboard 05.
const FORMATO_PROMEDIO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4, useGrouping: false });

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

  // Promedio del semestre anterior: solo se consulta con el botón y se limpia al cambiar APS/Año/Mes (S3).
  readonly gruposPromedio = GRUPOS_PROMEDIO;
  readonly promedio = signal<VariablesApsResponse | null>(null);
  readonly cargandoPromedio = signal(false);
  readonly anuncioPromedio = signal('');
  readonly parametrosCompletos = computed(() => !!this.aps() && !!this.anno() && !!this.mes());
  readonly subtituloPromedio = computed(() => {
    const mes = this.mes();
    const anno = this.anno();
    if (!this.parametrosCompletos() || !mes || !anno) return '';
    return `Semestre anterior a ${NOMBRES_MESES[mes - 1]} ${anno} · APS ${this.nombreAps(this.aps()!)}`;
  });
  private readonly apsSelector = viewChild(ApsSelectorComponent);
  private readonly tituloPromedio = viewChild<ElementRef<HTMLElement>>('tituloPromedio');
  private consultaPromedio?: Subscription;

  constructor(
    private readonly service: InfoGerencialService,
    private readonly messages: MessageService
  ) {}

  onApsChange(value: number | null): void {
    if (value !== this.aps()) this.limpiarPromedio();
    this.aps.set(value);
    this.consultar();
  }

  onAnnoChange(value: number | null): void {
    if (value !== this.anno()) this.limpiarPromedio();
    this.anno.set(value);
    this.consultar();
  }

  onMesChange(value: number | null): void {
    if (value !== this.mes()) this.limpiarPromedio();
    this.mes.set(value);
    this.consultar();
  }

  onTabChange(value: string | number | undefined): void {
    const tab = String(value ?? 'EMPRESA') as TabVerificacion;
    this.currentTab.set(['EMPRESA', 'APS', 'RELLENO'].includes(tab) ? tab : 'EMPRESA');
  }

  consultarPromedio(): void {
    const apsId = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (!apsId || !anno || !mes || this.cargandoPromedio()) return;

    this.cargandoPromedio.set(true);
    this.anuncioPromedio.set('Consultando promedio semestre anterior…');
    // Sin toast propio: httpErrorInterceptor ya notifica el error; solo se vuelve al estado vacío.
    this.consultaPromedio = this.service.getVariablesAps(apsId, anno, mes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.cargandoPromedio.set(false);
          this.promedio.set(res.data ?? null);
          this.anuncioPromedio.set(`Promedio semestre anterior cargado: ${this.subtituloPromedio()}.`);
          this.tituloPromedio()?.nativeElement.focus();
        },
        error: () => {
          this.cargandoPromedio.set(false);
          this.promedio.set(null);
          this.anuncioPromedio.set('');
        }
      });
  }

  valorPromedio(clave: VariableApsClave): string {
    const valor = this.promedio()?.variables?.[clave];
    return typeof valor === 'number' ? FORMATO_PROMEDIO.format(valor) : '—';
  }

  private limpiarPromedio(): void {
    this.consultaPromedio?.unsubscribe();
    this.cargandoPromedio.set(false);
    if (this.promedio()) this.anuncioPromedio.set('Parámetros cambiados: el promedio se limpió.');
    this.promedio.set(null);
  }

  private nombreAps(apsId: number): string {
    const item = this.apsSelector()?.apsList.find((a) => Number(a.APSA_ID) === apsId);
    return item?.APSA_NOMAPS ?? String(apsId);
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
