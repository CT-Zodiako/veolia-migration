import { formatoEje, resumirFacturacion } from './facturacion-resumen';

type Fila = Record<string, unknown>;

// Components of T. Plena (TARI_*) and of Tar. S&C (TARI_*SC) per estrato; each plena sums 1000.
const PLENA = { TARI_TC: 12, TARI_TBL: 148, TARI_TLU: 45, TARI_TRT: 579, TARI_TDF: 195, TARI_TTL: 19, TARI_TA: 2 };
const COMPONENTES_E1 = {
  ...PLENA,
  TARI_TCSC: 3.6, TARI_TBLSC: 44.4, TARI_TLUSC: 13.5, TARI_TRTSC: 173.7, TARI_TDFSC: 58.5, TARI_TTLSC: 5.7, TARI_TASC: 2
};
const COMPONENTES_E4 = {
  ...PLENA,
  TARI_TCSC: 12, TARI_TBLSC: 148, TARI_TLUSC: 45, TARI_TRTSC: 579, TARI_TDFSC: 195, TARI_TTLSC: 19, TARI_TASC: 2
};
const COMPONENTES_E6 = {
  ...PLENA,
  TARI_TCSC: 41.4, TARI_TBLSC: 510.6, TARI_TLUSC: 155.25, TARI_TRTSC: 1997.55, TARI_TDFSC: 672.75, TARI_TTLSC: 65.55, TARI_TASC: 6.9
};

function fila(clase: string, tarifa: string, plena: number | null, paga: number | null, extra: Fila = {}): Fila {
  return {
    CLAS_NOMBRE: clase,
    PARA_NOMBRE: tarifa,
    TIPO_FACT: 'Acueducto',
    FAPR_NOMBRE: 'F1',
    TARIFAPLENA: plena,
    TARIFASYC: paga,
    TARI_TAFNA: 3364.61,
    ...extra
  };
}

// Design reference design/facturacion-detallado/01-detallado-facturacion.html (Cartagena, septiembre).
const PAGOS: Record<string, [number, number, number]> = {
  'Aforo Ordinario': [71578.28, 238594.26, 823150.19],
  'Aforo Permanente': [71578.28, 238594.26, 823150.19],
  'Sin Aforo': [18697.87, 65482.23, 251834.4],
  'No Rec. PaP': [18416.55, 64314.12, 245910.3],
  Desocupado: [14964.14, 49880.46, 172088.2]
};

function filasDiseno(): Fila[] {
  const filas: Fila[] = [];
  // Table order of the design (Sin Aforo first), not the chart order.
  for (const tarifa of ['Sin Aforo', 'Aforo Ordinario', 'Aforo Permanente', 'No Rec. PaP', 'Desocupado']) {
    const [e1, e4, e6] = PAGOS[tarifa];
    filas.push(fila('ESTRATO 1', tarifa, e4, e1, { TARI_SUBCONT: -0.7, ...COMPONENTES_E1 }));
    filas.push(fila('ESTRATO 4', tarifa, e4, e4, { TARI_SUBCONT: 0, ...COMPONENTES_E4 }));
    filas.push(fila('ESTRATO 6', tarifa, e4, e6, { TARI_SUBCONT: 2.45, ...COMPONENTES_E6 }));
  }
  filas.push(fila('OFICIAL', 'Aforo Ordinario', 238594.26, 238594.26));
  filas.push(fila('COMERCIAL', 'Aforo Ordinario', 238594.26, 381750.82));
  filas.push(fila('ESTRATO 2', 'Aforo Ordinario', 238594.26, 143156.56));
  filas.push(fila('ESTRATO 1', 'Aforo Ordinario', 1, 1, { TIPO_FACT: 'Aseo' }));
  return filas;
}

const DISENO = { tipoFactura: 'Acueducto', tipoTarifa: 'Aforo Ordinario' };

