// Promedio del semestre anterior: infogerencial/getvariablesaps -> pk_ocigral720.fauco_getvariablesaps.
// Claves exactas de la función; null cuando la función no trae la variable.
export type VariableApsClave =
  | 'c' | 'cdf' | 'crt' | 'lbl' | 'n' | 'na' | 'naa' | 'nd' | 'qa'
  | 'qbl' | 'qlu' | 'qna' | 'qr' | 'qrs' | 'qrsmunrecp' | 'qrt' | 'tafna' | 'vl';

export type VariablesAps = Record<VariableApsClave, number | null>;

export interface VariablesApsResponse {
  aps: number;
  anno: number;
  mes: number;
  variables: VariablesAps;
}
