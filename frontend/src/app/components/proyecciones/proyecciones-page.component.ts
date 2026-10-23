import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProyeccionesService, UltimaTarifa } from '../../services/proyecciones.service';
import { Proyeccion } from '../../models/proyecciones.models';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';

// AUGE_PARAMETROS CLAS_CLAS=100 (catálogo real, verificado contra Oracle):
// 1 = Ingresos, 2 = Subsidios o Contribuciones (legacy Crear.vue/formCrear.vue: "Sub & Con").
const TIPO_PROYECCION_OPTIONS = [
  { label: 'Ingresos', value: 1 },
  { label: 'Subsidios o Contribuciones', value: 2 }
];

const OBLIGATORIOS = 'Todos los datos son obligatorios';

interface ProyeccionForm {
  apsaId: number;
  apsaNombre: string;
  proyNombre: string;
  proyDescripcion: string;
  proyTipo100: number;
  proyAnnoDes: number | null;
  proyMesDes: number | null;
  // "Horizonte hasta" del legacy (formCrear.vue:73-77): se guarda como hasta = horizonte - 1 mes.
  horizonteAnno: number | null;
  horizonteMes: number | null;
}

type ProyeccionFila = Proyeccion & { desde: string; hasta: string };

const periodoSiguiente = (anno: number, mes: number) => (mes === 12 ? { anno: anno + 1, mes: 1 } : { anno, mes: mes + 1 });
const dosDigitos = (n: number) => String(n).padStart(2, '0');

