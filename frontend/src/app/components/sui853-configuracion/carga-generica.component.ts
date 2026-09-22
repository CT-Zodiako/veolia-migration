import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CargaDrivePreview, DriveSheet, LegacyEnvelope, Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';

@Component({
  selector: 'app-carga-generica',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule],
  templateUrl: './carga-generica.component.html',
  styleUrl: './carga-generica.component.css'
})
export class CargaGenericaComponent implements OnInit {
  private readonly service = inject(Sui853ConfiguracionService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  tables: string[] = [];
  sheets: DriveSheet[] = [];
  sheetId = '';
  sheetTitle = '';
  tableName = '';
  preview: CargaDrivePreview | null = null;
  selectedColumns: string[] = [];
  busy = false;
  confirming = false;
  error = '';
  success = '';
  private listedSheetId = '';

  get locked(): boolean { return this.busy || this.confirming; }
  get validTable(): boolean { return this.tables.includes(this.tableName); }
  get validSource(): boolean {
    return !!this.sheetId.trim() && this.listedSheetId === this.sheetId.trim()
      && this.sheets.some(sheet => sheet.title === this.sheetTitle);
  }
  get canLoad(): boolean {
    return !this.locked && this.validTable && this.validSource && !!this.preview
      && this.selectedColumns.length > 0
      && this.selectedColumns.every(column => this.preview!.commonColumns.includes(column));
  }

  ngOnInit(): void { this.loadTables(); }

  loadTables(): void {
    if (this.locked) return;
    this.tables = [];
    this.tableName = '';
    this.invalidatePreview();
    this.run(this.service.tablasSui(), data => { this.tables = data; });
  }

  sourceChanged(): void {
    this.sheets = [];
    this.sheetTitle = '';
    this.listedSheetId = '';
    this.invalidatePreview();
  }

  invalidatePreview(): void {
    this.preview = null;
    this.selectedColumns = [];
    this.error = '';
    this.success = '';
  }

  listSheets(): void {
    if (this.locked || !this.sheetId.trim()) return;
    this.sourceChanged();
    const id = this.sheetId.trim();
    this.run(this.service.listarHojasDrive(id), data => {
      this.sheets = data.sheets;
      this.listedSheetId = id;
      if (!this.sheets.length) this.success = 'El documento no contiene pestañas disponibles.';
    });
  }

  showPreview(): void {
    if (this.locked || !this.validSource || !this.validTable) return;
    this.invalidatePreview();
    this.run(this.service.cargaDriveDinamica({ ...this.request(), previewOnly: true }), data => {
      this.preview = data;
      this.selectedColumns = [...data.commonColumns];
    });
  }

  toggleColumn(column: string, checked: boolean): void {
    this.selectedColumns = checked
      ? [...new Set([...this.selectedColumns, column])]
      : this.selectedColumns.filter(value => value !== column);
  }

  load(): void {
    if (!this.canLoad) return;
    this.run(this.service.cargaDriveDinamica({ ...this.request(), previewOnly: false, selectedColumns: [...this.selectedColumns] }), data => {
      this.invalidatePreview();
      this.success = `Carga completada: ${data.insertResult.inserted} filas insertadas. Para otra carga, vuelva a previsualizar.`;
    });
  }

  confirmTruncate(): void {
    if (this.locked || !this.validTable) return;
    const table = this.tableName;
    this.confirming = true;
    this.confirmation.confirm({
      header: 'Vaciar tabla SUI',
      message: `Se eliminarán TODOS los registros de SUI.${table}. Esta acción no se puede deshacer. ¿Desea continuar?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar todos los registros',
      rejectLabel: 'Cancelar',
      defaultFocus: 'reject',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      reject: () => { this.confirming = false; },
      accept: () => {
        this.confirming = false;
        if (this.destroyRef.destroyed || this.busy || table !== this.tableName || !this.tables.includes(table)) return;
        this.run(this.service.truncateTable(table), () => {
          this.invalidatePreview();
          this.success = `Se eliminaron todos los registros de SUI.${table}.`;
        });
      }
    });
  }

  private request() {
    return { sheetId: this.sheetId.trim(), sheetTitle: this.sheetTitle, owner: 'SUI' as const, tableName: this.tableName };
  }

  private run<T>(request: Observable<LegacyEnvelope<T>>, onSuccess: (data: T) => void): void {
    this.busy = true;
    this.error = '';
    this.success = '';
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.busy = false; })).subscribe({
      next: response => {
        if (response.status !== 200) {
          this.error = 'La operación no pudo completarse. Verifique los datos y sus permisos.';
          return;
        }
        onSuccess(response.data);
      },
      error: () => { this.error = 'No se pudo completar la operación. Verifique su sesión, permisos y acceso al documento. Si intentó cargar, revise la tabla antes de reintentar para evitar duplicados.'; }
    });
  }
}
