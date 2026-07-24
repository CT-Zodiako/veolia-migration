import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { FacturacionService } from '../../services/facturacion.service';
import { FacturacionRequest, FacturacionResponse } from '../../models/facturacion.models';
import { redondearFilas } from '../../shared/redondeo.util';

type FacturacionTab = 'facturacion' | 'detafacturacion' | 'facturacionclus' | 'facturaciondinc' | 'facturacionelectronica';

@Component({
  selector: 'app-facturacion-page',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  template: `
    <section>
      <app-parametros-consulta
        [(aps)]="aps"
        [(anno)]="anno"
        [(mes)]="mes"
        [loading]="loading()"
        [autoConsultar]="true"
        (consultar)="consultar()"
        (parametrosIncompletos)="limpiar()"
      ></app-parametros-consulta>

      <div class="table-wrapper table-scroll">
      <p-tabs [value]="currentTab()" (valueChange)="onTabChange($event)">
        <p-tablist>
          <p-tab value="facturacion">Facturación</p-tab>
          <p-tab value="facturacionelectronica">Facturación Electrónica</p-tab>
          <p-tab value="detafacturacion">Det Facturación</p-tab>
          <p-tab value="facturacionclus">Det Facturación CLUS</p-tab>
          <p-tab value="facturaciondinc">Det Facturación DINC</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="facturacion">
            <app-tabla-avanzada
              [columnas]="columnasFacturacion"
              [rows]="resultados().facturacion?.filas || []"
              storageKey="facturacion-facturacion"
              nombreExportar="InfoFacturacion"
            ></app-tabla-avanzada>
          </p-tabpanel>
          <p-tabpanel value="facturacionelectronica">
            <app-tabla-avanzada
              [columnas]="columnasFacturacionElectronica"
              [rows]="resultados().facturacionelectronica?.filas || []"
              storageKey="facturacion-electronica"
              nombreExportar="InfoFacturacionElectronica"
            ></app-tabla-avanzada>
          </p-tabpanel>
          <p-tabpanel value="detafacturacion">
            <app-tabla-avanzada
              [columnas]="columnasDetaFacturacion"
              [rows]="resultados().detafacturacion?.filas || []"
              storageKey="facturacion-detafacturacion"
              nombreExportar="InfoDetFactura"
            ></app-tabla-avanzada>
          </p-tabpanel>
          <p-tabpanel value="facturacionclus">
            <app-tabla-avanzada
              [columnas]="columnasFacturacionClus"
              [rows]="resultados().facturacionclus?.filas || []"
              storageKey="facturacion-clus"
              nombreExportar="InfoFactClus"
            ></app-tabla-avanzada>
          </p-tabpanel>
          <p-tabpanel value="facturaciondinc">
            <app-tabla-avanzada
              [columnas]="columnasFacturacionDinc"
              [rows]="resultados().facturaciondinc?.filas || []"
              storageKey="facturacion-dinc"
              nombreExportar="InfoFactDINC"
            ></app-tabla-avanzada>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
      </div>
    </section>
  `
})
export class FacturacionPageComponent {
  aps: number | null = null;
  anno: number | null = null;
  mes: number | null = null;

  readonly currentTab = signal<FacturacionTab>('facturacion');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly resultados = signal<Partial<Record<FacturacionTab, FacturacionResponse>>>({});

