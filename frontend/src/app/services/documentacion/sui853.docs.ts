import { ArticuloDocumentacion } from './documentacion.model';

/** Documentación: SUI 853. */
export const DOCS_SUI853: ArticuloDocumentacion[] = [
  // Panorama
  {
    categoria: 'SUI 853',
    titulo: 'Cómo funciona el reporte SUI 853',
    contenido:
      'Recorrido completo del reporte SUI: qué se carga desde Google Drive, dónde se revisa y qué pantallas muestran cada formato, tanto en el sistema SUI 853 como en el módulo SUI de VEO-Regulator.',
    sistema: 'SUI 853',
    secciones: [
      {
        titulo: 'Dos lugares donde se trabaja el SUI',
        parrafos: [
          'El sistema SUI 853 reúne la información de residuos y de facturación de cada APS, la consulta y la presenta en los formatos de reporte (CFT, CSS Aprovechamiento, CRLUS, CBLS, CBLUS, CBICS, CRTs, CRT, CVNA, CVA, CDFT, FAC y Comercial).',
          'En VEO-Regulator, el menú SUI genera los formatos 19, 23, 24, 35 y 36 a partir del cálculo de tarifas del período: ahí se carga la información complementaria, se procesa el SUI y se sigue el avance de cada APS.',
          'Para pasar de un sistema al otro usá el selector de sistema; cada sistema muestra solo las opciones de menú que tenés asignadas.'
        ]
      },
      {
        titulo: '1. Revisar la configuración (SUI 853)',
        parrafos: [
          'APS Empresa muestra qué empresa, código SUI, departamento y municipio tiene cada APS. APS Documentos muestra qué formatos aplican a cada APS y segmento. Ambas pantallas son de consulta.',
          'Formularios guarda la configuración global de las columnas de los formatos (encabezado, color, descripción, decimales, orden).'
        ]
      },
      {
        titulo: '2. Cargar la información desde Google Drive (SUI 853)',
        parrafos: [
          'Cargue Residuos trae las planillas de residuos de una APS y un año. Cargue Facturación trae las planillas de facturación de una APS y un año, y Cargue Facturación Mes hace lo mismo para un solo mes.',
          'Cada cargue reemplaza completos los meses que encuentra en los archivos; si algo falla, no se guarda nada. Para otras tablas existe la Carga genérica, que copia una hoja de cálculo elegida por vos a una tabla destino.'
        ]
      },
      {
        titulo: '3. Revisar lo cargado y los formatos (SUI 853)',
        parrafos: [
          'Residuos Generados muestra lo cargado por Cargue Residuos y Comercial muestra lo cargado por Cargue Facturación, ambos por APS, año y mes, con exportación CSV configurable.',
          'Las pantallas de formatos (CFT, CSS Aprovechamiento, CRLUS, CBLS, CBLUS, CBLUS Mínimo, CBLUS Máximo, CBICS Mínimo y Máximo, CRTs Mínimo, CRTs Máximo, CRT, CVNA, CVA y FAC) se abren con la información ya cargada; CDFT se consulta por año.'
        ]
      },
      {
        titulo: '4. Generar los formatos 19 a 36 (VEO-Regulator)',
        parrafos: [
          'Primero, si corresponde, subí la información complementaria del período en Cargue Complementario. Después, en Formatos y Formularios, elegí APS, año y mes y tocá Procesar.',
          'El avance de todas tus APS se sigue en SUI Dashboard; el histórico por APS está en Resumen Formatos y Formularios, y lo reversado en SUI Reversiones.'
        ]
      }
    ],
    notas: [
      'En las pantallas SUI de VEO-Regulator el año y mes que elegís corresponden al mes en curso: la información que se consulta, carga o procesa es la del mes anterior (período cerrado).',
      'Los cargues desde Google Drive solo funcionan si entraste al sistema SUI 853.'
    ]
  },

  // VEO-Regulator · SUI
  {
    categoria: 'SUI 853',
    titulo: 'Seguir el avance de los formatos SUI por APS',
    contenido:
      'El SUI Dashboard muestra, para tus APS, qué formatos (F19, F23, F24, F35 y F36) ya están procesados, cuáles están pendientes y cuáles no aplican en el período.',
    sistema: 'VEO-Regulator',
    ruta: '/sui/dashboard',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te da una foto rápida del estado del reporte SUI del período: cuántas APS están al día y cuáles todavía tienen formatos pendientes.',
          'Solo aparecen las APS que tenés asignadas como usuario.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'APS al día: cuántas APS no tienen ningún formato pendiente, sobre el total, con su porcentaje.',
          'Con pendientes: cuántas APS tienen al menos un formato pendiente, con los nombres de las primeras.',
          'Formatos procesados: cuántos formatos están procesados sobre los que aplican (los que dicen NO APLICA no cuentan).',
          'Avance por formato: una barra por formato con las APS que lo tienen procesado sobre las que les aplica.',
          'Estado de formatos por APS: tabla con Id, APS, una columna por formato (F19, F23, F24, F35, F36) y el Usuario. Cada celda muestra el estado como etiqueta de color y las filas con algún pendiente quedan resaltadas.'
        ]
      }
    ],
    pasos: [
      'Elegí el año y el mes. La consulta se hace sola cuando los dos están completos.',
      'Revisá las tarjetas de resumen y las barras de avance por formato.',
      'Usá los botones Todos, Al día y Con pendientes para filtrar la tabla; cada botón muestra cuántas APS hay en ese grupo.',
      'Si necesitás la tabla en un archivo, exportala desde las opciones de la tabla.'
    ],
    notas: [
      'Se consulta el mes anterior al que elegís: si elegís enero de 2025, ves el estado de diciembre de 2024.',
      'Las cifras de las tarjetas y barras salen de todas las APS del período, no solo de las que quedan visibles con el filtro.',
      'Un formato que no dice PENDIENTE ni NO APLICA se considera procesado.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Procesar y consultar los formatos y formularios SUI',
    contenido:
      'En Formatos y Formularios consultás los formatos 19, 23, 24, 35 y 36 y el resumen de variables de una APS y período, y ejecutás el proceso que los genera.',
    sistema: 'VEO-Regulator',
    ruta: '/sui/integracion',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es la pantalla donde se genera el reporte SUI de una APS para un período y se revisa el resultado de cada formato antes de reportarlo.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una pestaña por formato: Formato 19 (variables para la tarifa de aprovechamiento y toneladas conjuntas), Formulario 23 (costo de limpieza urbana y de barrido y limpieza), Formato 24 (costo de recolección y transporte), Formato 35 (costo de disposición final, solo relleno) y Formato 36 (costo de tratamiento de lixiviados).',
          'La pestaña Resumen Variables muestra el semestre y un conjunto de tablas con las variables de costos del período.',
          'El botón Descargar explicación de formatos baja una planilla Excel que explica cada formato y sus columnas.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS, el año y el mes. La consulta de todos los formatos se hace sola cuando los tres están completos.',
      'Revisá cada pestaña; cada tabla se puede filtrar y exportar.',
      'Para generar o regenerar el SUI del período, tocá Procesar y confirmá en el cuadro "Procesar SUI".',
      'Antes de procesar, el sistema valida que el período pueda generarse. Si la validación no pasa, se muestran los mensajes y no se procesa nada.',
      'Al terminar, aparece el estado de cada formato y la lista de formatos procesados, y la pantalla vuelve a consultar los datos.'
    ],
    notas: [
      'Se trabaja sobre el mes anterior al que elegís (período cerrado).',
      'El proceso queda registrado con tu usuario.',
      'Si algún formato no se puede consultar, el error indica cuál (F19, F23, F24, F35, F36 o Resumen Variables) y el resto se sigue mostrando.',
      'La pestaña que estabas viendo se recuerda la próxima vez que entrás.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el histórico de formatos SUI de una APS',
    contenido:
      'Resumen Formatos y Formularios muestra todos los registros guardados de los formatos 19, 23, 24, 35 y 36 de una APS, período por período.',
    sistema: 'VEO-Regulator',
    ruta: '/sui/resumen-formatos',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite comparar los valores reportados de una APS a lo largo del tiempo, sin tener que consultar mes por mes.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una pestaña por formato (Formato 19, Formulario 23, Formulario 24, Formulario 35 y Formulario 36) con las columnas AÑO y MES seguidas de las variables del formato.',
          'Cada columna tiene un filtro "Contiene" y la tabla se puede exportar.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS. Los cinco formatos se cargan solos.',
      'Cambiá de pestaña para ver cada formato y filtrá por AÑO o MES para encontrar un período.',
      'Si necesitás la explicación de las columnas, tocá Descargar explicación de formatos.'
    ],
    notas: [
      'Esta pantalla solo pide la APS: muestra todos los períodos guardados.',
      'Si ya tenías una APS elegida en otra pantalla, se usa esa al entrar.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Cargar la información complementaria del SUI',
    contenido:
      'Cargue Complementario sube un archivo CSV con las variables complementarias de los formatos 24, 35 y 36 de una APS para el período, antes de procesar el SUI.',
    sistema: 'VEO-Regulator',
    ruta: '/sui/cargue-complementario',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Algunas variables de los formatos 24, 35 y 36 no salen del cálculo de tarifas y hay que informarlas aparte. Esta pantalla las carga para que el proceso del SUI las use.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Después de elegir APS, año y mes, el sistema revisa si ya hay archivos SUI generados para ese período. Si los hay, muestra un aviso y no deja cargar.',
          'Si no los hay, aparece el cargue guiado en tres pasos: Plantilla del archivo, Seleccionar archivo y Revisar y cargar. En el paso 3 ves cuántas filas tiene el archivo y en qué período se va a guardar.',
          'Cuando el archivo pasa la validación, se muestra una vista previa con todas sus columnas.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS, el año y el mes.',
      'Si es la primera vez, tocá Descargar plantilla para bajar el CSV de ejemplo (21 columnas).',
      'Completá el archivo con la APS, el año y el mes que elegiste en pantalla en cada fila, y los valores de las variables.',
      'Seleccioná el archivo o arrastralo a la zona de carga. Se valida al instante.',
      'Revisá la vista previa y el período en "Se guarda en".',
      'Tocá Guardar Información y confirmá.'
    ],
    notas: [
      'Solo se aceptan archivos .csv.',
      'Cada fila debe tener la misma APS, año y mes que elegiste en pantalla; si no coinciden, el archivo se rechaza indicando la fila.',
      'Las variables pueden quedar vacías (por ejemplo, las de los formatos 35 y 36 si la APS no tiene relleno propio), pero si tienen valor debe ser numérico.',
      'La información se guarda en el mes anterior al elegido y reemplaza la que ya hubiera para esa APS y período.',
      'Si ya existen archivos SUI generados para la APS y el período, no se puede cargar complemento.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar las reversiones de formatos SUI',
    contenido:
      'SUI Reversiones muestra, para una APS, los registros de los formatos 19, 23, 24, 35 y 36 que quedaron guardados como reversiones, cada uno con su identificador de reversión.',
    sistema: 'VEO-Regulator',
    ruta: '/sui-reversiones',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite revisar qué valores tenían los formatos SUI de una APS antes de una reversión. Es una pantalla de consulta: no revierte nada.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una pestaña por formato (REV Formato 19, REV Formulario 23, REV Formulario 24, REV Formulario 35 y REV Formulario 36) con la columna REVE ID, el AÑO, el MES y las variables del formato.',
          'Cada columna tiene un filtro "Contiene" y la tabla se puede exportar.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS. Las cinco pestañas se cargan solas.',
      'Filtrá por REVE ID, AÑO o MES para ubicar una reversión.',
      'Si necesitás la explicación de las columnas, tocá Descargar explicación de formatos.'
    ],
    notas: ['Para ejecutar o autorizar reversiones usá las pantallas del menú Reversiones.']
  },

  // SUI 853 · Configuración
  {
    categoria: 'SUI 853',
    titulo: 'Configurar las columnas de los formularios SUI 853',
    contenido:
      'Formularios lista la configuración de cada columna de los formatos SUI 853 (encabezado, color, filtro, tipo de dato, decimales, alineación, descripción y orden) y te deja editarla.',
    sistema: 'SUI 853',
    ruta: '/formularios',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es la configuración global de cómo se presentan las columnas de los formatos. Cada columna se identifica por FORMATO, SECCION y FIELD, y esa identidad no se puede cambiar.'
        ]
      },
      {
        titulo: 'Qué se puede editar',
        parrafos: [
          'HEADER_TXT: el texto del encabezado (obligatorio).',
          'BACKGROUND_COLOR: Rojo, Verde o Azul. FILTER_FLAG, MOSTRAR_HEADER e INCLUIR_DATA: Sí o No.',
          'FORMATO_DATO: Texto, Número, Fecha o Porcentaje. DECIMALES: de 0 a 6, solo para Número o Porcentaje; para los demás tipos queda en "No aplica".',
          'ALINEACION: Izquierda, Centro o Derecha. TOOLTIP: la descripción de la columna.',
          'ORDEN_HEADER y ORDEN_DATA: números enteros, cero o mayores.'
        ]
      }
    ],
    pasos: [
      'Buscá la columna con los filtros de la tabla (por formato, sección o campo).',
      'Tocá el lápiz de la fila, o hacé clic directamente sobre la descripción.',
      'Modificá los valores en la misma fila.',
      'Tocá el tilde o Guardar cambios. También podés guardar con Enter (Ctrl+Enter si estás en la descripción) y cancelar con Escape.',
      'Si querés traer los datos de nuevo, tocá Recargar.'
    ],
    notas: [
      'Se edita una fila a la vez; mientras editás, Recargar y los otros lápices quedan deshabilitados.',
      'El botón de guardar se habilita solo cuando todos los campos son válidos.',
      'Los cambios son globales: afectan a todos los usuarios.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Cargar una hoja de Google Drive en una tabla SUI',
    contenido:
      'La Carga genérica copia las filas de una hoja de Google Sheets en una tabla SUI que elijas, usando solo las columnas que coinciden y que marques.',
    sistema: 'SUI 853',
    ruta: '/cargaGenerica',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Sirve para cargar información que no tiene un cargue propio: elegís el documento, la hoja y la tabla destino, y el sistema inserta las filas.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba, los datos de origen y destino: el identificador del documento de Google Drive, la hoja, la tabla destino y la opción Truncar tabla antes de cargar.',
          'Abajo, al consultar columnas, la lista de columnas de la hoja con su estado: Coincide ✔ si la tabla destino tiene esa columna, o No existe ⚠ si no la tiene. Al pie se ve cuántas columnas están seleccionadas.'
        ]
      }
    ],
    pasos: [
      'Pegá en Sheet ID solo el identificador del documento, no la URL completa.',
      'Tocá Buscar para traer las hojas del documento y elegí una (si hay una sola, se elige sola).',
      'Elegí la tabla destino. Si la lista está vacía, tocá Actualizar tablas.',
      'Tocá Consultar columnas. Quedan marcadas todas las que coinciden; desmarcá las que no quieras cargar.',
      'Si necesitás vaciar la tabla antes, activá Truncar tabla antes de cargar.',
      'Tocá Cargar datos e insertar. Al terminar se informa cuántas filas se insertaron.'
    ],
    notas: [
      'Solo se cargan las columnas marcadas que existen en la tabla destino; las marcadas como No existe ⚠ se ignoran.',
      'Truncar elimina TODOS los registros de la tabla destino antes de cargar y no se puede deshacer. El sistema te pide confirmación.',
      'Si cambiás el documento, la hoja o la tabla, tenés que volver a consultar las columnas.',
      'Si algo falla, verificá tu sesión, tus permisos y el acceso al documento. Si falló al cargar, revisá la tabla antes de reintentar para no duplicar datos.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar la empresa y ubicación de cada APS',
    contenido:
      'APS Empresa lista cada APS con su NUAP, empresa, código SUI, departamento y municipio.',
    sistema: 'SUI 853',
    ruta: '/apsEmpresa',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite verificar a qué empresa y ubicación está asociada cada APS. Esa empresa es la que se usa, por ejemplo, al cargar la facturación desde Google Drive.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Columnas: COD APS, NOMAPS, NUAP, EMPRESA, CODSUI, DEPARTAMENTO y MUNICIPIO.',
          'Se puede filtrar por NOMAPS, EMPRESA, DEPARTAMENTO y MUNICIPIO, ordenar por cualquier columna y exportar a CSV.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: la lista se carga sola.',
      'Escribí en los filtros "Contiene" para encontrar una APS, empresa o municipio.',
      'Tocá el botón de exportar para bajar lo que estás viendo en CSV.'
    ],
    notas: ['Es una pantalla de consulta: no permite modificar datos.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar los formatos que aplican a cada APS',
    contenido:
      'APS Documentos lista, para cada APS y segmento, los formatos SUI que le corresponden, con su código y nombre.',
    sistema: 'SUI 853',
    ruta: '/apsDocumentos',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: ['Te permite ver qué formatos tiene que reportar cada APS según su segmento.']
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Columnas: NOMAPS, SEGMENTO, CODFORMATO y NOMFORMATO.',
          'Se puede filtrar por NOMAPS, SEGMENTO y NOMFORMATO, ordenar por cualquier columna y exportar a CSV.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: la lista se carga sola.',
      'Filtrá por APS o por segmento para ver sus formatos.',
      'Tocá el botón de exportar para bajar lo que estás viendo en CSV.'
    ],
    notas: ['Es una pantalla de consulta: no permite modificar datos.']
  },

  // SUI 853 · Cargues desde Google Drive y consultas
  {
    categoria: 'SUI 853',
    titulo: 'Cargar residuos desde Google Drive',
    contenido:
      'Cargue Residuos lee de Google Drive las planillas de residuos de una APS y un año y las guarda en el sistema, reemplazando los meses que encuentra.',
    sistema: 'SUI 853',
    ruta: '/cargueResiduos',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Trae al sistema los registros de entrada de vehículos y toneladas que se llevan en las planillas compartidas de Google Drive, para consultarlos después en Residuos Generados.'
        ]
      },
      {
        titulo: 'Cómo elige los archivos',
        parrafos: [
          'Busca en la carpeta de residuos (y en sus subcarpetas) las planillas cuyo nombre contiene el nombre de la APS y el año, sin importar mayúsculas.',
          'De cada planilla lee la pestaña «Hoja SUI Recolección». Si un archivo no tiene esa pestaña, se informa como advertencia y no aporta filas.',
          'El mes de cada fila sale de la fecha de entrada del vehículo; las filas sin fecha quedan con mes 0.'
        ]
      },
      {
        titulo: 'Qué muestra al terminar',
        parrafos: [
          'Archivos procesados, Registros cargados y Registros reemplazados, y la lista de archivos leídos con su carpeta, la cantidad de filas y las advertencias.'
        ]
      }
    ],
    pasos: [
      'Elegí el nombre de la APS.',
      'Elegí el año.',
      'Tocá Cargar datos y esperá el mensaje "Cargando información del Drive…".',
      'Revisá el resumen y la lista de archivos.',
      'Si aparece la ventana "Error al guardar residuos", revisá el archivo, la pestaña, la fila y el campo que indica, corregí la planilla y volvé a cargar.'
    ],
    notas: [
      'Solo funciona si entraste al sistema SUI 853.',
      'Los meses encontrados se reemplazan completos; si algo falla, no se guarda nada.',
      'Si no hay ningún archivo que coincida con la APS y el año, el cargue se rechaza y no se borra nada.',
      'Una celda numérica vacía se guarda como 0. Un valor no numérico (por ejemplo 12,5 con coma) detiene el cargue e indica dónde está.',
      'Las fechas se aceptan como DD-MM-AAAA o DD/MM/AAAA.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Cargar la facturación del año desde Google Drive',
    contenido:
      'Cargue Facturación lee de Google Drive las planillas de facturación de una APS y un año y las guarda con la empresa de la APS, reemplazando los meses que encuentra.',
    sistema: 'SUI 853',
    ruta: '/informesGenerados',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Trae al sistema la facturación del servicio de aseo que se lleva en las planillas compartidas de Google Drive, para consultarla después en SUI 853 - Comercial.'
        ]
      },
      {
        titulo: 'Cómo elige los archivos',
        parrafos: [
          'Busca en la carpeta de facturación (y en sus subcarpetas) las planillas cuyo nombre contiene el nombre de la APS y el año, sin importar mayúsculas.',
          'De cada planilla lee la pestaña «sui-facturacion». El año y el mes de cada archivo salen de su nombre (por ejemplo, "Salamina-SUI Diciembre 2024"); si el nombre no trae el mes, se guarda con mes 0.',
          'La empresa se toma de la configuración de la APS (la que ves en APS Empresa).'
        ]
      },
      {
        titulo: 'Qué muestra al terminar',
        parrafos: [
          'Archivos procesados, Registros cargados y Registros reemplazados, y la lista de archivos leídos con la cantidad de filas y las advertencias.'
        ]
      }
    ],
    pasos: [
      'Elegí el nombre de la APS.',
      'Elegí el año.',
      'Tocá Cargar datos.',
      'Revisá el resumen y la lista de archivos.',
      'Si aparece la ventana "Error al guardar facturación", revisá el archivo, la pestaña, la fila y el campo que indica, corregí la planilla y volvé a cargar.'
    ],
    notas: [
      'Solo funciona si entraste al sistema SUI 853.',
      'La APS tiene que tener exactamente una empresa configurada; si no, el cargue se rechaza antes de leer Drive.',
      'Los meses encontrados se reemplazan completos; si algo falla, no se guarda nada.',
      'Si no hay ningún archivo que coincida, el cargue se rechaza y no se borra nada.',
      'Para cargar un solo mes usá Cargue Facturación Mes.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Cargar la facturación de un mes desde Google Drive',
    contenido:
      'Cargue Facturación Mes funciona igual que Cargue Facturación, pero solo carga los archivos del mes que elijas y reemplaza únicamente ese mes.',
    sistema: 'SUI 853',
    ruta: '/informesGeneradosMes',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Sirve para volver a cargar o corregir la facturación de un solo mes sin tocar el resto del año.'
        ]
      },
      {
        titulo: 'Cómo elige los archivos',
        parrafos: [
          'Además de la APS y el año, el nombre del archivo tiene que contener el mes elegido (por ejemplo, "Salamina-SUI Mayo 2024"). Se acepta también "Setiembre" y nombres con tilde.',
          'Lee la pestaña «sui-facturacion» y guarda las filas con la empresa de la APS.'
        ]
      }
    ],
    pasos: [
      'Elegí el nombre de la APS, el año y el mes.',
      'Tocá Cargar datos.',
      'Revisá el resumen (archivos procesados, registros cargados y reemplazados) y la lista de archivos.',
      'Si aparece la ventana "Error al guardar facturación", corregí la planilla en el lugar indicado y volvé a cargar.'
    ],
    notas: [
      'Solo funciona si entraste al sistema SUI 853.',
      'Solo se reemplaza el mes elegido; si algo falla, no se guarda nada.',
      'Si ningún archivo coincide con APS, año y mes, el cargue se rechaza y no se borra nada.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar los residuos generados',
    contenido:
      'Residuos Generados muestra los registros de residuos cargados desde Google Drive para una APS, año y mes, junto con el resumen del formato, y permite exportarlos en CSV.',
    sistema: 'SUI 853',
    ruta: '/residuosGenerados',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite revisar lo que trajo Cargue Residuos antes de reportarlo y armar el archivo CSV con las columnas que necesites.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Detalle: una fila por entrada de vehículo con NUAP, tipo y número del sitio de destino, placa, fecha y hora de entrada, microrruta, toneladas (limpieza urbana, barrido y limpieza, no aprovechables, rechazo del aprovechamiento y aprovechadas), sistema de medición, peajes, hora de salida y datos de registro.',
          'Resumen: las tablas del formato de resumen de residuos, filtradas a la APS, año y mes elegidos. Al final podés desplegar los datos originales del reporte.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS (podés buscarla por nombre), el año y el mes. La consulta se hace sola cuando están los tres.',
      'Usá los filtros "Contiene" de APS, NOMAPS, ANNO, MES, NUAP y PLACA para acotar el detalle.',
      'Para armar el CSV, tocá Exportar (custom): elegí separador (coma o punto y coma), nombre del archivo y columnas, y tocá Exportar.'
    ],
    notas: [
      'En Exportar (custom) algunas columnas de control (APS, NOMAPS, ANNO, MES, hora de salida, fecha y usuario de registro) arrancan desmarcadas.',
      'El CSV se exporta con los mismos valores formateados que ves en pantalla.',
      'Si una consulta falla, usá Reintentar consulta.'
    ]
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar la facturación del servicio de aseo',
    contenido:
      'SUI 853 - Comercial muestra el detalle de facturación cargado desde Google Drive para una APS, año y mes, y el resumen del formato, con exportación CSV configurable.',
    sistema: 'SUI 853',
    ruta: '/facturacionServicioAseo',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite revisar la facturación que trajeron Cargue Facturación o Cargue Facturación Mes y armar el archivo CSV del reporte.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Pestaña Detalle: APS, NOMAPS, ANNO y MES, seguidas de las columnas numeradas del formato (NUID, CUENTA, departamento, municipio, dirección, NUAP, factura, toneladas, tarifas, subsidios, descuentos, valor total y pagos, entre otras).',
          'Pestaña Resumen: la tabla del formato de resumen comercial filtrada a la APS, año y mes elegidos, con su título y los metadatos del formato.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS, el año y el mes. La consulta se hace sola cuando están los tres.',
      'En Detalle, filtrá por APS, NOMAPS, ANNO, MES, NUID o CUENTA.',
      'Para armar el CSV, tocá Exportar (custom), elegí separador, nombre del archivo y columnas, y tocá Exportar.',
      'Pasá a la pestaña Resumen para ver el resumen del formato.'
    ],
    notas: [
      'En el CSV, municipio y centro poblado se completan con ceros a la izquierda hasta 3 dígitos, y los números se exportan con sus decimales.',
      'Si no hay registros, revisá que la facturación de ese mes se haya cargado desde Google Drive.'
    ]
  },

  // SUI 853 · Formatos
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CFT',
    contenido:
      'SUI 853 - CFT muestra el formato CFT en tres segmentos (SEG 1, SEG 2 y SEG 3), cada uno en su pestaña.',
    sistema: 'SUI 853',
    ruta: '/cft',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Cada pestaña muestra la tabla del segmento con el título del formato.',
          'El botón Ver de cada fila abre el detalle con todos sus campos; hacé clic en un valor para copiarlo.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: los tres segmentos se cargan solos.',
      'Cambiá de pestaña para ver cada segmento.',
      'Pasá el mouse por una celda para ver la descripción de la columna.',
      'Usá los filtros y la exportación de la tabla si necesitás el archivo.'
    ],
    notas: ['La pantalla no pide APS ni período: muestra la información tal como está generada. Si un segmento dice "Sin datos", no hay información para mostrar.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar la estimación CSS de aprovechamiento',
    contenido:
      'SUI 853 - CSS Aprovechamiento muestra la estimación CSS de aprovechamiento en tres segmentos (SEG 1, SEG 2 y SEG 3).',
    sistema: 'SUI 853',
    ruta: '/cssaprovechamiento',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una pestaña por segmento con la tabla del formato. El botón Ver de cada fila abre el detalle completo y permite copiar valores.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: los tres segmentos se cargan solos.',
      'Cambiá de pestaña para ver cada segmento y usá los filtros o la exportación de la tabla.'
    ],
    notas: ['En la barra superior la pantalla aparece como "SUI 853 - Estimación CSS". No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CRLUS',
    contenido: 'SUI 853 - CRLUS muestra el formato CRLUS en una pestaña (SEG 1).',
    sistema: 'SUI 853',
    ruta: '/crlus',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['La tabla del formato con el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: ['Entrá a la pantalla: la información se carga sola.', 'Usá los filtros o la exportación de la tabla.'],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CBLS',
    contenido: 'SUI 853 - CBLS muestra el formato CBLS en una pestaña (SEG 1).',
    sistema: 'SUI 853',
    ruta: '/cbls',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['La tabla del formato con el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: ['Entrá a la pantalla: la información se carga sola.', 'Usá los filtros o la exportación de la tabla.'],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CBLUS',
    contenido: 'SUI 853 - CBLUS muestra el formato CBLUS en una pestaña (SEG 2).',
    sistema: 'SUI 853',
    ruta: '/cblus',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['La tabla del formato con el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: ['Entrá a la pantalla: la información se carga sola.', 'Usá los filtros o la exportación de la tabla.'],
    notas: ['No pide APS ni período. Para los valores mínimo y máximo usá CBLUS Mínimo y CBLUS Máximo.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CBLUS mínimo',
    contenido: 'SUI 853 - CBLUS Mínimo muestra el formato CBLUS mínimo en una pestaña (SEG 2).',
    sistema: 'SUI 853',
    ruta: '/cblusMinimo',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['La tabla del formato con el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: ['Entrá a la pantalla: la información se carga sola.', 'Usá los filtros o la exportación de la tabla.'],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CBLUS máximo',
    contenido: 'SUI 853 - CBLUS Máximo muestra el formato CBLUS máximo en una pestaña (SEG 2).',
    sistema: 'SUI 853',
    ruta: '/cblusMaximo',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['La tabla del formato con el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: ['Entrá a la pantalla: la información se carga sola.', 'Usá los filtros o la exportación de la tabla.'],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CBICS mínimo y máximo',
    contenido: 'SUI 853 - CBICS Mínimo y Máximo muestra el formato CBICS mínimo y máximo en una pestaña (SEG 3).',
    sistema: 'SUI 853',
    ruta: '/cbicsmaxmin',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['La tabla del formato con el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: ['Entrá a la pantalla: la información se carga sola.', 'Usá los filtros o la exportación de la tabla.'],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CRTs mínimo',
    contenido: 'SUI 853 - CRTs Mínimo muestra el formato CRTs mínimo en tres segmentos (SEG 1, SEG 2 y SEG 3).',
    sistema: 'SUI 853',
    ruta: '/crtsMinimo',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['Una pestaña por segmento con la tabla del formato y el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: [
      'Entrá a la pantalla: los tres segmentos se cargan solos.',
      'Cambiá de pestaña para ver cada segmento y usá los filtros o la exportación de la tabla.'
    ],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CRTs máximo',
    contenido: 'SUI 853 - CRTs Máximo muestra el formato CRTs máximo en tres segmentos (SEG 1, SEG 2 y SEG 3).',
    sistema: 'SUI 853',
    ruta: '/crtsMaximo',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['Una pestaña por segmento con la tabla del formato y el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: [
      'Entrá a la pantalla: los tres segmentos se cargan solos.',
      'Cambiá de pestaña para ver cada segmento y usá los filtros o la exportación de la tabla.'
    ],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CRT',
    contenido: 'SUI 853 - CRT muestra el formato CRT en tres segmentos (SEG 1, SEG 2 y SEG 3).',
    sistema: 'SUI 853',
    ruta: '/crt',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['Una pestaña por segmento con la tabla del formato y el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: [
      'Entrá a la pantalla: los tres segmentos se cargan solos.',
      'Cambiá de pestaña para ver cada segmento y usá los filtros o la exportación de la tabla.'
    ],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CVNA',
    contenido: 'SUI 853 - CVNA muestra el formato CVNA en tres segmentos (SEG 1, SEG 2 y SEG 3).',
    sistema: 'SUI 853',
    ruta: '/cvna',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['Una pestaña por segmento con la tabla del formato y el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: [
      'Entrá a la pantalla: los tres segmentos se cargan solos.',
      'Cambiá de pestaña para ver cada segmento y usá los filtros o la exportación de la tabla.'
    ],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato CVA',
    contenido: 'SUI 853 - CVA muestra el formato CVA en tres segmentos (SEG 1, SEG 2 y SEG 3).',
    sistema: 'SUI 853',
    ruta: '/cva',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['Una pestaña por segmento con la tabla del formato y el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: [
      'Entrá a la pantalla: los tres segmentos se cargan solos.',
      'Cambiá de pestaña para ver cada segmento y usá los filtros o la exportación de la tabla.'
    ],
    notas: ['No pide APS ni período.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el CDFT por año',
    contenido:
      'SUI 853 - CDFT lista, para el año fiscal elegido, el valor corriente, el valor en pesos de 2018 y el QRTZ de cada APS.',
    sistema: 'SUI 853',
    ruta: '/cdft',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla con Año Fiscal, Nombre APS, Valor Corriente, Valor 2018 y QRTZ. Los valores se muestran con separador de miles y dos decimales.'
        ]
      }
    ],
    pasos: [
      'Elegí el año (entre 2018 y 2030). La tabla se actualiza sola.',
      'Filtrá por Nombre APS para encontrar una APS.',
      'Hacé clic en un valor numérico para copiarlo: se copia como número plano, sin separador de miles y con punto decimal.'
    ],
    notas: ['Al entrar se usa el año que ya tenías elegido en otras pantallas.']
  },
  {
    categoria: 'SUI 853',
    titulo: 'Consultar el formato FAC',
    contenido: 'SUI 853 - FAC muestra el formato FAC en una pestaña General.',
    sistema: 'SUI 853',
    ruta: '/fac',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: ['La tabla del formato con el botón Ver por fila para abrir el detalle y copiar valores.']
      }
    ],
    pasos: ['Entrá a la pantalla: la información se carga sola.', 'Usá los filtros o la exportación de la tabla.'],
    notas: ['No pide APS ni período. Si la información no se puede cargar, la tabla aparece como "Sin datos".']
  },

  // Preguntas frecuentes
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué las pantallas SUI usan el mes anterior al que elijo?',
    contenido:
      'En SUI Dashboard, Formatos y Formularios y Cargue Complementario el año y mes elegidos representan el mes en curso, y se trabaja sobre el período ya cerrado: el mes anterior. Si elegís enero de 2025, se usa diciembre de 2024.',
    sistema: 'VEO-Regulator'
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué no puedo procesar el SUI de una APS?',
    contenido:
      'Antes de procesar, el sistema valida si el período de la APS puede generarse. Si la validación no pasa, la pantalla Formatos y Formularios muestra los mensajes que devolvió y no procesa nada; revisalos, corregí lo que indican y volvé a intentar.',
    sistema: 'VEO-Regulator',
    ruta: '/sui/integracion'
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué el Cargue Complementario no me deja subir el archivo?',
    contenido:
      'Si ya existen archivos SUI generados para la APS y el período, la pantalla muestra un aviso y oculta el cargue. Si el archivo se rechaza, revisá que cada fila tenga la APS, el año y el mes elegidos en pantalla y que los valores sean numéricos.',
    sistema: 'VEO-Regulator',
    ruta: '/sui/cargue-complementario'
  }
];