describe('resumirFacturacion — cards (S4)', () => {
  it('reproduces the design cards: estrato 4 plena, estrato 1 −70 %, estrato 6 +245 %, brecha 11,5 veces', () => {
    const r = resumirFacturacion(filasDiseno(), DISENO);

    expect(r.vacio).toBe(false);
    expect(r.tarjetas).toEqual([
      { etiqueta: 'Estrato 4 · tarifa plena', valor: '238.594,26', unidad: '', detalle: 'Sin subsidio ni contribución', tono: 'neutro' },
      { etiqueta: 'Estrato 1 paga', valor: '71.578,28', unidad: '', detalle: '−70 % frente a la tarifa plena', tono: 'subsidio' },
      { etiqueta: 'Estrato 6 paga', valor: '823.150,19', unidad: '', detalle: '+245 % frente a la tarifa plena', tono: 'contribucion' },
      { etiqueta: 'Brecha estrato 6 / estrato 1', valor: '11,5', unidad: 'veces', detalle: 'Lo que paga cada uno', tono: 'neutro' }
    ]);
  });
});

describe('resumirFacturacion — charts (S5)', () => {
  it('lists each clase de uso in the design order with tarifa plena, what it pays and subsidio/contribución tone', () => {
    const r = resumirFacturacion(filasDiseno(), DISENO);

    expect(r.subtituloClases).toBe('Aforo Ordinario · Acueducto');
    expect(r.clases).toEqual([
      { clase: 'ESTRATO 1', plena: 238594.26, paga: 71578.28, tono: 'subsidio' },
      { clase: 'ESTRATO 2', plena: 238594.26, paga: 143156.56, tono: 'subsidio' },
      { clase: 'ESTRATO 4', plena: 238594.26, paga: 238594.26, tono: 'neutro' },
      { clase: 'ESTRATO 6', plena: 238594.26, paga: 823150.19, tono: 'contribucion' },
      { clase: 'COMERCIAL', plena: 238594.26, paga: 381750.82, tono: 'contribucion' },
      { clase: 'OFICIAL', plena: 238594.26, paga: 238594.26, tono: 'neutro' }
    ]);
  });

  // User: T. Plena = TC+TBL+TLU+TRT+TDF+TTL+TA and Tar. S&C = the same components with SC, compared per clase.
  it('compares each plena component with its S&C component for estrato 1 (default clase)', () => {
    const r = resumirFacturacion(filasDiseno(), DISENO);

    expect(r.claseComponentes).toBe('ESTRATO 1');
    expect(r.subtituloComponentes).toBe('ESTRATO 1 · por componente');
    expect(r.componentes.map((c) => [c.componente, c.plena, c.syc, c.tono])).toEqual([
      ['TC', 12, 3.6, 'subsidio'],
      ['TBL', 148, 44.4, 'subsidio'],
      ['TLU', 45, 13.5, 'subsidio'],
      ['TRT', 579, 173.7, 'subsidio'],
      ['TDF', 195, 58.5, 'subsidio'],
      ['TTL', 19, 5.7, 'subsidio'],
      ['TA', 2, 2, 'neutro']
    ]);
    expect(r.componentes.map((c) => [c.textoPlena, c.textoSyC])[3]).toEqual(['579,00', '173,70']);
    expect(r.totalesComponentes.plena).toBeCloseTo(1000, 6);
    expect(r.totalesComponentes.syc).toBeCloseTo(301.4, 6);
    expect([r.totalesComponentes.textoPlena, r.totalesComponentes.textoSyC]).toEqual(['1.000,00', '301,40']);
  });

  it('compares each plena component with its S&C component for estrato 6 (contribución)', () => {
    const r = resumirFacturacion(filasDiseno(), { ...DISENO, claseComponentes: 'ESTRATO 6' });

    expect(r.claseComponentes).toBe('ESTRATO 6');
    expect(r.subtituloComponentes).toBe('ESTRATO 6 · por componente');
    expect(r.componentes.map((c) => [c.componente, c.plena, c.syc, c.tono])).toEqual([
      ['TC', 12, 41.4, 'contribucion'],
      ['TBL', 148, 510.6, 'contribucion'],
      ['TLU', 45, 155.25, 'contribucion'],
      ['TRT', 579, 1997.55, 'contribucion'],
      ['TDF', 195, 672.75, 'contribucion'],
      ['TTL', 19, 65.55, 'contribucion'],
      ['TA', 2, 6.9, 'contribucion']
    ]);
    const sumaSyC = Object.entries(COMPONENTES_E6).filter(([k]) => k.endsWith('SC')).reduce((s, [, v]) => s + v, 0);
    expect(r.totalesComponentes.plena).toBeCloseTo(1000, 6);
    expect(r.totalesComponentes.syc).toBeCloseTo(sumaSyC, 6);
    expect([r.totalesComponentes.textoPlena, r.totalesComponentes.textoSyC]).toEqual(['1.000,00', '3.450,00']);
  });

  it('offers the clases of the selection as clase de uso options and falls back to estrato 1 for an invalid choice', () => {
    const r = resumirFacturacion(filasDiseno(), { ...DISENO, claseComponentes: 'ESTRATO 4' });
    expect(r.opcionesClaseComponentes).toEqual(['ESTRATO 1', 'ESTRATO 2', 'ESTRATO 4', 'ESTRATO 6', 'COMERCIAL', 'OFICIAL']);
    expect(r.claseComponentes).toBe('ESTRATO 4');
    expect(r.componentes.every((c) => c.tono === 'neutro')).toBe(true);

    // A clase absent from the current tipo de factura + tipo de tarifa falls back to the default.
    const fuera = resumirFacturacion(filasDiseno(), { tipoFactura: 'Acueducto', tipoTarifa: 'Sin Aforo', claseComponentes: 'COMERCIAL' });
    expect(fuera.opcionesClaseComponentes).toEqual(['ESTRATO 1', 'ESTRATO 4', 'ESTRATO 6']);
    expect(fuera.claseComponentes).toBe('ESTRATO 1');

    // Without estrato 1 the first clase is the default.
    const sinE1 = resumirFacturacion(filasDiseno().filter((f) => f['CLAS_NOMBRE'] !== 'ESTRATO 1'), DISENO);
    expect(sinE1.claseComponentes).toBe('ESTRATO 2');
  });

  it('lists what estratos 1, 4 and 6 pay per tipo de tarifa, in the design order, for the selected tipo de factura', () => {
    const r = resumirFacturacion(filasDiseno(), DISENO);

    expect(r.subtituloTarifas).toBe('Estratos 1, 4 y 6 · Acueducto');
    expect(r.porTipoTarifa).toEqual([
      { tipoTarifa: 'Aforo Ordinario', estrato1: 71578.28, estrato4: 238594.26, estrato6: 823150.19 },
      { tipoTarifa: 'Aforo Permanente', estrato1: 71578.28, estrato4: 238594.26, estrato6: 823150.19 },
      { tipoTarifa: 'Sin Aforo', estrato1: 18697.87, estrato4: 65482.23, estrato6: 251834.4 },
      { tipoTarifa: 'No Rec. PaP', estrato1: 18416.55, estrato4: 64314.12, estrato6: 245910.3 },
      { tipoTarifa: 'Desocupado', estrato1: 14964.14, estrato4: 49880.46, estrato6: 172088.2 }
    ]);
  });

  it('labels the money axis like the design (mil / millón)', () => {
    expect([0, 250000, 500000, 750000, 1000000, 2500000].map(formatoEje)).toEqual([
      '0', '250 mil', '500 mil', '750 mil', '1 millón', '2,5 millones'
    ]);
  });
});

