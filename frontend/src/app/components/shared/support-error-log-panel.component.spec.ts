import { TestBed } from '@angular/core/testing';
import { SupportErrorLogPanelComponent } from './support-error-log-panel.component';
import { SupportErrorLogService } from '../../services/support-error-log.service';

// No legacy equivalent: legacy only logged errors to the browser console (e.g. front-tarificador/src/service/AuthService.js
// console.error). The support log panel is new; these tests pin the current behavior.

function setup() {
  TestBed.configureTestingModule({ imports: [SupportErrorLogPanelComponent] });
  const service = TestBed.inject(SupportErrorLogService);
  const fixture = TestBed.createComponent(SupportErrorLogPanelComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, el: fixture.nativeElement as HTMLElement };
}

describe('SupportErrorLogPanelComponent (no legacy equivalent — pinned)', () => {
  it('starts closed with no badge and shows the empty message when opened', () => {
    const { fixture, component, el } = setup();
    expect(el.querySelector('.support-log-panel')).toBeNull();
    expect(el.querySelector('.support-log-badge')).toBeNull();
    component.toggle();
    fixture.detectChanges();
    expect(el.querySelector('.support-log-empty')?.textContent?.trim()).toBe('Sin errores registrados en esta sesión.');
  });

  it('lists entries newest first with origin label, status, method, url, message and ORA code', () => {
    const { fixture, component, service, el } = setup();
    service.push({ method: 'GET', url: '/api/v1/aps', status: 500, message: 'Fallo' });
    service.push({ method: 'POST', url: '/api/v1/tarifas', status: 500, message: 'ORA-00942: table or view does not exist', oraCode: 'ORA-00942' });
    component.toggle();
    fixture.detectChanges();
    expect(el.querySelector('.support-log-badge')?.textContent?.trim()).toBe('2');
    const entries = Array.from(el.querySelectorAll('.support-log-entry'));
    expect(entries.map(e => e.querySelector('.support-log-origen')?.textContent?.trim())).toEqual(['Base de datos', 'Backend']);
    expect(entries[0].querySelector('.support-log-method')?.textContent?.trim()).toBe('POST');
    expect(entries[0].querySelector('.support-log-url')?.textContent?.trim()).toBe('/api/v1/tarifas');
    expect(entries[0].querySelector('.support-log-status')?.textContent?.trim()).toBe('500');
    expect(entries[0].querySelector('.support-log-ora')?.textContent?.trim()).toBe('ORA-00942');
    expect(entries[1].querySelector('.support-log-message')?.textContent?.trim()).toBe('Fallo');
    expect(entries[1].querySelector('.support-log-ora')).toBeNull();
  });

  it('labels network failures (status 0) as "Red" and clears the log', () => {
    const { fixture, component, service, el } = setup();
    service.push({ method: 'GET', url: '/api/v1/aps', status: 0, message: 'Http failure' });
    expect(component.origenLabel(component.logs()[0].origen)).toBe('Red');
    component.limpiar();
    fixture.detectChanges();
    expect(component.logs()).toEqual([]);
    expect(el.querySelector('.support-log-badge')).toBeNull();
  });
});
