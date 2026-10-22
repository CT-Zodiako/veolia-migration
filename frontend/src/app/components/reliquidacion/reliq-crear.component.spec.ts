import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ReliqCrearComponent } from './reliq-crear.component';
import { ApsService } from '../../services/aps.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { NotificationService } from '../../services/notification.service';

function setup(reliqOverrides: Record<string, unknown> = {}) {
  const aps = {
    // GET /api/v1/aps: only the active APS assigned to the logged-in user (legacy GET /aps).
    selectorPorUsuario: vi.fn(() => of([{ APSA_ID: 1, APSA_NOMAPS: 'APS Norte' }])),
    consultaGeneral: vi.fn(() => of([{ APSA_ID: 1, APSA_NOMAPS: 'APS Norte' }, { APSA_ID: 2, APSA_NOMAPS: 'APS Ajena' }])),
    usuarioPorAps: vi.fn(() => of([{ SISU_ID: 5, SISU_CORREO: 'sol@veolia.com' }]))
  };
  const reliq = {
    getReliquidaciones: vi.fn(() => of({ data: [] })),
    crearReliquidacion: vi.fn(() => of({ data: {} })),
    ...reliqOverrides
  };
  const notification = { success: vi.fn(), error: vi.fn(), warn: vi.fn() };

  TestBed.configureTestingModule({
    imports: [ReliqCrearComponent],
    providers: [
      { provide: ApsService, useValue: aps },
      { provide: ReliquidacionService, useValue: reliq },
      { provide: NotificationService, useValue: notification },
      ConfirmationService
    ]
  });

  const component = TestBed.createComponent(ReliqCrearComponent).componentInstance;
  return { component, aps, reliq, notification };
}

describe('ReliqCrearComponent', () => {
  it('lists only the APS assigned to the current user (C1)', () => {
    const { component, aps } = setup();

    expect(aps.selectorPorUsuario).toHaveBeenCalledTimes(1);
    expect(aps.consultaGeneral).not.toHaveBeenCalled();
    expect(component.apsOptions()).toEqual([{ apsaId: 1, apsaNombre: 'APS Norte' }]);
  });

  it('shows the backend message when creation fails (e.g. extraction did not return "ok")', () => {
    const message = "La extracción de la reliquidación no se completó (resultado: 'STUB_OK').";
    const { component, reliq, notification } = setup({
      crearReliquidacion: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 500, error: { status: 'error', data: null, message } })))
    });

    component.form.setValue({
      apsaId: 1, nombre: 'Reliq prueba', descripcion: '', desde: '202401', hasta: '202402',
      usuSolicita: 5, estado: 'Creada', usuAprueba: 6, idAtt: 11
    });
    component.guardar();

    expect(reliq.crearReliquidacion).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBe(false);
    expect(component.error()).toBe(message);
    expect(notification.error).toHaveBeenCalledWith(message);
    expect(notification.success).not.toHaveBeenCalled();
  });
});
