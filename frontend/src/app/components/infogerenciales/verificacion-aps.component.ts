import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { EmpresasService } from '../../services/empresas.service';
import { ApiEnvelope } from '../../models/proyecciones.models';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

type TabVerificacion = 'EMPRESA' | 'APS' | 'RELLENO';

interface GrupoTabla {
  nombre: string;
  filas: Record<string, unknown>[];
}

interface KpiCard {
  label: string;
  valor: string;
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface ResultadoMes {
  mes: number;
  empr: ApiEnvelope<Record<string, unknown>[]>;
  apsEmpr: ApiEnvelope<Record<string, unknown>[]>;
  relleno: ApiEnvelope<Record<string, unknown>[]>;
}

@Component({
  selector: 'app-verificacion-aps',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ToastModule, ApsSelectorComponent, AnnoSelectorComponent, TablaAvanzadaComponent],
  providers: [MessageService],
  templateUrl: './verificacion-aps.component.html',
  styleUrls: ['./verificacion-aps.component.css']
})
export class VerificacionApsComponent {
  aps = signal<number | null>(null);
  anno = signal<number | null>(null);
  semestre = signal<number | null>(null);
  empresaSeleccionada = signal<string | null>(null);

  loading = signal(false);
  currentTab = signal<TabVerificacion>('EMPRESA');

  readonly semestres = [
    { label: 'Semestre 1', value: 1 },
    { label: 'Semestre 2', value: 2 }
  ];

  private readonly empresasDisponibles = signal<{ label: string; value: string }[]>([]);
  readonly empresaOptions = computed(() => [
    { label: 'Todas las empresas', value: null as string | null },
    ...this.empresasDisponibles()
  ]);

  // Datos crudos de los 6 meses del semestre, cada fila con el campo sintético MES/_mesNum agregado.
  private readonly emprDataRaw = signal<Record<string, unknown>[]>([]);
  private readonly apsEmprDataRaw = signal<Record<string, unknown>[]>([]);
  private readonly rellenoDataRaw = signal<Record<string, unknown>[]>([]);

  // Placeholder visual: valores mock, falta definir qué KPIs reales van acá.
  readonly kpis = signal<KpiCard[]>([]);

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

  // Columnas mostradas en cada tabla por empresa/relleno: MES en vez de la columna de
  // agrupación (ahora es el título de la tabla, no una columna más).
  readonly columnasTablaEmpresa: TablaColumn[] = [
    { field: 'MES', header: 'MES' },
    ...this.columnasEmpresa.filter(col => col.field !== 'EMPR_NOMBRE')
  ];
  readonly columnasTablaAps: TablaColumn[] = [
    { field: 'MES', header: 'MES' },
    ...this.columnasAps.filter(col => col.field !== 'EMPR_NOMBRE')
  ];
  readonly columnasTablaRelleno: TablaColumn[] = [
    { field: 'MES', header: 'MES' },
    ...this.columnasRelleno.filter(col => col.field !== 'RELL_NOMRELLENO')
  ];

  private readonly numericasEmpresa = this.columnasEmpresa.filter(col => col.numero).map(col => col.field);
  private readonly numericasAps = this.columnasAps.filter(col => col.numero).map(col => col.field);
  private readonly numericasRelleno = this.columnasRelleno.filter(col => col.numero).map(col => col.field);

  readonly gruposEmpresa = computed<GrupoTabla[]>(() =>
    this.agruparPorEntidad(this.emprDataRaw(), 'EMPR_NOMBRE', this.numericasEmpresa, this.empresaSeleccionada())
  );
  readonly gruposAps = computed<GrupoTabla[]>(() =>
    this.agruparPorEntidad(this.apsEmprDataRaw(), 'EMPR_NOMBRE', this.numericasAps, this.empresaSeleccionada())
  );
  readonly gruposRelleno = computed<GrupoTabla[]>(() =>
    // No hay relación empresa-relleno en los datos de AUCO_INFOAPSRELLENO (sin FK a
    // AUCO_EMPRESAS) -- el filtro de empresa no aplica acá, se muestran todos los rellenos.
    this.agruparPorEntidad(this.rellenoDataRaw(), 'RELL_NOMRELLENO', this.numericasRelleno, null)
  );

  // Resalta las filas sintéticas TOTAL/PROMEDIO -- clases definidas en
  // tabla-avanzada.component.css (componente compartido, ver nota de encapsulamiento).
  readonly cellClassFilaEspecial = (row: Record<string, unknown>): string => {
    if (row['MES'] === 'TOTAL') return 'fila-total';
    if (row['MES'] === 'PROMEDIO') return 'fila-promedio';
    return '';
  };

