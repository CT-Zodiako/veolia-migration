import { TestBed } from '@angular/core/testing';
import { EmpresaFormComponent } from './empresa-form.component';
import { EmpresaMutationPayload } from '../../services/empresas.service';

function crear(): EmpresaFormComponent {
  TestBed.configureTestingModule({ imports: [EmpresaFormComponent] });
  TestBed.overrideComponent(EmpresaFormComponent, { set: { template: '', imports: [] } });
  return TestBed.createComponent(EmpresaFormComponent).componentInstance;
}

function submit(component: EmpresaFormComponent): EmpresaMutationPayload | undefined {
  let emitted: EmpresaMutationPayload | undefined;
  component.save.subscribe((payload) => (emitted = payload));
  component.onSubmit();
  return emitted;
}

describe('EmpresaFormComponent', () => {
  // E1: legacy EmpresaService.js:64,86 `nom.charAt(0).toUpperCase() + nom.slice(1)`.
  it('only uppercases the first letter and keeps the rest of the name as typed', () => {
    const component = crear();
    component.nombre = '  veolia ASEO S.A. E.S.P.  ';

    expect(submit(component)?.nombre).toBe('Veolia ASEO S.A. E.S.P.');
  });

  // E3: EMPR_NUAP is NOT NULL DEFAULT '0'.
  it('sends NUAP "0" when the field is empty', () => {
    const component = crear();
    component.nombre = 'Empresa';
    component.nuap = '   ';

    expect(submit(component)?.nuap).toBe('0');
  });

  it('keeps a typed NUAP', () => {
    const component = crear();
    component.nombre = 'Empresa';
    component.nuap = ' 12345 ';

    expect(submit(component)).toEqual({ nombre: 'Empresa', estado: 1, propia: 1, nuap: '12345' });
  });

  it('still refuses an empty name', () => {
    const component = crear();
    component.nombre = '   ';

    expect(submit(component)).toBeUndefined();
  });
});
