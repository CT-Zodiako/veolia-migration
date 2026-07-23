import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AuthService, ApsItem } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

@Component({
  selector: 'app-aps-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  template: `
    <div class="form-group">
      <label *ngIf="label">{{ label }}</label>
      <p-select 
        [options]="apsList"
        [(ngModel)]="selectedAps"
        optionLabel="APSA_NOMAPS"
        optionValue="APSA_ID"
        [placeholder]="placeholder"
        [filter]="true"
        filterBy="APSA_NOMAPS"
        [showClear]="true"
        [disabled]="loading || apsList.length === 0"
        [style]="{width: '100%'}"
        (onChange)="onSelect($event.value)">
      </p-select>
      <small *ngIf="loading" class="text-muted">Cargando APS...</small>
      <small *ngIf="error" class="text-danger">{{ error }}</small>
    </div>
  `,
  styles: [`
    .form-group { margin-bottom: 12px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--color-text-body); }
    .text-muted { color: var(--color-text-muted); }
    .text-danger { color: var(--color-brand-accent); }
  `]
})
export class ApsSelectorComponent implements OnInit {
  @Input() label = 'APS';
  @Input() placeholder = 'Seleccione APS';
  @Input() selectedAps: number | null = null;
  
  @Output() selectedApsChange = new EventEmitter<number | null>();

  apsList: ApsItem[] = [];
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private parametrosState: ParametrosConsultaStateService
  ) {}

  ngOnInit(): void {
    if (this.selectedAps === null) {
      const guardado = this.parametrosState.getAps();
      if (guardado !== null) {
        this.selectedAps = guardado;
        this.selectedApsChange.emit(guardado);
      }
    }
    this.loadAps();
  }

  private loadAps(): void {
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) {
      this.error = 'No hay usuario logueado';
      return;
    }

    const usuario = JSON.parse(usuarioStr);
    const sisuId = usuario?.SISU_ID;
    
    if (!sisuId) {
      this.error = 'ID de usuario no encontrado';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.getApsAsignadas(sisuId).subscribe({
      next: (response) => {
        this.apsList = response.asignadas || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al cargar APS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSelect(value: number | string | null): void {
    const apsId = value ? Number(value) : null;
    this.selectedAps = apsId;
    this.selectedApsChange.emit(apsId);
    this.parametrosState.setAps(apsId);
  }
}
