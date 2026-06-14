import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, map, of } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { DialogModule } from 'primeng/dialog';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ApsService } from '../../services/aps.service';
import { ApsOption, Reliquidacion } from '../../models/reliquidacion.model';

@Component({
  selector: 'app-reliq-crear',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ...CommonPrimeNgModules],
  templateUrl: './reliq-crear.component.html',
  styleUrls: ['./reliq-crear.component.css']
})
export class ReliqCrearComponent {
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showDialog = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal('');
  readonly apsOptions = signal<ApsOption[]>([]);
  readonly reliquidaciones = signal<Reliquidacion[]>([]);

  readonly form = this.fb.nonNullable.group({
    apsaId: [0, [Validators.required, Validators.min(1)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: [''],
    desde: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    hasta: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    usuSolicita: [0, [Validators.required, Validators.min(1)]],
    estado: ['CREADA', [Validators.required]],
    usuAprueba: [0, [Validators.required, Validators.min(1)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly apsService: ApsService,
    private readonly reliqService: ReliquidacionService
  ) {
    this.loadAps();
    this.loadReliquidaciones();
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

  nueva(): void {
    this.editingId.set(null);
    this.form.reset({ apsaId: 0, nombre: '', descripcion: '', desde: '', hasta: '', usuSolicita: 0, estado: 'CREADA', usuAprueba: 0 });
    this.showDialog.set(true);
  }

  editar(row: Reliquidacion): void {
    this.editingId.set(row.relqId);
    this.form.patchValue({
      apsaId: row.apsaId,
      nombre: row.relqNombre,
      descripcion: row.relqDescripcion || '',
      desde: row.relqDesde,
      hasta: row.relqHasta,
      usuSolicita: row.relqSolicita || 0,
      estado: row.relqEstado,
      usuAprueba: row.relqAprueba || 0
    });
    this.showDialog.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
        this.loadReliquidaciones();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar la reliquidación.');
      }
    });
  }

  eliminar(row: Reliquidacion): void {
    if (!window.confirm(`¿Eliminar reliquidación ${row.relqNombre}?`)) return;
    this.reliqService.eliminarReliquidacion(row.relqId).subscribe({ next: () => this.loadReliquidaciones() });
  }

  private loadAps(): void {
    this.apsService.consultaGeneral().pipe(
      map((rows) => rows.map((item) => ({ apsaId: item.APSA_ID, apsaNombre: item.APSA_NOMAPS || `${item.APSA_ID}` }))),
      catchError(() => of([]))
    ).subscribe((rows) => this.apsOptions.set(rows));
  }
}
