import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { ClaseUso, SubcontItem } from '../../models/proyecciones.models';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { ProyeccionSelectorComponent } from '../shared/proyeccion-selector.component';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

@Component({
  selector: 'app-subcont-proy-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, TableModule,
    InputNumberModule, ToastModule, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent,
    ProyeccionSelectorComponent
  ],
  providers: [MessageService],
  templateUrl: './subcont-proy-page.component.html',
  styleUrls: ['./subcont-proy-page.component.css']
})
export class SubcontProyPageComponent {
  apsaId = signal<number | null>(null);
  proyId = signal<number | null>(null);
  anno = signal<number | null>(new Date().getFullYear());
  mes = signal<number | null>(new Date().getMonth() + 1);

  consultando = signal(false);
  guardando = signal(false);
  editando = signal(false);
  items = signal<SubcontItem[]>([]);
  clasesUso = signal<ClaseUso[]>([]);

  private itemsSnapshot: SubcontItem[] = [];

  itemsConNombre = computed(() => {
    const nombres = new Map(this.clasesUso().map(c => [c.clasClase, c.clasNombre]));
    return this.items().map(item => ({ ...item, nombreClase: nombres.get(item.clasClase) ?? `Clase ${item.clasClase}` }));
  });

  constructor(private readonly service: ProyeccionesService, private readonly messages: MessageService) {
    this.service.consultarClasesUso().subscribe({ next: (r) => this.clasesUso.set(r.data || []) });
  }

  onApsChange(apsaId: number | null): void {
    this.apsaId.set(apsaId);
    this.proyId.set(null);
    this.items.set([]);
    this.editando.set(false);
  }

  onProyChange(proyId: number | null): void {
    this.proyId.set(proyId);
    this.consultarSiCompleto();
  }

  onAnnoChange(anno: number | null): void {
    this.anno.set(anno);
    this.consultarSiCompleto();
  }

  onMesChange(mes: number | null): void {
    this.mes.set(mes);
    this.consultarSiCompleto();
  }

  private consultarSiCompleto(): void {
    if (this.apsaId() && this.proyId() && this.anno() && this.mes()) {
      this.consultar();
    }
  }

  private consultar(): void {
    const apsaId = this.apsaId();
    const proyId = this.proyId();
    const anno = this.anno();
    const mes = this.mes();
    if (!apsaId || !proyId || !anno || !mes) return;

    this.consultando.set(true);
    this.editando.set(false);
    const periodo = periodoAnterior(anno, mes);
    this.service.consultaSubcont({ apsaId, proyId, anno: periodo.anno, mes: periodo.mes }).subscribe({
      next: (r) => {
        this.items.set(r.data || []);
        this.consultando.set(false);
      },
      error: () => this.consultando.set(false)
    });
  }

  activarEdicion(): void {
    this.itemsSnapshot = this.items().map(item => ({ ...item }));
    this.editando.set(true);
  }

  cancelarEdicion(): void {
    this.items.set(this.itemsSnapshot);
    this.editando.set(false);
  }

  actualizarValor(index: number, valor: number | null): void {
    this.items.update(items => items.map((item, i) => (i === index ? { ...item, sucoValor: valor } : item)));
  }

  guardar(): void {
    const apsaId = this.apsaId();
    const proyId = this.proyId();
    const anno = this.anno();
    const mes = this.mes();
    if (!apsaId || !proyId || !anno || !mes) return;

    this.guardando.set(true);
    const periodo = periodoAnterior(anno, mes);
    this.service.editarPorcSubCon({ apsaId, proyId, anno: periodo.anno, mes: periodo.mes, items: this.items() }).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.messages.add({ severity: r.status ? 'success' : 'error', summary: 'Subsidios y Contribuciones', detail: r.message });
        if (r.status) {
          this.editando.set(false);
          this.consultar();
        }
      },
      error: () => this.guardando.set(false)
    });
  }
}
