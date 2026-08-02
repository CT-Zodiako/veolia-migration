import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, map, of } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ApsService } from '../../services/aps.service';
import { NotificationService } from '../../services/notification.service';
import { ApsOption, Reliquidacion } from '../../models/reliquidacion.model';

const ESTADO_OPTIONS = [
  { label: 'Creada', value: 'Creada' },
  { label: 'Aplicada', value: 'Aplicada' }
];

const DEFAULT_ID_ATT = 11;

@Component({
  selector: 'app-reliq-crear',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DialogModule, DatePickerModule, ...CommonPrimeNgModules],
  templateUrl: './reliq-crear.component.html',
  styleUrls: ['./reliq-crear.component.css']
})
export class ReliqCrearComponent {
  readonly estadoOptions = ESTADO_OPTIONS;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showDialog = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal('');
  readonly apsOptions = signal<ApsOption[]>([]);
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly usuariosAps = signal<Array<{ SISU_ID: number; SISU_CORREO: string }>>([]);
  readonly desdeDate = signal<Date | null>(null);
  readonly hastaDate = signal<Date | null>(null);

  private usuariosApsCargadosPara: number | null = null;

  readonly form = this.fb.nonNullable.group({
    apsaId: [0, [Validators.required, Validators.min(1)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: [''],
    desde: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    hasta: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    usuSolicita: [0, [Validators.required, Validators.min(1)]],
    estado: ['Creada', [Validators.required]],
    usuAprueba: [0, [Validators.required, Validators.min(1)]],
    idAtt: [DEFAULT_ID_ATT]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly apsService: ApsService,
    private readonly reliqService: ReliquidacionService,
    private readonly confirmationService: ConfirmationService,
    private readonly notification: NotificationService
  ) {
    this.loadAps();
    this.loadReliquidaciones();
    this.form.controls.apsaId.valueChanges.subscribe((apsaId) => {
      if (apsaId && apsaId > 0) {
        this.cargarUsuariosAps(apsaId);
      } else {
        this.usuariosAps.set([]);
        this.usuariosApsCargadosPara = null;
      }
    });
  }

  loadReliquidaciones(): void {
    this.loading.set(true);
    this.reliqService.getReliquidaciones().subscribe({
      next: (res) => {
        this.reliquidaciones.set(res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo consultar reliquidaciones.');
      }
    });
  }

  cargarUsuariosAps(apsaId: number): void {
    if (!apsaId || apsaId <= 0 || this.usuariosApsCargadosPara === apsaId) {
      return;
    }
    this.apsService.usuarioPorAps(apsaId).pipe(
      catchError(() => of([]))
    ).subscribe((usuarios) => {
      this.usuariosAps.set(usuarios || []);
      this.usuariosApsCargadosPara = apsaId;
    });
  }

  nueva(): void {
    this.editingId.set(null);
    this.error.set('');
    this.form.reset({ apsaId: 0, nombre: '', descripcion: '', desde: '', hasta: '', usuSolicita: 0, estado: 'Creada', usuAprueba: 0, idAtt: DEFAULT_ID_ATT });
    this.desdeDate.set(null);
    this.hastaDate.set(null);
    if (this.form.controls.apsaId.value > 0) {
      this.cargarUsuariosAps(this.form.controls.apsaId.value);
    }
    this.showDialog.set(true);
  }

  editar(row: Reliquidacion): void {
    this.editingId.set(row.relqId);
    this.error.set('');
    this.form.patchValue({
      apsaId: row.apsaId,
      nombre: row.relqNombre,
      descripcion: row.relqDescripcion || '',
      desde: row.relqDesde,
      hasta: row.relqHasta,
      usuSolicita: row.relqSolicita || 0,
      estado: row.relqEstado,
      usuAprueba: row.relqAprueba || 0,
      idAtt: row.relqIdAtt ?? DEFAULT_ID_ATT
    });
    this.desdeDate.set(this.yyyymmToDate(row.relqDesde));
    this.hastaDate.set(this.yyyymmToDate(row.relqHasta));
    this.cargarUsuariosAps(row.apsaId);
    this.showDialog.set(true);
  }

  guardar(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete correctamente los campos requeridos antes de guardar.');
      return;
    }

    this.saving.set(true);
    const payload = this.form.getRawValue();
    const req$ = this.editingId()
      ? this.reliqService.editarReliquidacion({ relqId: this.editingId()!, ...payload })
      : this.reliqService.crearReliquidacion(payload);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showDialog.set(false);
        this.notification.success('Reliquidación guardada correctamente.');
        this.loadReliquidaciones();
      },
      error: (err) => {
        this.saving.set(false);
        const backendMessage = err?.error?.message;
        const message = backendMessage || 'No se pudo guardar la reliquidación.';
        this.error.set(message);
        this.notification.error(message);
      }
    });
  }

  estadoClass(valor: string | null | undefined): string {
    const s = String(valor || '').trim().toLowerCase();
    if (s === 'creada' || s === 'creado') return 'estado-creado';
    if (s === 'aplicada' || s === 'aplicado') return 'estado-aplicada';
    return 'estado-otro';
  }

  onPeriodoChange(campo: 'desde' | 'hasta', date: Date | null): void {
    const yyyymm = this.dateToYyyymm(date);
    this.form.controls[campo].setValue(yyyymm);
    this.form.controls[campo].markAsTouched();
    this.validarPeriodoCruzado(campo);
  }

  private validarPeriodoCruzado(campo: 'desde' | 'hasta'): void {
    const desde = this.form.controls.desde.value;
    const hasta = this.form.controls.hasta.value;
    if (!desde || !hasta) return;
    if (campo === 'desde' && desde > hasta) {
      this.error.set("El periodo 'desde' no puede ser mayor que el periodo 'hasta'.");
      this.form.controls.desde.setValue('');
      this.desdeDate.set(null);
      this.notification.warn("El periodo 'desde' no puede ser mayor que el periodo 'hasta'.");
    }
    if (campo === 'hasta' && hasta < desde) {
      this.error.set("El periodo 'hasta' no puede ser menor que el periodo 'desde'.");
      this.form.controls.hasta.setValue('');
      this.hastaDate.set(null);
      this.notification.warn("El periodo 'hasta' no puede ser menor que el periodo 'desde'.");
    }
  }

  private yyyymmToDate(yyyymm: string | null | undefined): Date | null {
    if (!yyyymm || yyyymm.length !== 6) return null;
    const year = parseInt(yyyymm.substring(0, 4), 10);
    const month = parseInt(yyyymm.substring(4, 6), 10) - 1;
    return new Date(year, month, 1);
  }

  private dateToYyyymm(date: Date | null): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  eliminar(row: Reliquidacion): void {
    this.confirmationService.confirm({
      header: 'Eliminar Reliquidación',
      message: `¿Seguro que querés eliminar la reliquidación "${row.relqNombre}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.confirmarEliminar(row)
    });
  }

  private confirmarEliminar(row: Reliquidacion): void {
    this.reliqService.eliminarReliquidacion(row.relqId).subscribe({ next: () => this.loadReliquidaciones() });
  }

  private loadAps(): void {
    this.apsService.consultaGeneral().pipe(
      map((rows) => rows.map((item) => ({ apsaId: item.APSA_ID, apsaNombre: item.APSA_NOMAPS || `${item.APSA_ID}` }))),
      catchError(() => of([]))
    ).subscribe((rows) => this.apsOptions.set(rows));
  }
}
