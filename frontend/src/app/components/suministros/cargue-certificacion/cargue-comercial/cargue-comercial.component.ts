import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { Fase1CertificacionService } from '../../../../services/fase1-certificacion.service';
import { FiltrosCertificacion, Municipio, Periodo, Prestador, TipoCargue } from '../../../../models/fase1-certificacion.models';

@Component({
  selector: 'app-cargue-comercial',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  template: `
    <p-card>
      <div class="grid">
        <div class="col-12 md:col-4">
          <label>Vigencia</label>
          <p-select [options]="periodos()" optionLabel="nombre" optionValue="id" [(ngModel)]="localFiltros.vigencia" (ngModelChange)="emitir()" />
        </div>
        <div class="col-12 md:col-4">
          <label>Departamento</label>
          <p-select [options]="departamentos" optionLabel="nombre" optionValue="id" [(ngModel)]="localFiltros.departamentoId" (ngModelChange)="onDepartamentoChange()" />
        </div>
        <div class="col-12 md:col-4">
          <label>Municipio</label>
          <p-select [options]="municipios()" optionLabel="nombre" optionValue="id" [(ngModel)]="localFiltros.municipioId" (ngModelChange)="onMunicipioChange()" />
        </div>
        <div class="col-12 md:col-6">
          <label>Prestador</label>
          <p-select [options]="prestadores()" optionLabel="nombre" optionValue="id" [(ngModel)]="localFiltros.prestadorId" (ngModelChange)="emitir()" />
        </div>
        <div class="col-12 md:col-6">
          <label>Tipo de Cargue</label>
          <p-select [options]="tiposCargue()" optionLabel="nombre" optionValue="id" [(ngModel)]="localFiltros.tipoCargueId" (ngModelChange)="emitir()" />
        </div>
      </div>
    </p-card>
  `
})
export class CargueComercialComponent implements OnInit {
  @Input() filtros: FiltrosCertificacion = { vigencia: null, departamentoId: null, municipioId: null, prestadorId: null, tipoCargueId: null };
  @Output() filtrosChange = new EventEmitter<FiltrosCertificacion>();

  readonly periodos = signal<Periodo[]>([]);
  readonly municipios = signal<Municipio[]>([]);
  readonly prestadores = signal<Prestador[]>([]);
  readonly tiposCargue = signal<TipoCargue[]>([]);

  readonly departamentos = [
    { id: 5, nombre: 'Antioquia' },
    { id: 8, nombre: 'Atlántico' },
    { id: 11, nombre: 'Bogotá D.C.' },
    { id: 76, nombre: 'Valle del Cauca' }
  ];

  localFiltros: FiltrosCertificacion = { vigencia: null, departamentoId: null, municipioId: null, prestadorId: null, tipoCargueId: null };

  constructor(private readonly service: Fase1CertificacionService) {}

  ngOnInit(): void {
    this.localFiltros = { ...this.filtros };
    this.service.getPeriodos().subscribe((data) => this.periodos.set(data));
    this.service.getTiposCargue().subscribe((data) => this.tiposCargue.set(data));
  }

  onDepartamentoChange(): void {
    this.localFiltros.municipioId = null;
    this.localFiltros.prestadorId = null;
    if (!this.localFiltros.departamentoId) {
      this.municipios.set([]);
      this.prestadores.set([]);
      this.emitir();
      return;
    }
    this.service.getMunicipios(this.localFiltros.departamentoId).subscribe((data) => this.municipios.set(data));
    this.emitir();
  }

  onMunicipioChange(): void {
    this.localFiltros.prestadorId = null;
    if (!this.localFiltros.municipioId) {
      this.prestadores.set([]);
      this.emitir();
      return;
    }
    this.service.getPrestadores(this.localFiltros.municipioId).subscribe((data) => this.prestadores.set(data));
    this.emitir();
  }

  emitir(): void {
    this.filtrosChange.emit({ ...this.localFiltros });
  }
}
