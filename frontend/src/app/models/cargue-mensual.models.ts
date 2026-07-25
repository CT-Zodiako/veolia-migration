export interface EmpresaRef {
  emprempr: number;
  emprnombre: string;
}

export interface CarguePropiaFila {
  [key: string]: unknown;
  aps: number;
  empr: number;
  anno: number;
  mes: number;
  cp: number;
  mt3agua: number;
  m2cc: number;
  m2lav: number;
  ti: number;
  tm: number;
  klp: number;
  t: number;
  qa: number;
  escenario: number;
}

export interface CarguePropiaRequest {
  aps: number;
  empr: EmpresaRef;
  anno: number;
  mes: number;
  resumemes: CarguePropiaFila[];
}

export interface CargueCompetidorFila {
  [key: string]: unknown;
  aps: number;
  empr: number;
  anno: number;
  mes: number;
  cp: number;
  mt3agua: number;
  m2cc: number;
  m2lav: number;
  ti: number;
  tm: number;
  klp: number;
  cblj: number;
}

export interface CargueCompetidorRequest {
  aps: number;
  empr: EmpresaRef;
  anno: number;
  mes: number;
  resumemes: CargueCompetidorFila[];
}

export interface CargueComercialFila {
  [key: string]: unknown;
  codaps: number;
  aps: string;
  anno: number;
  mes: number;
  coduso: number;
  nomuso: string;
  codfactor: number;
  codtipo: number;
  tipo: number;
  tiponom: string;
  cantidad: number;
  toneladas: number;
}

export interface CargueComercialResumen {
  n: number;
  nd: number;
  na: number;
  tafna: number;
}

export interface CargueComercialRequest {
  aps: number;
  anno: number;
  mes: number;
  resume: CargueComercialResumen;
  filecontent: CargueComercialFila[];
}

export interface TercerosRequest {
  aps: number;
  anno: number;
  mes: number;
  cdf: number;
  ctl: number;
  incentivo: number;
}

export interface PrevalidarRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface CertificarRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface CertificarMensualItem {
  variable: string;
  valor: string;
  pgirs: string;
  color: string;
}
