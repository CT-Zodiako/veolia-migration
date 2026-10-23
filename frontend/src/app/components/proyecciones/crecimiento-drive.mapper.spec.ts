import {
  mapearDescuentosDrive,
  mapearPropiaDrive,
  mapearTercerosDrive,
  mapearUsuariosDrive
} from './crecimiento-drive.mapper';

// P2: the Drive rows are keyed by the sheet headers; legacy registrar* (proyecciones/controller.js:345,
// 435-482,565-578,640-685) read them by those exact keys. The request DTOs bind camelCase names.
describe('crecimiento Drive mapping', () => {
  it('maps USUARIOS headers to the request items (MES is the SEMESTRE, COD_APS from the sheet)', () => {
    const items = mapearUsuariosDrive([
      {
        COD_APS: 77, ANNO: 2025, MES: 2, CODUSO: 1, NOMCLASEUSO: 'Estrato 1', CODFACTOR: 3, VALORFACTOR: '0.5',
        CODTIPOPRED: 4, NOMTIPOPRED: 'Urbano', CANTIDAD: 10, TONELADAS: 1.25, EXTRA: 'ignored'
      }
    ]);

    expect(items).toEqual([{
      codAps: 77, anno: 2025, semestre: 2, coduso: 1, nomclaseuso: 'Estrato 1', codfactor: 3, valorfactor: 0.5,
      codtipopred: 4, nomtipopred: 'Urbano', cantidad: 10, toneladas: 1.25
    }]);
  });

  it('maps INFORMACION_PROPIA V_* headers, including the legacy mixed-case V_CBLj / V_QRTz', () => {
    const [item] = mapearPropiaDrive([
      {
        COD_APS: 77, NOM_APS: 'Tunja', COD_EMPRESA: 9, NOM_EMPRESA: 'Veolia', ANNO: 2025, MES: 1,
        V_DISPTERC: 'SI', IAT: 'NO', V_N: 100, V_NA: 1, V_ND: 2, V_TAFNA: 3, V_QRT: 4, V_QLU: 5, V_QNA: 6, V_QBL: 7,
        V_QR: 8, V_QRS: 9, V_CBLj: 10, V_LBL: 11, V_VALOR_MTS3: 12, V_M2CC: 13, V_M2LAV: 14, V_TI: 15, V_TM: 16,
        V_KLP: 17, V_VL: 18, V_ESCENARIO: 19, V_CTLMX: 20, V_T: 21, V_CPE: 22, V_VA_CRT: 23, V_VA_CRT_ABC: 24,
        V_VA_CDF: 25, V_VA_CDF_ABC: 26, V_NAA: 27, V_QA: 28, V_TAFA: 29, V_CP: 30, V_CRT_PROPIO: 31,
        V_CDF_FACTURADO: 32, V_QRTz: 33, V_CDF_TERCERO: 34, V_CTL_TERCERO: 35, V_IR_TERCERO: 36, V_QRS_MUNRECP: 37
      }
    ]);

    expect(item).toEqual({
      codAps: 77, nomAps: 'Tunja', codEmpresa: 9, nomEmpresa: 'Veolia', anno: 2025, mes: 1,
      vDispterc: 'SI', iat: 'NO', vN: 100, vNa: 1, vNd: 2, vTafna: 3, vQrt: 4, vQlu: 5, vQna: 6, vQbl: 7,
      vQr: 8, vQrs: 9, vCblj: 10, vLbl: 11, vValorMts3: 12, vM2cc: 13, vM2lav: 14, vTi: 15, vTm: 16,
      vKlp: 17, vVl: 18, vEscenario: 19, vCtlmx: 20, vT: 21, vCpe: 22, vVaCrt: 23, vVaCrtAbc: 24,
      vVaCdf: 25, vVaCdfAbc: 26, vNaa: 27, vQa: 28, vTafa: 29, vCp: 30, vCrtPropio: 31,
      vCdfFacturado: 32, vQrtz: 33, vCdfTercero: 34, vCtlTercero: 35, vIrTercero: 36, vQrsMunrecp: 37
    });
  });

  it('maps INFORMACION_TERCERO C_* headers', () => {
    const [item] = mapearTercerosDrive([
      {
        COD_APS: 77, NOM_APS: 'Tunja', COD_EMPRESA: 9, NOM_EMPRESA: 'Otro', ANNO: 2025, MES: 1,
        C_N: 1, C_NA: 2, C_ND: 3, C_TAFNA: 4, C_VALOR_MTS3: 5, C_QRT: 6, C_QLU: 7, C_QNA: 8, C_QBL: 9,
        C_QRechazo: 10, C_QRS: 11, C_CBLj: 12, C_LBL: 13, C_M2CC: 14, C_M2LAV: 15, C_TI: 16, C_TM: 17, C_KLP: 18,
        C_VL: 19, C_ESCENARIO: 20, C_T: 21, C_CPE: 22, C_CTLMX: 23, C_VA_CRT: 24, C_VA_CRT_ABC: 25, C_VA_CDF: 26,
        C_VA_CDF_ABC: 27, C_NAA: 28, C_QA: 29, C_TAFA: 30, C_CRT_COMPETIDOR: 31, C_CDF_COMPETIDOR: 32, C_QRTz: 33,
        C_CTL_SIN_INCENTIVO: 34, C_INCENTIVO: 35, C_CDFSINCENTIVO: 36, C_CPODA: 37
      }
    ]);

    expect(item).toEqual({
      codAps: 77, nomAps: 'Tunja', codEmpresa: 9, nomEmpresa: 'Otro', anno: 2025, mes: 1,
      cN: 1, cNa: 2, cNd: 3, cTafna: 4, cValorMts3: 5, cQrt: 6, cQlu: 7, cQna: 8, cQbl: 9,
      cQrechazo: 10, cQrs: 11, cCblj: 12, cLbl: 13, cM2cc: 14, cM2lav: 15, cTi: 16, cTm: 17, cKlp: 18,
      cVl: 19, cEscenario: 20, cT: 21, cCpe: 22, cCtlmx: 23, cVaCrt: 24, cVaCrtAbc: 25, cVaCdf: 26,
      cVaCdfAbc: 27, cNaa: 28, cQa: 29, cTafa: 30, cCrtCompetidor: 31, cCdfCompetidor: 32, cQrtz: 33,
      cCtlSinIncentivo: 34, cIncentivo: 35, cCdfsincentivo: 36, cCpoda: 37
    });
  });

  it('maps DESCUENTOS_COSTOS headers (CCS -> dccs ...)', () => {
    expect(mapearDescuentosDrive([
      { COD_APS: 77, NOM_APS: 'Tunja', ANNO: 2025, MES: 3, CCS: 0.1, CBL: 0.2, CLUS: 0.3, CRT: 0.4, CDF: 0.5, CTL: 0.6, VBA: 0.7 }
    ])).toEqual([
      { codAps: 77, nomAps: 'Tunja', anno: 2025, mes: 3, dccs: 0.1, dcbl: 0.2, dclus: 0.3, dcrt: 0.4, dcdf: 0.5, dctl: 0.6, dvba: 0.7 }
    ]);
  });

  it('turns blank cells into null, numeric text into numbers and skips fully blank rows', () => {
    expect(mapearDescuentosDrive([
      { COD_APS: '77', NOM_APS: 123, ANNO: '2025', MES: ' 3 ', CCS: '', CBL: null },
      { COD_APS: '', NOM_APS: '', ANNO: null, MES: undefined }
    ])).toEqual([
      { codAps: 77, nomAps: '123', anno: 2025, mes: 3, dccs: null, dcbl: null, dclus: null, dcrt: null, dcdf: null, dctl: null, dvba: null }
    ]);
  });

  it('matches headers case-insensitively when the sheet does not use the legacy spelling', () => {
    const [item] = mapearPropiaDrive([{ cod_aps: 5, anno: 2025, mes: 1, V_CBLJ: 4, v_qrtz: 6 }]);

    expect(item['codAps']).toBe(5);
    expect(item['vCblj']).toBe(4);
    expect(item['vQrtz']).toBe(6);
  });

  it('rejects non-numeric text in a numeric column instead of silently storing NULL', () => {
    expect(() => mapearUsuariosDrive([{ COD_APS: 77, ANNO: 2025, MES: 1, CANTIDAD: 'diez' }]))
      .toThrow('Fila 2, columna CANTIDAD: "diez" no es un número.');
  });
});