  readonly columnasFacturacion: TablaColumn[] = [
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'TIPO_FACT', header: 'Tipo Fac', filtrable: true },
    { field: 'FAPR_NOMBRE', header: 'Factor P.', filtrable: true },
    { field: 'TARI_MES', header: 'Mes' },
    { field: 'FAPR_VALOR', header: 'Vlr Factor.', numero: true },
    { field: 'TARI_SUBCONT', header: 'Sub & Con', numero: true },
    { field: 'TARI_TC', header: 'TC', numero: true },
    { field: 'TARI_TBL', header: 'TBL', numero: true },
    { field: 'TARI_TLU', header: 'TLU', numero: true },
    { field: 'TARI_TRT', header: 'TRT', numero: true },
    { field: 'TARI_TDF', header: 'TDF', numero: true },
    { field: 'TARI_TTL', header: 'TTL', numero: true },
    { field: 'TARI_TA', header: 'TA', numero: true },
    { field: 'TARIFAPLENA', header: 'T. Plena', numero: true },
    { field: 'TARI_TCSC', header: 'TC SC', numero: true },
    { field: 'TARI_TBLSC', header: 'TBL SC', numero: true },
    { field: 'TARI_TLUSC', header: 'TLU SC', numero: true },
    { field: 'TARI_TRTSC', header: 'TRT SC', numero: true },
    { field: 'TARI_TDFSC', header: 'TDF SC', numero: true },
    { field: 'TARI_TTLSC', header: 'TTL SC', numero: true },
    { field: 'TARI_TASC', header: 'TA SC', numero: true },
    { field: 'TARIFASYC', header: 'Tar. S&C', numero: true },
    { field: 'TARI_TRNA', header: 'TRNA', numero: true },
    { field: 'TARI_TAFNA', header: 'TAFNA', numero: true },
    { field: 'TARI_TAFA', header: 'TAFA', numero: true },
    { field: 'TARI_TRA', header: 'TRA', numero: true },
    { field: 'TARI_TRBL', header: 'TRBL', numero: true },
    { field: 'TARI_TRLU', header: 'TRLU', numero: true },
    { field: 'TARI_TRRA', header: 'TRRA', numero: true },
    { field: 'TARI_CRT', header: 'CRT', numero: true },
    { field: 'TARI_CDF', header: 'CFT', numero: true },
    { field: 'TARI_CTL', header: 'CTL', numero: true },
    { field: 'TARI_VBA', header: 'VBA', numero: true },
    { field: 'TARI_CP', header: 'CP', numero: true },
    { field: 'TARI_CLAV', header: 'CLAV', numero: true },
    { field: 'TARI_CLP', header: 'CLP', numero: true },
    { field: 'TARI_CCEI', header: 'CCEI', numero: true },
    { field: 'TARI_CCEM', header: 'CCEM', numero: true }
  ];

  private readonly decimalesFacturacion: Record<string, number> = {
    FAPR_VALOR: 2, TARI_SUBCONT: 2, TARI_TC: 6, TARI_TBL: 2, TARI_TLU: 2, TARI_TRT: 2, TARI_TDF: 2, TARI_TTL: 2,
    TARI_TA: 2, TARIFAPLENA: 2, TARI_TCSC: 2, TARI_TBLSC: 2, TARI_TLUSC: 2, TARI_TRTSC: 2, TARI_TDFSC: 2,
    TARI_TTLSC: 2, TARI_TASC: 2, TARIFASYC: 2, TARI_TRNA: 6, TARI_TAFNA: 6, TARI_TAFA: 6, TARI_TRA: 6,
    TARI_TRBL: 6, TARI_TRLU: 6, TARI_TRRA: 6, TARI_CRT: 6, TARI_CDF: 6, TARI_CTL: 6, TARI_VBA: 6, TARI_CP: 6,
    TARI_CLAV: 6, TARI_CLP: 6, TARI_CCEI: 6, TARI_CCEM: 6
  };

  readonly columnasDetaFacturacion: TablaColumn[] = [
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'RETA_VARIABLE', header: 'Tarifa' },
    { field: 'RETA_VALORMES', header: 'Valor Mes', numero: true },
    { field: 'RETA_VALORPROM', header: 'Promedio', numero: true }
  ];

  private readonly decimalesDetaFacturacion: Record<string, number> = {
    RETA_VALORMES: 6, RETA_VALORPROM: 6
  };

  readonly columnasFacturacionClus: TablaColumn[] = [
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'FACTURA', header: 'Tipo Fac', filtrable: true },
    { field: 'FAPR_NOMBRE', header: 'Factor P.', filtrable: true },
    { field: 'FAPR_VALOR', header: 'Vlr Factor.', numero: true },
    { field: 'TARI_SUBCONT', header: 'Sub & Con', numero: true },
    { field: 'TARI_TC', header: 'TC', numero: true },
    { field: 'TARI_TBL', header: 'TBL', numero: true },
    { field: 'TCP', header: 'TCP', numero: true },
    { field: 'TCCC', header: 'TCCC', numero: true },
    { field: 'TCLAV', header: 'TCLAV', numero: true },
    { field: 'TCLP', header: 'TCLP', numero: true },
    { field: 'TCCEI', header: 'TCCEI', numero: true },
    { field: 'TCCEM', header: 'TCCEM', numero: true },
    { field: 'TARI_TRT', header: 'TRT', numero: true },
    { field: 'TARI_TTL', header: 'TTL', numero: true },
    { field: 'TARI_TA', header: 'TA', numero: true },
    { field: 'TARIFAPLENA', header: 'T. Plena', numero: true },
    { field: 'TARI_TCSC', header: 'TC SC', numero: true },
    { field: 'TCPSC', header: 'TCP SC', numero: true },
    { field: 'TCCCSC', header: 'TCCC SC', numero: true },
    { field: 'TCLAVSC', header: 'TCLAV SC', numero: true },
    { field: 'TCLPSC', header: 'TCLP SC', numero: true },
    { field: 'TCCEISC', header: 'TCCEI SC', numero: true },
    { field: 'TCCEMSC', header: 'TCCEM SC', numero: true },
    { field: 'TARI_TRTSC', header: 'TRT SC', numero: true },
    { field: 'TARI_TTLSC', header: 'TTL SC', numero: true },
    { field: 'TARI_TASC', header: 'TA SC', numero: true },
    { field: 'TARI_TRNA', header: 'TRNA', numero: true },
    { field: 'TARI_TAFNA', header: 'TAFNA', numero: true },
    { field: 'TARI_TAFA', header: 'TAFA', numero: true },
    { field: 'TARI_TRA', header: 'TRA', numero: true },
    { field: 'TARI_TRBL', header: 'TRBL', numero: true },
    { field: 'TARI_TRLU', header: 'TRLU', numero: true },
    { field: 'TARI_TRRA', header: 'TRRA', numero: true },
    { field: 'TARI_CRT', header: 'CRT', numero: true },
    { field: 'TARI_CDF', header: 'CFT', numero: true },
    { field: 'TARI_CTL', header: 'CTL', numero: true },
    { field: 'TARI_VBA', header: 'VBA', numero: true }
  ];

  private readonly decimalesFacturacionClus: Record<string, number> = {
    FAPR_VALOR: 2, TARI_SUBCONT: 2, TARI_TC: 2, TARI_TBL: 2, TCP: 2, TCCC: 2, TCLAV: 2, TCLP: 2, TCCEI: 2,
    TCCEM: 2, TARI_TRT: 2, TARI_TTL: 2, TARI_TA: 2, TARIFAPLENA: 2, TARI_TCSC: 2, TCPSC: 2, TCCCSC: 2,
    TCLAVSC: 2, TCLPSC: 2, TCCEISC: 2, TCCEMSC: 2, TARI_TRTSC: 2, TARI_TTLSC: 2, TARI_TASC: 2, TARI_TRNA: 6,
    TARI_TAFNA: 6, TARI_TAFA: 6, TARI_TRA: 6, TARI_TRBL: 6, TARI_TRLU: 6, TARI_TRRA: 6, TARI_CRT: 6,
    TARI_CDF: 6, TARI_CTL: 6, TARI_VBA: 6
  };

  readonly columnasFacturacionDinc: TablaColumn[] = [
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'TIPO_FACT', header: 'Tipo Fac', filtrable: true },
    { field: 'FAPR_NOMBRE', header: 'Factor P.', filtrable: true },
    { field: 'FAPR_VALOR', header: 'Vlr Factor.', numero: true },
    { field: 'TARI_SUBCONT', header: 'Sub & Con', numero: true },
    { field: 'DINC', header: 'SDINC', numero: true },
    { field: 'TARI_TC', header: 'TC', numero: true },
    { field: 'TARI_TBL', header: 'TBL', numero: true },
    { field: 'TARI_TLU', header: 'TLU', numero: true },
    { field: 'TARI_TRT', header: 'TRT', numero: true },
    { field: 'TARI_TDF', header: 'TDF', numero: true },
    { field: 'TARI_TTL', header: 'TTL', numero: true },
    { field: 'TARI_TA', header: 'TA', numero: true },
    { field: 'TARIFAPLENA', header: 'T. Plena', numero: true },
    { field: 'TARI_TCSC', header: 'TC SC', numero: true },
    { field: 'TARI_TBLSC', header: 'TBL SC', numero: true },
    { field: 'TARI_TLUSC', header: 'TLU SC', numero: true },
    { field: 'TARI_TRTSC', header: 'TRT SC', numero: true },
    { field: 'TARI_TDFSC', header: 'TDF SC', numero: true },
    { field: 'TARI_TTLSC', header: 'TTL SC', numero: true },
    { field: 'TARI_TASC', header: 'TA SC', numero: true },
    { field: 'TARIFASYC', header: 'Tar. S&C', numero: true },
    { field: 'TARI_TRNA', header: 'TRNA', numero: true },
    { field: 'TARI_TAFNA', header: 'TAFNA', numero: true },
    { field: 'TARI_TAFA', header: 'TAFA', numero: true },
    { field: 'TARI_TRA', header: 'TRA', numero: true },
    { field: 'TARI_TRBL', header: 'TRBL', numero: true },
    { field: 'TARI_TRLU', header: 'TRLU', numero: true },
    { field: 'TARI_TRRA', header: 'TRRA', numero: true },
    { field: 'TARI_CRT', header: 'CRT', numero: true },
    { field: 'TARI_CDF', header: 'CFT', numero: true },
    { field: 'TARI_CTL', header: 'CTL', numero: true },
    { field: 'TARI_VBA', header: 'VBA', numero: true },
    { field: 'TARI_CP', header: 'CP', numero: true },
    { field: 'TARI_CCC', header: 'CCC', numero: true },
    { field: 'TARI_CLAV', header: 'CLAV', numero: true },
    { field: 'TARI_CLP', header: 'CLP', numero: true },
    { field: 'TARI_CCEI', header: 'CCEI', numero: true },
    { field: 'TARI_CCEM', header: 'CCEM', numero: true }
  ];

  private readonly decimalesFacturacionDinc: Record<string, number> = {
    FAPR_VALOR: 2, TARI_SUBCONT: 2, DINC: 2, TARI_TC: 2, TARI_TBL: 2, TARI_TLU: 2, TARI_TRT: 2, TARI_TDF: 2,
    TARI_TTL: 2, TARI_TA: 2, TARIFAPLENA: 2, TARI_TCSC: 2, TARI_TBLSC: 2, TARI_TLUSC: 2, TARI_TRTSC: 2,
    TARI_TDFSC: 2, TARI_TTLSC: 2, TARI_TASC: 2, TARIFASYC: 2, TARI_TRNA: 2, TARI_TAFNA: 6, TARI_TAFA: 6,
    TARI_TRA: 6, TARI_TRBL: 6, TARI_TRLU: 6, TARI_TRRA: 6, TARI_CRT: 6, TARI_CDF: 6, TARI_CTL: 6, TARI_VBA: 6,
    TARI_CP: 6, TARI_CCC: 6, TARI_CLAV: 6, TARI_CLP: 6, TARI_CCEI: 6, TARI_CCEM: 6
  };

  readonly columnasFacturacionElectronica: TablaColumn[] = [
    { field: 'CLASEUSO', header: 'Clase Uso', filtrable: true },
    { field: 'TIPOTARIFA', header: 'Tipo Tarifa', filtrable: true },
    { field: 'SERVFACTURA', header: 'Tipo Fac', filtrable: true },
    { field: 'FACTOR', header: 'Factor P.', filtrable: true },
    { field: 'VALORFACTOR', header: 'Vlr Factor.', numero: true },
    { field: 'PORCSUBCONT', header: 'Sub & Con', numero: true },
    { field: 'TC', header: 'TC', numero: true },
    { field: 'TCAPROV', header: 'TCAPROV', numero: true },
    { field: 'TCAPROVPROP', header: 'TCAPROVPROP', numero: true },
    { field: 'TCAPROVTERC', header: 'TCAPROVTERC', numero: true },
    { field: 'TBL', header: 'TBL', numero: true },
    { field: 'TLU', header: 'TLU', numero: true },
    { field: 'TRT', header: 'TRT', numero: true },
    { field: 'TDF', header: 'TDF', numero: true },
    { field: 'TIAT', header: 'TIAT', numero: true },
    { field: 'TINCEN', header: 'TINCEN', numero: true },
    { field: 'TTL', header: 'TTL', numero: true },
    { field: 'TA', header: 'TA', numero: true },
    { field: 'TARIFAPLENA', header: 'T. Plena', numero: true },
    { field: 'TCSC', header: 'TCSC', numero: true },
    { field: 'TCAPROVSC', header: 'TCAPROVSC', numero: true },
    { field: 'TCAPROVPROPSC', header: 'TCAPROVPROPSC', numero: true },
    { field: 'TCAPROVTERCSC', header: 'TCAPROVTERCSC', numero: true },
    { field: 'TBLSC', header: 'TBLSC', numero: true },
    { field: 'TLUSC', header: 'TLUSC', numero: true },
    { field: 'TRTSC', header: 'TRTSC', numero: true },
    { field: 'TDFSC', header: 'TDFSC', numero: true },
    { field: 'TIATSC', header: 'TIATSC', numero: true },
    { field: 'TINCENSC', header: 'TINCENSC', numero: true },
    { field: 'TTLSC', header: 'TTLSC', numero: true },
    { field: 'TASC', header: 'TASC', numero: true },
    { field: 'TARIFASYC', header: 'Tar. S&C', numero: true },
    { field: 'TRNA', header: 'TRNA', numero: true },
    { field: 'TAFNA', header: 'TAFNA', numero: true },
    { field: 'TAFA', header: 'TAFA', numero: true },
    { field: 'TRA', header: 'TRA', numero: true },
    { field: 'TRBL', header: 'TRBL', numero: true },
    { field: 'TRLU', header: 'TRLU', numero: true },
    { field: 'TRRA', header: 'TRRA', numero: true },
    { field: 'CRT', header: 'CRT', numero: true },
    { field: 'CDF', header: 'CFT', numero: true },
    { field: 'COSTIAT', header: 'COSTIAT', numero: true },
    { field: 'COSTINCEN', header: 'COSTINCEN', numero: true },
    { field: 'CTL', header: 'CTL', numero: true },
    { field: 'VBA', header: 'VBA', numero: true },
    { field: 'CP', header: 'CP', numero: true },
    { field: 'CCC', header: 'CCC', numero: true },
    { field: 'CLAV', header: 'CLAV', numero: true },
    { field: 'CLP', header: 'CLP', numero: true },
    { field: 'CCEI', header: 'CCEI', numero: true },
    { field: 'CCEM', header: 'CCEM', numero: true }
  ];

  private readonly decimalesFacturacionElectronica: Record<string, number> = {
    VALORFACTOR: 2, PORCSUBCONT: 2, TC: 6, TCAPROV: 6, TCAPROVPROP: 6, TCAPROVTERC: 6, TBL: 2, TLU: 2, TRT: 2,
    TDF: 2, TIAT: 6, TINCEN: 6, TTL: 2, TA: 2, TARIFAPLENA: 2, TCSC: 2, TCAPROVSC: 6, TCAPROVPROPSC: 6,
    TCAPROVTERCSC: 6, TBLSC: 2, TLUSC: 2, TRTSC: 2, TDFSC: 2, TIATSC: 6, TINCENSC: 6, TTLSC: 2, TASC: 2,
    TARIFASYC: 2, TRNA: 6, TAFNA: 6, TAFA: 6, TRA: 6, TRBL: 6, TRLU: 6, TRRA: 6, CRT: 6, CDF: 6, COSTIAT: 6,
    COSTINCEN: 6, CTL: 6, VBA: 6, CP: 6, CCC: 6, CLAV: 6, CLP: 6, CCEI: 6, CCEM: 6
  };

  constructor(private readonly service: FacturacionService) {}

  consultar(): void {
    const aps = this.aps;
    const anno = this.anno;
    const mes = this.mes;
    const apsValido = aps !== null && aps > 0;
    const annoValido = anno !== null && anno >= 2000 && anno <= 2999;
    const mesValido = mes !== null && mes >= 1 && mes <= 12;
    if (!apsValido || !annoValido || !mesValido || aps === null || anno === null || mes === null) return;
    this.loading.set(true);
    this.error.set('');
    const payload: FacturacionRequest = { aps, mes, anno };

    forkJoin({
      facturacion: this.service.facturacion(payload),
      detafacturacion: this.service.detafacturacion(payload),
      facturacionclus: this.service.facturacionclus(payload),
      facturaciondinc: this.service.facturaciondinc(payload),
      facturacionelectronica: this.service.facturacionelectronica(payload)
    }).subscribe({
      next: (resp) => {
        this.resultados.set({
          facturacion: {
            ...resp.facturacion,
            filas: redondearFilas(
              resp.facturacion.filas.map((fila) => ({ ...fila, TARI_MES: ((Number(fila['TARI_MES']) || 0) % 12) + 1 })),
              this.decimalesFacturacion
            )
          },
          detafacturacion: { ...resp.detafacturacion, filas: redondearFilas(resp.detafacturacion.filas, this.decimalesDetaFacturacion) },
          facturacionclus: { ...resp.facturacionclus, filas: redondearFilas(resp.facturacionclus.filas, this.decimalesFacturacionClus) },
          facturaciondinc: { ...resp.facturaciondinc, filas: redondearFilas(resp.facturaciondinc.filas, this.decimalesFacturacionDinc) },
          facturacionelectronica: { ...resp.facturacionelectronica, filas: redondearFilas(resp.facturacionelectronica.filas, this.decimalesFacturacionElectronica) }
        });
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.error?.message || e?.message || 'Error consultando facturación.');
        this.loading.set(false);
      }
    });
  }

  limpiar(): void {
    this.resultados.set({});
    this.error.set('');
  }

  onTabChange(value: string | number | undefined): void {
    this.currentTab.set(String(value ?? 'facturacion') as FacturacionTab);
  }
}
