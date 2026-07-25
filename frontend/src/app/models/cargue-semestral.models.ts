import { EmpresaRef } from './cargue-mensual.models';

export interface CarguePropiaSemFila {
  [key: string]: unknown;
  aps: number;
  empr: number;
  anno: number;
  mes: number;
  qrt: number;
  qlu: number;
  qna: number;
  qbl: number;
  qr: number;
  qrs: number;
  lbl: number;
  vl: number;
  esce: number;
  ctlmx: number;
  cpe: number;
  naa: number;
  tafa: number;
  crtpro: number;
  cdfpro: number;
  qrsmunrecp: number;
}

export interface CarguePropiaSemRequest {
  resumesem: CarguePropiaSemFila[];
}

export interface CargueCompetidorSemFila {
  [key: string]: unknown;
  aps: number;
  empr: number;
  anno: number;
  mes: number;
  n: number;
  na: number;
  nd: number;
  qlu: number;
  qna: number;
  qbl: number;
  qr: number;
  cblj: number;
  lbl: number;
  crtcomp: number;
  cdfcomp: number;
  qrtz: number;
}

export interface CargueCompetidorSemRequest {
  resumesem: CargueCompetidorSemFila[];
}

export interface CargueComercialSemFila {
  [key: string]: unknown;
  codaps: number;
  aps: string;
  anno: number;
  semestre: number;
  coduso: number;
  nomuso: string;
  codfactor: number;
  nomfact: number;
  codtipo: number;
  nomtipo: string;
  susm1: number;
  susm2: number;
  susm3: number;
  susm4: number;
  susm5: number;
  susm6: number;
  afom1: number;
  afom2: number;
  afom3: number;
  afom4: number;
  afom5: number;
  afom6: number;
}

export interface CargueComercialSemRequest {
  filecontent: CargueComercialSemFila[];
}

export interface QRTRuralRequest {
  aps: number;
  anno: number;
  semestre: number;
  qrtRural: number;
}

export interface PrevalidarSemestralRequest {
  aps: number;
  anno: number;
  semestre: number;
}

export interface CertificarSemestralRequest {
  aps: number;
  anno: number;
  semestre: number;
}

export interface BarridoItem {
  variable: string;
  valor: string;
  color: string;
}

export interface SemestralDataset {
  pgris: number[];
  barrido: BarridoItem[];
}

export interface PlCertificarSemestralResponse {
  dataset: SemestralDataset[];
}

export type { EmpresaRef };
