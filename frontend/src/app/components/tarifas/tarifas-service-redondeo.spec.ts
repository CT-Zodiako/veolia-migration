import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { TarifasService } from '../../services/tarifas.service';

function servicio(respuesta: unknown[]) {
  const post = vi.fn(() => of(respuesta));
  TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: { post } }] });
  return { service: TestBed.inject(TarifasService), post };
}

const fila = () => ({ CLAS_NOMBRE: 'Residencial', TARI_TC: 1.23456789, TARI_TBL: 2, TARI_TLU: null });

// Legacy TarifasService.js:115-124 (getTarxCos) and :187-196 (getTarxCosGeneral):
// objeto[llave] = parseFloat(objeto[llave].toFixed(6)) — numbers stay numbers.
describe('TarifasService rounding (501 / 601)', () => {
  it('501 getTarxCos rounds numeric fields to 6 decimals and keeps them as numbers', async () => {
    const { service, post } = servicio([fila()]);

    const [row] = await firstValueFrom(service.getTarxCos(7, 2025, 3));

    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/tarifas\/tarxcom$/), { aps: 7, anno: 2025, mes: 3 }, expect.anything());
    expect(row).toEqual({ CLAS_NOMBRE: 'Residencial', TARI_TC: 1.234568, TARI_TBL: 2, TARI_TLU: null });
    expect(typeof row['TARI_TC']).toBe('number');
  });

  it('601 getTarxCosGeneral rounds numeric fields to 6 decimals like the legacy', async () => {
    const { service, post } = servicio([fila()]);

    const [row] = await firstValueFrom(service.getTarxCosGeneral(2025, 3));

    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/tarifas\/tarxcomgeneral$/), { anno: 2025, mes: 3 }, expect.anything());
    expect(row).toEqual({ CLAS_NOMBRE: 'Residencial', TARI_TC: 1.234568, TARI_TBL: 2, TARI_TLU: null });
  });
});
