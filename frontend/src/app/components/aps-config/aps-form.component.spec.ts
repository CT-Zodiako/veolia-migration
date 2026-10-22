import { TestBed } from '@angular/core/testing';
import { ApsFormComponent } from './aps-form.component';
import { ApsConfigItem, ApsMutationPayload } from '../../services/aps.service';

function render(aps: ApsConfigItem | null = null) {
  TestBed.configureTestingModule({ imports: [ApsFormComponent] });
  const fixture = TestBed.createComponent(ApsFormComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance };
}

function submit(component: ApsFormComponent): ApsMutationPayload | undefined {
  let emitted: ApsMutationPayload | undefined;
  component.save.subscribe((payload) => (emitted = payload));
  component.onSubmit();
  return emitted;
}

describe('ApsFormComponent', () => {
  // A1: legacy formAps.vue:37-53 radio 720/351, default "720".
  it('offers only the legacy resoluciones 720 and 351 as radio buttons', () => {
    const { fixture, component } = render();
    const radios = Array.from(fixture.nativeElement.querySelectorAll('p-radiobutton') as NodeListOf<HTMLElement>);

    expect(component.resolucionOptions).toEqual([720, 351]);
    expect(radios).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('input[name="resolucion"][type="number"]')).toBeNull();
  });

  it('defaults a new APS to resolución 720', () => {
    const { component } = render();
    component.nombre = 'APS Nueva';

    expect(component.resolucion).toBe(720);
    expect(submit(component)?.resolucion).toBe(720);
  });

  it('keeps the stored resolución when editing', () => {
    const { component } = render({ APSA_ID: 5, APSA_NOMAPS: 'APS', APSA_RESOLUCION: 351 });

    expect(submit(component)?.resolucion).toBe(351);
  });

  it('requires a resolución from the catalog before saving', () => {
    const { component } = render({ APSA_ID: 5, APSA_NOMAPS: 'APS', APSA_RESOLUCION: null });

    expect(component.resolucion).toBeNull();
    expect(submit(component)).toBeUndefined();
  });

  // A2: APSA_NOMAPS VARCHAR2(30).
  it('limits the APS name to 30 characters', () => {
    const { fixture } = render();
    const input = fixture.nativeElement.querySelector('input[name="nombre"]') as HTMLInputElement;

    expect(input.getAttribute('maxlength')).toBe('30');
  });

  it('still refuses an empty name', () => {
    const { component } = render();
    component.nombre = '  ';

    expect(submit(component)).toBeUndefined();
  });
});
