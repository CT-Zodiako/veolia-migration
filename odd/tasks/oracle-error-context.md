# Oracle error context in every module
Every backend module logs Oracle/unhandled errors with context (operation, parameters, user, endpoint, traceId) and returns a readable message plus support detail; duplicated per-controller catch blocks are replaced by one global handler.
Branch: fixes-generales. Pilot (Costos) already implemented in the working tree.

## Specs
- S1 (pilot, done): Costos logs Oracle failures with operation, ORA code, constraint, parameters, user, endpoint and traceId; responds with a readable message, `oraCode`, `traceId` and `detail { operacion, oraCode, constraint, oracleMessage }`; ORA-00001 message: "Oracle rechazó datos duplicados (restricción X). La operación no se completó."; unmapped Oracle errors never put the raw Oracle text in `message`: "Oracle devolvió un error al procesar la solicitud."
- S2 (pilot, done): frontend appends " Código de soporte: <traceId>" to 5xx toasts only; support log/panel stores and shows traceId and detail.
- S3: one global exception handler serves every module: any exception a controller does not turn into a 4xx response is logged once at Error with the exception, traceId, user (token SisuId when present), endpoint (`METHOD /path`), the redacted request body (JSON only, at most 8 KB, values of keys matching pass|clave|contra|token|secret masked) and the repository method that threw; it responds with the existing envelope shape `{ status:"error", data:{}, message, traceId, oraCode, detail }`.
- S4: status mapping in the global handler preserves today's contract: OracleTimeoutException / ORA-03135 -> 502; ConflictException -> 409; NotFoundException -> 404; PreconditionFailedException -> 412; ValidationException -> 400; other -> 500. Non-Oracle 500 message: "Ocurrió un error procesando la solicitud."
- S5: one shared Oracle message table replaces the per-controller switches: ORA-00001 (S1 text), ORA-01400 "Faltan datos obligatorios para completar la operación en Oracle.", ORA-02291 "No existe información relacionada para la operación solicitada.", application errors ORA-20000..20999 show Oracle's own message text without the "ORA-2xxxx: " prefix and without the trailing "ORA-06512" stack lines; any other -> S1 unmapped text.
- S6: every controller drops catch blocks whose only effect is a 500/502 response for OracleException or Exception (the global handler takes over); catches that produce 4xx or a module-specific non-error behavior (e.g. InfoGenerales IsDataSourceNotReady) stay unchanged.
- S7 (user L3, verbatim intent): "dale extiendelo para que no de errore de todos los moudlos" — every module, not just Costos.

## Tasks
- T0 S1-S2 pilot Costos + frontend — inline — commit: pending
- T1 S3-S5 global handler + shared messages; Costos controller migrated to it — worker — commit: pending
- T2 S6 Regulator controllers Aprovechamiento..InfoGerencial (Aps, Empresas, Facturacion, General, Indices, InfoGenerales, InfoGerencial, Aprovechamiento) — worker — commit: pending
- T3 S6 Regulator controllers Informes..Validaciones (Informes, Killometros, Pgirs, Productividad, Proyecciones, Rellenos, Reversiones, SubCont, Sui, SuiReversiones, Suministros, Tafna, Tarifas, Toneladas, Trna, UsuariosGrafico, Validaciones) — worker — commit: pending
- T4 S6 Reliquidaciones, Sui853, Auth controllers — worker — commit: pending
- T5 verify S1-S7 + ego-lite check — inline — pending

## Log
- L1: "como podemos hacer lo de los logs mas enteidbles ya que es para notros como desaroladores y para los de soprote la diea estenr mas contexto de esos errores"
- L2: "arracna y pruebalo en egolite" (pilot in Costos; tested: real Oracle success paths, simulated 500 for the toast/panel)
- L3: "dale extiendelo para que no de errore de todos los moudlos"
- L4: Decision: no new logging dependency (built-in console logging); `detail` travels to every user (token has no support flag), shown only in the support panel.