  // TOTAL/PROMEDIO son filas sintéticas solo para lectura en pantalla -- no deben
  // aparecer en el CSV exportado.
  readonly filaEsExportable = (row: Record<string, unknown>): boolean =>
    row['MES'] !== 'TOTAL' && row['MES'] !== 'PROMEDIO';

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly service: InfoGerencialService,
    private readonly empresasService: EmpresasService,
    private readonly messages: MessageService
  ) {}

  onApsChange(value: number | null): void {
    this.aps.set(value);
    this.empresaSeleccionada.set(null);
    this.empresasDisponibles.set([]);
    if (value) {
      this.cargarEmpresas(value);
    }
    this.consultar();
  }

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
    this.consultar();
  }

  onSemestreChange(value: number | null): void {
    this.semestre.set(value);
    this.consultar();
  }

  onEmpresaChange(value: string | null): void {
    this.empresaSeleccionada.set(value);
  }

  onTabChange(value: string | number | undefined): void {
    const tab = String(value ?? 'EMPRESA') as TabVerificacion;
    this.currentTab.set(['EMPRESA', 'APS', 'RELLENO'].includes(tab) ? tab : 'EMPRESA');
  }

  private cargarEmpresas(apsId: number): void {
    forkJoin({
      propias: this.empresasService.getEmpresasPropias(apsId, 1),
      terceros: this.empresasService.getEmpresasPropias(apsId, 0)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ propias, terceros }) => {
          const nombres = Array.from(new Set([...(propias || []), ...(terceros || [])].map(e => e.EMPR_NOMBRE))).sort((a, b) =>
            a.localeCompare(b)
          );
          this.empresasDisponibles.set(nombres.map(nombre => ({ label: nombre, value: nombre })));
        },
        error: () => this.empresasDisponibles.set([])
      });
  }

  private consultar(): void {
    const apsId = this.aps();
    const anno = this.anno();
    const semestre = this.semestre();
    if (!apsId || !anno || !semestre) return;

    this.loading.set(true);
    const meses = semestre === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];

    forkJoin(meses.map(mes => this.consultarMes(apsId, anno, mes)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultadosPorMes => {
        this.loading.set(false);
        this.combinarResultados(resultadosPorMes);
      });
  }

  private consultarMes(apsId: number, anno: number, mes: number): Observable<ResultadoMes> {
    return forkJoin({
      empr: this.service.infoemprdivi(apsId, anno, mes),
      apsEmpr: this.service.infoapsemprdivi(apsId, anno, mes),
      relleno: this.service.infoapsrelleno(apsId, anno, mes)
    }).pipe(
      map(resultado => ({ mes, ...resultado })),
      catchError((err: any) => {
        this.messages.add({
          severity: 'error',
          summary: 'Verificación',
          detail: err?.error?.message || `Error al consultar el mes ${NOMBRES_MESES[mes - 1]}.`
        });
        const vacio: ApiEnvelope<Record<string, unknown>[]> = { status: false, data: [], message: '' };
        return of({ mes, empr: vacio, apsEmpr: vacio, relleno: vacio });
      })
    );
  }

  private combinarResultados(resultados: ResultadoMes[]): void {
    const emprRows: Record<string, unknown>[] = [];
    const apsRows: Record<string, unknown>[] = [];
    const rellenoRows: Record<string, unknown>[] = [];

    for (const resultado of resultados) {
      const mesNombre = NOMBRES_MESES[resultado.mes - 1];

      for (const row of resultado.empr.data || []) {
        emprRows.push({ ...row, MES: mesNombre, _mesNum: resultado.mes });
      }
      for (const row of resultado.apsEmpr.data || []) {
        apsRows.push({ ...row, MES: mesNombre, _mesNum: resultado.mes });
      }
      for (const row of resultado.relleno.data || []) {
        rellenoRows.push({ ...row, MES: mesNombre, _mesNum: resultado.mes, IARE_C_QRSMUNRECP: row['IARE_C'] });
      }
    }

    this.emprDataRaw.set(emprRows);
    this.apsEmprDataRaw.set(apsRows);
    this.rellenoDataRaw.set(rellenoRows);
    this.generarKpisMock();
  }

  private agruparPorEntidad(
    rows: Record<string, unknown>[],
    campoEntidad: string,
    columnasNumericas: string[],
    filtroEntidad: string | null
  ): GrupoTabla[] {
    const filtradas = filtroEntidad ? rows.filter(row => String(row[campoEntidad]) === filtroEntidad) : rows;

    const grupos = new Map<string, Record<string, unknown>[]>();
    for (const row of filtradas) {
      const nombre = String(row[campoEntidad] ?? 'Sin nombre');
      if (!grupos.has(nombre)) grupos.set(nombre, []);
      grupos.get(nombre)!.push(row);
    }

    return Array.from(grupos.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([nombre, filas]) => {
        const ordenadas = [...filas].sort((a, b) => Number(a['_mesNum']) - Number(b['_mesNum']));

        const total: Record<string, unknown> = { MES: 'TOTAL' };
        const promedio: Record<string, unknown> = { MES: 'PROMEDIO' };
        for (const campo of columnasNumericas) {
          const valores = ordenadas.map(fila => Number(fila[campo]) || 0);
          const suma = valores.reduce((acc, valor) => acc + valor, 0);
          total[campo] = Number(suma.toFixed(2));
          promedio[campo] = ordenadas.length > 0 ? Number((suma / ordenadas.length).toFixed(2)) : 0;
        }

        return { nombre, filas: [...ordenadas, total, promedio] };
      });
  }

  // Placeholder visual: valores mock, falta definir qué KPIs reales van acá.
  private generarKpisMock(): void {
    const etiquetas = [
      'Promedio N', 'Promedio LBLJ', 'Promedio ND', 'Promedio NA',
      'Promedio QNA', 'Promedio QRTZ', 'Promedio QRS', 'Promedio CP',
      'Promedio M3AGUA', 'Promedio M2CCJ', 'Promedio TIJ', 'Promedio CBLJ'
    ];
    this.kpis.set(
      etiquetas.map(label => ({
        label,
        valor: (Math.random() * 2000).toFixed(2)
      }))
    );
  }
}
