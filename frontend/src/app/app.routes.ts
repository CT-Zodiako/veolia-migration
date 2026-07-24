import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/auth/login/login.component';
import { ChangePassComponent } from './components/auth/change-pass/change-pass.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { ApsxUsuarioComponent } from './components/usuarios/apsx-usuario/apsx-usuario.component';
import { AsignacionSistemaComponent } from './components/usuarios/asignacion-sistema/asignacion-sistema.component';
import { MenuxUsuarioComponent } from './components/usuarios/menux-usuario/menux-usuario.component';
import { ApsConfigComponent } from './components/aps-config/aps-config.component';
import { EmpresasConfigComponent } from './components/empresas/empresas-config.component';
import { ApsEmpresaComponent } from './components/sui853-configuracion/aps-empresa.component';
import { ApsDocumentosComponent } from './components/sui853-configuracion/aps-documentos.component';
import { ResiduosGeneradosComponent } from './components/sui853-configuracion/residuos-generados.component';
import { InformesGeneradosComponent } from './components/sui853-configuracion/informes-generados.component';
import { InformesGeneradosMesComponent } from './components/sui853-configuracion/informes-generados-mes.component';
import { CalculoTarifasComponent } from './components/tarifas/calculo-tarifas.component';
import { DetalleTarifasComponent } from './components/tarifas/detalle-tarifas.component';
import { DetalleTarifasGenComponent } from './components/tarifas/detalle-tarifas-gen.component';
import { HistorialCertificacionComponent } from './components/tarifas/historial-certificacion.component';
import { HistorialProductividadComponent } from './components/tarifas/historial-productividad.component';
import { AutorizacionReversionesComponent } from './components/reversiones/autorizacion-reversiones.component';
import { DetalladoAutorizacionComponent } from './components/reversiones/detallado-autorizacion.component';
import { EjecutarReversionComponent } from './components/suministros/ejecutar-reversion.component';
import { HistoricoReversionComponent } from './components/suministros/historico-reversion.component';
import { SuiReversionesComponent } from './components/sui-reversiones/sui-reversiones.component';
import { SuiIntegracionPageComponent } from './components/sui-integracion/sui-integracion-page.component';
import { FacturacionPageComponent } from './components/facturacion/facturacion-page.component';
import { RellenosConfigPageComponent } from './components/rellenos/rellenos-config-page.component';
import { ValidacionesPageComponent } from './components/validaciones/validaciones-page.component';
import { SubContPageComponent } from './components/subcont/subcont-page.component';
import { ProyeccionesPageComponent } from './components/proyecciones/proyecciones-page.component';
import { LineaTiempoPageComponent } from './components/proyecciones/linea-tiempo-page.component';
import { CrecimientoPageComponent } from './components/proyecciones/crecimiento-page.component';
import { SubcontProyPageComponent } from './components/proyecciones/subcont-proy-page.component';
import { EjecutarPageComponent } from './components/proyecciones/ejecutar-page.component';
import { ReliqCrearComponent } from './components/reliquidacion/reliq-crear.component';
import { ReliqCargueComponent } from './components/reliquidacion/reliq-cargue.component';
import { ReliqCompararCostoComponent } from './components/reliquidacion/reliq-comparar-costo.component';
import { ReliqCompararTarifasComponent } from './components/reliquidacion/reliq-comparar-tarifas.component';
import { ReliqTarificadorComponent } from './components/reliquidacion/reliq-tarificador.component';
import { InformeProyeccionesComponent } from './components/infogenerales/informe-proyecciones.component';
import { DetalleCostosComponent } from './components/infogerenciales/detalle-costos.component';
import { DetalleSubAporteComponent } from './components/infogerenciales/detalle-sub-aporte.component';
import { DashboardGerencialComponent } from './components/infogerenciales/dashboard-gerencial.component';
import { CostoPodaComponent } from './components/infogerenciales/costo-poda.component';
import { DescuentoCostosComponent } from './components/infogerenciales/descuento-costos.component';
import { VerificacionApsComponent } from './components/infogerenciales/verificacion-aps.component';
import { PgirsResumenComponent } from './components/pgirs/pgirs-resumen.component';
import { PgirsInformeVariablesComponent } from './components/pgirs/pgirs-informe-variables.component';
import { PgirsVariablesComponent } from './components/pgirs/pgirs-variables.component';
import { IndicesCraComponent } from './components/cra/indices-cra.component';
import { AjusteProductividadComponent } from './components/productividad/ajuste-productividad.component';
import { DescuentosCostosComponent } from './components/suministros/descuentos-costos.component';
import { AprovechamientoComponent } from './components/aprovechamiento/aprovechamiento.component';
import { CostoPodaComponent as SuministrosCostoPodaComponent } from './components/suministros/costo-poda.component';
import { CargueProductividadComponent } from './components/suministros/cargue-productividad.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'cambiar-clave', component: ChangePassComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'aps-usuario', component: ApsxUsuarioComponent },
      { path: 'asignacion-sistema', component: AsignacionSistemaComponent },
      { path: 'menu-usuario', component: MenuxUsuarioComponent },
      { path: 'aps', component: ApsConfigComponent },
      { path: 'empresas', component: EmpresasConfigComponent },
      { path: 'apsEmpresa', component: ApsEmpresaComponent },
      { path: 'apsDocumentos', component: ApsDocumentosComponent },
      { path: 'residuosGenerados', component: ResiduosGeneradosComponent },
      { path: 'informesGenerados', component: InformesGeneradosComponent },
      { path: 'informesGeneradosMes', component: InformesGeneradosMesComponent },
      { path: 'calculo', component: CalculoTarifasComponent },
      { path: 'tarifas', component: DetalleTarifasComponent },
      { path: 'tarifas-general', component: DetalleTarifasGenComponent },
      { path: 'histCertificacion', component: HistorialCertificacionComponent },
      { path: 'histProductividad', component: HistorialProductividadComponent },
      { path: 'reversion_auth', component: AutorizacionReversionesComponent },
      { path: 'detautorizacion', component: DetalladoAutorizacionComponent },
      { path: 'suministros/reversion', component: EjecutarReversionComponent },
      { path: 'suministros/historico', component: HistoricoReversionComponent },
      { path: 'sui-reversiones', component: SuiReversionesComponent },
      { path: 'sui/integracion', component: SuiIntegracionPageComponent },
      { path: 'facturacion', component: FacturacionPageComponent },
      { path: 'rellenos', component: RellenosConfigPageComponent },
      { path: 'validaciones', component: ValidacionesPageComponent },
      { path: 'subcon', component: SubContPageComponent },
      { path: 'proyecciones', component: ProyeccionesPageComponent },
      { path: 'proyecciones/linea-tiempo', component: LineaTiempoPageComponent },
      { path: 'proyecciones/crecimiento', component: CrecimientoPageComponent },
      { path: 'proyecciones/subcont', component: SubcontProyPageComponent },
      { path: 'proyecciones/ejecutar', component: EjecutarPageComponent },
      { path: 'reliquidacion/crear', component: ReliqCrearComponent },
      { path: 'reliquidacion/cargue', component: ReliqCargueComponent },
      { path: 'reliquidacion/comparar-costo', component: ReliqCompararCostoComponent },
      { path: 'reliquidacion/comparar-tarifas', component: ReliqCompararTarifasComponent },
      { path: 'reliquidacion/tarificador', component: ReliqTarificadorComponent },
      { path: 'generales', component: InformeProyeccionesComponent },
      { path: 'gerencial/costos', component: DetalleCostosComponent },
      { path: 'gerencial/sub-aporte', component: DetalleSubAporteComponent },
      { path: 'gerencial/dashboard', component: DashboardGerencialComponent },
      { path: 'gerencial/poda', component: CostoPodaComponent },
      { path: 'gerencial/descuento-costos', component: DescuentoCostosComponent },
      { path: 'suministros/verificacion', component: VerificacionApsComponent },
      { path: 'pgirs/resumen', component: PgirsInformeVariablesComponent },
      { path: 'pgirs/informe-variables', component: PgirsResumenComponent },
      { path: 'pgirs/variables', component: PgirsVariablesComponent },
      { path: 'cra', component: IndicesCraComponent },
      { path: 'productividad', component: AjusteProductividadComponent },
      { path: 'suministros/descuento-costos', component: DescuentosCostosComponent },
      { path: 'suministros/aprovechamiento', component: AprovechamientoComponent },
      { path: 'suministros/costo-poda', component: SuministrosCostoPodaComponent },
      { path: 'suministros/cargue-productividad', component: CargueProductividadComponent },
      {
        path: 'suministros/cargue-certificacion',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./components/suministros/cargue-certificacion/cargue-certificacion.component').then(
            (m) => m.CargueCertificacionComponent
          )
      },
      {
        path: 'costos/calculo-tarifas',
        canActivate: [AuthGuard],
        loadComponent: () => import('./components/costos/costos-calculo-page.component').then((m) => m.CostosCalculoPageComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
