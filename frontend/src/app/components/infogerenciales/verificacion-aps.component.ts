import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EMPTY, forkJoin, Subject } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

@Component({
  selector: 'app-verificacion-aps',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ToastModule, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  providers: [MessageService],
  templateUrl: './verificacion-aps.component.html',
  styleUrls: ['./verificacion-aps.component.css']
})
export class VerificacionApsComponent {
  aps = signal<number | null>(null);
  anno = signal<number | null>(new Date().getFullYear());
  mes = signal<number | null>(new Date().getMonth() + 1);

  loading = signal(false);
  emprData = signal<Record<string, unknown>[]>([]);
  apsEmprData = signal<Record<string, unknown>[]>([]);
  rellenoData = signal<Record<string, unknown>[]>([]);

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

  private readonly destroyRef = inject(DestroyRef);
  private readonly consultarTrigger$ = new Subject<void>();

  constructor(
    private readonly service: InfoGerencialService,
    private readonly messages: MessageService
  ) {
    // switchMap cancela la consulta anterior si todavía está en vuelo cuando el
    // usuario cambia de selector de nuevo -- evita que una respuesta vieja pise
    // el resultado del período correcto. Legacy pinta las 3 tablas en simultáneo
    // (sin tabs), así que consultamos las 3 juntas con forkJoin.
    this.consultarTrigger$
      .pipe(
        switchMap(() => {
          const apsId = this.aps();
          const anno = this.anno();
          const mes = this.mes();
          if (!apsId || !anno || !mes) return EMPTY;

          this.loading.set(true);
          const periodo = periodoAnterior(anno, mes);
          return forkJoin({
            empr: this.service.infoemprdivi(apsId, periodo.anno, periodo.mes),
            apsEmpr: this.service.infoapsemprdivi(apsId, periodo.anno, periodo.mes),
            relleno: this.service.infoapsrelleno(apsId, periodo.anno, periodo.mes)
          }).pipe(
            catchError((err: any) => {
              this.loading.set(false);
              this.messages.add({ severity: 'error', summary: 'Verificación', detail: err?.error?.message || 'Error al consultar.' });
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ empr, apsEmpr, relleno }) => {
        this.loading.set(false);
        this.emprData.set(empr.data || []);
        this.apsEmprData.set(apsEmpr.data || []);
        this.rellenoData.set((relleno.data || []).map((row: Record<string, unknown>) => ({
          ...row,
          IARE_C_QRSMUNRECP: row['IARE_C']
        })));
      });
  }

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

  private consultar(): void {
    if (!this.aps() || !this.anno() || !this.mes()) return;
    this.consultarTrigger$.next();
  }
}
