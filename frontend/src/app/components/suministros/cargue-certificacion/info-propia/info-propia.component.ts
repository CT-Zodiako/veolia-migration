import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { ArchivoCargaResponse, CargueActual, FiltrosCertificacion, ParseoResponse } from '../../../../models/fase1-certificacion.models';
import { Fase1CertificacionService } from '../../../../services/fase1-certificacion.service';

@Component({
  selector: 'app-info-propia',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-card>
      <p class="m-0 mb-3">Cargue: <strong>{{ cargueActual?.cargueId || '—' }}</strong></p>
      <input type="file" (change)="onFile($event)" />
      <div class="mt-3 flex gap-2">
        <button pButton type="button" label="Subir archivo" icon="pi pi-upload" [disabled]="!selectedFile || !cargueActual" [loading]="loading()" (click)="subir()"></button>
        <button pButton type="button" severity="secondary" label="Parsear" icon="pi pi-play" [disabled]="!cargueActual" [loading]="parsing()" (click)="parsear()"></button>
        <button pButton type="button" severity="contrast" label="Descargar plantilla" icon="pi pi-download" [disabled]="!filtros?.tipoCargueId" (click)="descargarPlantilla()"></button>
      </div>
      <p class="mt-2" *ngIf="progress() > 0">Progreso: {{ progress() }}%</p>
      <p-table *ngIf="uploadResult() || parseoResult()" [value]="[buildResumen()]" responsiveLayout="scroll" styleClass="mt-3">
        <ng-template pTemplate="header"><tr><th>Filas leídas</th><th>Válidas</th><th>Inválidas</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr><td>{{ r.leidas }}</td><td>{{ r.validas }}</td><td>{{ r.invalidas }}</td></tr></ng-template>
      </p-table>
    </p-card>
  `
})
export class InfoPropiaComponent {
  @Input() cargueActual: CargueActual | null = null;
  @Input() filtros: FiltrosCertificacion | null = null;
  @Output() archivoChange = new EventEmitter<ArchivoCargaResponse>();

  selectedFile: File | null = null;
  readonly loading = signal(false);
  readonly parsing = signal(false);
  readonly progress = signal(0);
  readonly uploadResult = signal<ArchivoCargaResponse | null>(null);
  readonly parseoResult = signal<ParseoResponse | null>(null);

  constructor(private readonly service: Fase1CertificacionService) {}

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  subir(): void {
    if (!this.cargueActual?.cargueId || !this.selectedFile) return;
    this.loading.set(true);
    this.service.subirArchivo(this.cargueActual.cargueId, this.selectedFile).subscribe({
      next: (event) => {
        this.progress.set(event.progress);
        if (event.data) {
          this.uploadResult.set(event.data);
          this.archivoChange.emit(event.data);
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  parsear(): void {
    if (!this.cargueActual?.cargueId) return;
    this.parsing.set(true);
    this.service.parsearArchivo(this.cargueActual.cargueId).subscribe({
      next: (res) => {
        this.parseoResult.set(res);
        this.parsing.set(false);
      },
      error: () => this.parsing.set(false)
    });
  }

  descargarPlantilla(): void {
    if (!this.filtros?.tipoCargueId) return;
    this.service.getPlantilla(this.filtros.tipoCargueId).subscribe();
  }

  buildResumen() {
    return {
      leidas: this.parseoResult()?.filasTotales ?? this.uploadResult()?.filasLeidas ?? 0,
      validas: this.parseoResult()?.filasValidas ?? this.uploadResult()?.filasValidas ?? 0,
      invalidas: this.parseoResult()?.filasInvalidas ?? this.uploadResult()?.filasInvalidas ?? 0
    };
  }
}