describe('resumirFacturacion — selectors (S3)', () => {
  it('offers the distinct tipo de factura / tipo de tarifa values of the rows', () => {
    const r = resumirFacturacion(filasDiseno(), {});

    expect(r.opcionesTipoFactura).toEqual(['Acueducto', 'Aseo']);
    expect(r.opcionesTipoTarifa).toEqual(['Aforo Ordinario', 'Aforo Permanente', 'Sin Aforo', 'No Rec. PaP', 'Desocupado']);
    // Without a choice (or with a value no longer present) the first option is used.
    expect([r.tipoFactura, r.tipoTarifa]).toEqual(['Acueducto', 'Aforo Ordinario']);
    const fuera = resumirFacturacion(filasDiseno(), { tipoFactura: 'Energía', tipoTarifa: 'Otra' });
    expect([fuera.tipoFactura, fuera.tipoTarifa]).toEqual(['Acueducto', 'Aforo Ordinario']);
  });

  it('feeds cards and charts only with the rows of the selected tipo de factura and tipo de tarifa', () => {
    const sinAforo = resumirFacturacion(filasDiseno(), { tipoFactura: 'Acueducto', tipoTarifa: 'Sin Aforo' });
    expect(sinAforo.tarjetas.map((t) => t.valor)).toEqual(['65.482,23', '18.697,87', '251.834,40', '13,5']);
    expect(sinAforo.clases.map((c) => c.clase)).toEqual(['ESTRATO 1', 'ESTRATO 4', 'ESTRATO 6']);
    expect(sinAforo.subtituloClases).toBe('Sin Aforo · Acueducto');

    const aseo = resumirFacturacion(filasDiseno(), { tipoFactura: 'Aseo', tipoTarifa: 'Aforo Ordinario' });
    expect(aseo.tarjetas[1].valor).toBe('1,00');
    expect(aseo.tarjetas[0].valor).toBe('—');
    expect(aseo.porTipoTarifa).toEqual([{ tipoTarifa: 'Aforo Ordinario', estrato1: 1, estrato4: null, estrato6: null }]);
  });
});

