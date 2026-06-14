import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ValidacionesService, ValidacionRequest, ValidacionResponse } from '../../services/validaciones.service';

interface ValidacionItem {
  id: string;
  nombre: string;
  descripcion: string;
  ejecutando: boolean;
  resultado: ValidacionResponse | null;
}

interface ApsOption { label: string; value: number; }
interface MesOption { label: string; value: number; }

@Component({
  selector: 'app-validaciones-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './validaciones-page.component.html',
  styleUrls: ['./validaciones-page.component.css']
})
export class ValidacionesPageComponent {
  // Filtros
  aps = signal<number>(1);
  anno = signal<number>(2025);
  mes = signal<number>(4);

  readonly apsOptions: ApsOption[] = [
    { label: 'CVA', value: 1 },
    { label: 'CVNA', value: 2 },
    { label: 'San Pedro', value: 1031 }
  ];

  readonly mesOptions: MesOption[] = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i, 1).toLocaleString('es-CO', { month: 'long' }),
    value: i + 1
  }));

  readonly annoOptions: number[] = [2023, 2024, 2025, 2026];

  // Validaciones
  readonly validaciones = signal<ValidacionItem[]>([
    {
      id: 'existarifa',
      nombre: 'Existencia de Tarifa',
      descripcion: 'Verifica si existen tarifas calculadas para el período seleccionado',
      ejecutando: false,
      resultado: null
    },
    {
      id: 'cpsuivsfact',
      nombre: 'SUI vs Facturación',
      descripcion: 'Verifica que el costo de poda de facturación no supere el costo SUI techo',
      ejecutando: false,
      resultado: null
    },
    {
      id: 'cpproductividad',
      nombre: 'Productividad',
      descripcion: 'Verifica que el costo de poda SUI no sea igual al del período anterior cuando hay productividad',
      ejecutando: false,
      resultado: null
    },
    {
      id: 'cpenero',
      nombre: 'Enero',
      descripcion: 'Verifica cambio en costo de poda para el mes de enero',
      ejecutando: false,
      resultado: null
    },
    {
      id: 'integracion',
      nombre: 'Integración SC',
      descripcion: 'Verifica que las tarifas no hayan sido integradas con el sistema comercial',
      ejecutando: false,
      resultado: null
    },
    {
      id: 'existerelleno',
      nombre: 'Existencia Relleno',
      descripcion: 'Verifica que el APS tenga configurado un relleno',
      ejecutando: false,
      resultado: null
    },
    {
      id: 'existarifacert',
      nombre: 'Tarifa Certificada',
      descripcion: 'Verifica que existan tarifas certificadas para el período',
      ejecutando: false,
      resultado: null
    }
  ]);

  ejecutandoTodas = signal(false);

  constructor(
    private readonly validacionesService: ValidacionesService,
    private readonly messageService: MessageService
  ) {}

  private getRequest(): ValidacionRequest {
    return {
      aps: this.aps(),
      anno: this.anno(),
      mes: this.mes()
    };
  }

  ejecutarTodas(): void {
    this.ejecutandoTodas.set(true);
    const req = this.getRequest();
    const items = this.validaciones();

    // Ejecutar todas en paralelo
    const calls = [
      this.validacionesService.faucoExistarifa(req).pipe(catchError(err => of({ ok: false, message: err.error?.message || err.message }))),
      this.validacionesService.faucoCpsuivsfact(req).pipe(catchError(err => of({ ok: false, message: err.error?.message || err.message }))),
      this.validacionesService.faucoCpproductividad(req).pipe(catchError(err => of({ ok: false, message: err.error?.message || err.message }))),
      this.validacionesService.faucoCpenero(req).pipe(catchError(err => of({ ok: false, message: err.error?.message || err.message }))),
      this.validacionesService.faucoIntegracion(req).pipe(catchError(err => of({ ok: false, message: err.error?.message || err.message }))),
      this.validacionesService.faucoExisterelleno(req).pipe(catchError(err => of({ ok: false, message: err.error?.message || err.message }))),
      this.validacionesService.faucoExistarifacert(req).pipe(catchError(err => of({ ok: false, message: err.error?.message || err.message })))
    ];

    forkJoin(calls).pipe(
      finalize(() => this.ejecutandoTodas.set(false))
    ).subscribe({
      next: (results) => {
        const updated = items.map((item, idx) => ({
          ...item,
          ejecutando: false,
          resultado: results[idx]
        }));
        this.validaciones.set(updated);
        this.messageService.add({
          severity: 'success',
          summary: 'Validaciones completadas',
          detail: `Se ejecutaron ${results.length} validaciones`
        });
      },
      error: () => {
        this.ejecutandoTodas.set(false);
      }
    });
  }

  ejecutarUna(index: number): void {
    const items = this.validaciones();
    const item = items[index];
    if (!item) return;

    // Marcar como ejecutando
    const updated = [...items];
    updated[index] = { ...item, ejecutando: true, resultado: null };
    this.validaciones.set(updated);

    const req = this.getRequest();
    let call;

    switch (item.id) {
      case 'existarifa': call = this.validacionesService.faucoExistarifa(req); break;
      case 'cpsuivsfact': call = this.validacionesService.faucoCpsuivsfact(req); break;
      case 'cpproductividad': call = this.validacionesService.faucoCpproductividad(req); break;
      case 'cpenero': call = this.validacionesService.faucoCpenero(req); break;
      case 'integracion': call = this.validacionesService.faucoIntegracion(req); break;
      case 'existerelleno': call = this.validacionesService.faucoExisterelleno(req); break;
      case 'existarifacert': call = this.validacionesService.faucoExistarifacert(req); break;
      default: return;
    }

    call.pipe(
      catchError(err => of({ ok: false, message: err.error?.message || err.message })),
      finalize(() => {
        const finalItems = this.validaciones();
        finalItems[index] = { ...finalItems[index], ejecutando: false };
        this.validaciones.set([...finalItems]);
      })
    ).subscribe({
      next: (result) => {
        const finalItems = this.validaciones();
        finalItems[index] = { ...finalItems[index], resultado: result };
        this.validaciones.set([...finalItems]);
      }
    });
  }

  limpiarResultados(): void {
    this.validaciones.set(
      this.validaciones().map(item => ({ ...item, resultado: null, ejecutando: false }))
    );
  }

  getSeverity(resultado: ValidacionResponse | null): 'success' | 'danger' | 'secondary' {
    if (!resultado) return 'secondary';
    return resultado.ok ? 'success' : 'danger';
  }

  getResultadoTexto(resultado: ValidacionResponse | null): string {
    if (!resultado) return 'Sin ejecutar';
    if (resultado.ok) return 'OK';
    return resultado.message || 'Error';
  }
}