@Component({
  selector: 'app-proyecciones-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, DialogModule, InputTextModule, InputNumberModule, TextareaModule, ToastModule, ApsSelectorComponent],
  providers: [MessageService],
  templateUrl: './proyecciones-page.component.html',
  styleUrls: ['./proyecciones-page.component.css']
})
export class ProyeccionesPageComponent {
  rows = signal<Proyeccion[]>([]);
  loading = signal(false);
  showDialog = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);

  readonly tipoOptions = TIPO_PROYECCION_OPTIONS;
  readonly pageSize = 15;
  readonly rowsPerPageOptions = [15, 30, 50, 100];

  idFilter = '';
  apsFilter = '';
  nombreFilter = '';
  tipoFilter = '';
  usuarioFilter = '';

  form: ProyeccionForm = this.formVacio();

  // Legacy consultageneral: desde/hasta como YYYY/MM (lpad del mes), ordenables.
  private readonly filas = computed<ProyeccionFila[]>(() => this.rows().map(row => ({
    ...row,
    desde: `${row.proyAnnoDes}/${dosDigitos(row.proyMesDes)}`,
    hasta: `${row.proyAnnoHas}/${dosDigitos(row.proyMesHas)}`
  })));

  constructor(
    private readonly service: ProyeccionesService,
    private readonly messages: MessageService,
    private readonly confirmationService: ConfirmationService
  ) {
    this.consultaGeneral();
  }

  get filteredRows(): ProyeccionFila[] {
    return this.filas().filter(row =>
      this.coincide(row.proyId, this.idFilter)
      && this.coincide(row.apsaNombre, this.apsFilter)
      && this.coincide(row.proyNombre, this.nombreFilter)
      && this.coincide(row.proyTipoNombre, this.tipoFilter)
      && this.coincide(row.sisuCorreo, this.usuarioFilter)
    );
  }

  desdeTexto(): string {
    const { proyAnnoDes, proyMesDes } = this.form;
    return proyAnnoDes && proyMesDes ? `${dosDigitos(proyMesDes)}/${proyAnnoDes}` : '';
  }

  onApsChange(apsaId: number | null): void {
    // Legacy formCrear.vue:20: el APS no se puede cambiar al actualizar.
    if (this.editingId()) return;
    this.form.apsaId = apsaId || 0;
    this.form.proyAnnoDes = null;
    this.form.proyMesDes = null;
    if (apsaId) {
      this.cargarDesde(apsaId);
    }
  }

  consultaGeneral(): void {
    this.loading.set(true);
    this.service.consultaGeneral().subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  nueva(): void {
    this.editingId.set(null);
    this.form = this.formVacio();
    this.showDialog.set(true);
  }

  editar(row: Proyeccion): void {
    this.editingId.set(row.proyId);
    // Legacy makecall (formCrear.vue:271-289): el horizonte muestra el hasta guardado + 1 mes.
    const horizonte = periodoSiguiente(row.proyAnnoHas, row.proyMesHas);
    this.form = {
      apsaId: row.apsaId,
      apsaNombre: row.apsaNombre ?? '',
      proyNombre: row.proyNombre,
      proyDescripcion: row.proyDescripcion ?? '',
      proyTipo100: row.proyTipo100,
      proyAnnoDes: row.proyAnnoDes,
      proyMesDes: row.proyMesDes,
      horizonteAnno: horizonte.anno,
      horizonteMes: horizonte.mes
    };
    this.showDialog.set(true);
  }

  guardar(): void {
    const f = this.form;
    if (!f.apsaId || !f.proyNombre.trim() || !f.proyDescripcion.trim()
      || !f.proyAnnoDes || !f.proyMesDes || !f.horizonteAnno || !f.horizonteMes) {
      this.messages.add({ severity: 'error', summary: 'Proyecciones', detail: OBLIGATORIOS });
      return;
    }

    const hasta = periodoAnterior(f.horizonteAnno, f.horizonteMes);
    const payload = {
      apsaId: f.apsaId,
      proyNombre: f.proyNombre,
      proyDescripcion: f.proyDescripcion,
      proyTipo100: f.proyTipo100,
      proyAnnoDes: f.proyAnnoDes,
      proyMesDes: f.proyMesDes,
      proyAnnoHas: hasta.anno,
      proyMesHas: hasta.mes
    };
    this.saving.set(true);
    const req$ = this.editingId() ? this.service.editar(this.editingId()!, payload) : this.service.crear(payload);
    req$.subscribe({
      next: (res) => {
        this.messages.add({ severity: res.status ? 'success' : 'error', summary: 'Proyecciones', detail: res.message });
        this.saving.set(false);
        this.showDialog.set(false);
        this.consultaGeneral();
      },
      error: (err) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Proyecciones', detail: err?.error?.message || 'No se pudo guardar la proyección.' });
      }
    });
  }

  eliminar(row: Proyeccion): void {
    this.confirmationService.confirm({
      header: 'Eliminar Proyección',
      message: `¿Seguro que querés eliminar la proyección "${row.proyNombre}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.confirmarEliminar(row)
    });
  }

  private confirmarEliminar(row: Proyeccion): void {
    this.service.eliminar(row.proyId).subscribe({
      next: (res) => {
        this.messages.add({ severity: res.status ? 'success' : 'error', summary: 'Proyecciones', detail: res.message });
        if (res.status) {
          this.consultaGeneral();
        }
      }
    });
  }

  // Legacy checkTarifaAps (formCrear.vue:292-297): "Desde" = new Date(anno, mes) de la última
  // tarifa (mes 1-12 usado como índice 0-11), o sea el mes siguiente a la última tarifa calculada.
  private cargarDesde(apsaId: number): void {
    this.service.ultimasTarifas(apsaId).subscribe({
      next: (res) => {
        if (this.form.apsaId !== apsaId) return;
        const ultima: UltimaTarifa | undefined = (res.data || [])[0];
        if (!ultima) {
          this.messages.add({ severity: 'warn', summary: 'Proyecciones', detail: 'El APS seleccionado no tiene un último cálculo de tarifas.' });
          return;
        }
        const desde = periodoSiguiente(ultima.anno, ultima.mes);
        this.form.proyAnnoDes = desde.anno;
        this.form.proyMesDes = desde.mes;
      }
    });
  }

  private formVacio(): ProyeccionForm {
    // Legacy: el horizonte arranca en el mes actual (date: new Date()).
    const hoy = new Date();
    return {
      apsaId: 0,
      apsaNombre: '',
      proyNombre: '',
      proyDescripcion: '',
      proyTipo100: 1,
      proyAnnoDes: null,
      proyMesDes: null,
      horizonteAnno: hoy.getFullYear(),
      horizonteMes: hoy.getMonth() + 1
    };
  }

  private coincide(valor: unknown, filtro: string): boolean {
    const term = filtro.trim().toLowerCase();
    return !term || String(valor ?? '').toLowerCase().includes(term);
  }
}