describe('resumirFacturacion — empty and missing data (S7)', () => {
  it('marks the summary empty when there are no rows', () => {
    const r = resumirFacturacion([], {});

    expect(r.vacio).toBe(true);
    expect(r.opcionesTipoFactura).toEqual([]);
    expect(r.tipoFactura).toBeNull();
    expect(r.tarjetas.map((t) => t.valor)).toEqual(['—', '—', '—', '—']);
    expect(r.clases).toEqual([]);
    expect(r.porTipoTarifa).toEqual([]);
    expect(r.opcionesClaseComponentes).toEqual([]);
    expect(r.claseComponentes).toBeNull();
    expect(r.totalesComponentes).toEqual({ plena: null, syc: null, textoPlena: '—', textoSyC: '—' });
  });

  it('shows "—" instead of 0 for a missing estrato', () => {
    const filas = filasDiseno().filter((f) => f['CLAS_NOMBRE'] !== 'ESTRATO 1');

    const r = resumirFacturacion(filas, DISENO);

    expect(r.tarjetas[1]).toEqual({ etiqueta: 'Estrato 1 paga', valor: '—', unidad: '', detalle: '—', tono: 'neutro' });
    expect(r.tarjetas[3].valor).toBe('—');
    expect(r.tarjetas[2].valor).toBe('823.150,19');
    expect(r.porTipoTarifa[0].estrato1).toBeNull();
  });

  it('shows "—" for a missing component and leaves it out of the totals', () => {
    const filas = filasDiseno().map((f) =>
      f['CLAS_NOMBRE'] === 'ESTRATO 1' ? { ...f, TARI_TA: null, TARI_TTLSC: undefined, TARI_TCSC: '' } : f);

    const r = resumirFacturacion(filas, DISENO);

    const ta = r.componentes.find((c) => c.componente === 'TA');
    const ttl = r.componentes.find((c) => c.componente === 'TTL');
    const tc = r.componentes.find((c) => c.componente === 'TC');
    expect([ta?.plena, ta?.textoPlena, ta?.syc, ta?.tono]).toEqual([null, '—', 2, 'neutro']);
    expect([ttl?.plena, ttl?.syc, ttl?.textoSyC, ttl?.tono]).toEqual([19, null, '—', 'neutro']);
    expect([tc?.syc, tc?.textoSyC]).toEqual([null, '—']);
    expect(r.totalesComponentes.plena).toBeCloseTo(998, 6);
    expect(r.totalesComponentes.syc).toBeCloseTo(292.1, 6);

    const todoFalta = resumirFacturacion(
      filasDiseno().map((f) => (f['CLAS_NOMBRE'] === 'ESTRATO 1' ? fila('ESTRATO 1', String(f['PARA_NOMBRE']), 1, 1, { TIPO_FACT: f['TIPO_FACT'] }) : f)),
      DISENO
    );
    expect(todoFalta.componentes.every((c) => c.textoPlena === '—' && c.textoSyC === '—')).toBe(true);
    expect(todoFalta.totalesComponentes).toEqual({ plena: null, syc: null, textoPlena: '—', textoSyC: '—' });
  });
});
