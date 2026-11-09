import { ArticuloDocumentacion } from './documentacion.model';

/** Documentación: Reliquidaciones y Proyecciones. */
export const DOCS_RELIQUIDACIONES_PROYECCIONES: ArticuloDocumentacion[] = [
  // ---------------------------------------------------------------- Reliquidaciones
  {
    categoria: 'Reliquidaciones',
    titulo: '1. Crear una reliquidación',
    contenido: 'Una reliquidación se arma para un APS y un período (desde/hasta). Al guardarla, el sistema trae la información de ese período para que después la revises en Cargue, la compares y la apliques en tarifas.',
    sistema: 'Reliquidaciones',
    ruta: '/reliquidacion/crear',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es el primer paso del flujo de reliquidación: Crear → Cargue (revisar, corregir y "RELIQUIDAR TARIFA") → Comparar Costo y Comparar Tarifas → Tarificador (previsualizar y aprobar).',
          'Cuando guardás una reliquidación nueva, el sistema copia la información del APS para los meses entre "Periodo desde" y "Periodo hasta". Esa copia es la que vas a ver y editar en Reliquidación - Cargue.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla con todas las reliquidaciones vigentes: RELIQ (número), APS, APS NOMBRE, NOMBRE, DESCRIPCIÓN, DESDE, HASTA, USU. SOLICITA, ESTADO, FECHA y USU. APRUEBA. El estado se ve como etiqueta: "Creada" (reloj) o "Aplicada" (tilde).',
          'Cada fila tiene un lápiz para editarla y un tacho para eliminarla.'
        ]
      }
    ],
    pasos: [
      'Tocá "Nueva reliquidación".',
      'Elegí el APS (solo aparecen los APS activos que tenés asignados).',
      'Escribí el nombre (mínimo 3 caracteres) y, si querés, una descripción.',
      'Elegí "Periodo desde" y "Periodo hasta" (año/mes).',
      'Elegí el solicitante: la lista muestra los usuarios del APS elegido y podés buscar por correo.',
      'Revisá el estado (por defecto "Creada"). El aprobador se completa solo con tu usuario y no se puede cambiar.',
      'Tocá "Guardar". Vas a ver "Reliquidación guardada correctamente." y la reliquidación aparece en la tabla.'
    ],
    notas: [
      'Todos los campos menos la descripción son obligatorios; si falta alguno, vas a ver "Complete correctamente los campos requeridos antes de guardar.".',
      'El "desde" no puede ser posterior al "hasta": si elegís un período cruzado, la pantalla te avisa y borra el que acabás de elegir.',
      'Si la copia de información del período falla, la reliquidación no se crea y vas a ver un mensaje que empieza con "La extracción de la reliquidación no se completó".',
      'Editar una reliquidación cambia sus datos (nombre, descripción, período, solicitante, estado), pero no vuelve a traer la información del período.',
      'Eliminar pide confirmación ("¿Seguro que querés eliminar la reliquidación ...?").'
    ]
  },
  {
    categoria: 'Reliquidaciones',
    titulo: '2. Revisar el cargue y reliquidar la tarifa',
    contenido: 'En Cargue revisás y corregís la información de una reliquidación (Usuarios, Empresa, APS, Relleno y Adicional) y ejecutás "RELIQUIDAR TARIFA" para recalcular con esos datos.',
    sistema: 'Reliquidaciones',
    ruta: '/reliquidacion/cargue',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es el segundo paso del flujo. Acá ves la información que se copió al crear la reliquidación, la ajustás si hace falta y lanzás el recálculo. Las pantallas Comparar Costo y Comparar Tarifas muestran el resultado de ese recálculo.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba: APS, Reliquidación, Horizonte Desde, Horizonte Hasta y Descripción (estos tres últimos son de solo lectura) y el botón rojo "RELIQUIDAR TARIFA".',
          'Abajo, cinco pestañas: Usuarios (Año, Mes, Clase Uso, Tipo Tarifa, Factor Prod, Cantidad, Toneladas), Empresa, APS, Relleno y Adicional, cada una con sus variables por año y mes. Los valores se muestran con 2 decimales.'
        ]
      }
    ],
    pasos: [
      'Elegí el APS: la lista de reliquidaciones se filtra a las de ese APS. Si dejás el APS vacío, ves todas.',
      'Elegí la reliquidación. La información de las cinco pestañas se consulta sola.',
      'Si necesitás corregir valores, tocá "Editar": las celdas numéricas pasan a ser editables.',
      'Cambiá los valores y tocá el botón "Guardar ..." de esa pestaña (por ejemplo "Guardar Usuarios"). Al guardar bien, la pantalla sale del modo edición.',
      'Cuando los datos estén bien, tocá "RELIQUIDAR TARIFA" y confirmá con "Reliquidar".',
      'Si sale bien, vas a ver el mensaje del proceso y las pestañas se recargan. Seguí en Comparar Costo y Comparar Tarifas.'
    ],
    notas: [
      'Guardar solo graba los valores de la pestaña en la que estás; no recalcula nada. El recálculo lo hace "RELIQUIDAR TARIFA", así que ejecutalo después de tus correcciones.',
      'Para dejar de editar sin guardar, tocá "Cancelar edición".',
      'Si el proceso de reliquidación informa un error, vas a ver el mensaje con su código y la aclaración "No se ejecutó.".',
      'La reliquidación que elijas queda recordada y se preselecciona en Comparar Costo y Comparar Tarifas.',
      'Cada pestaña se puede exportar con el botón "Exportar" de la tabla.'
    ]
  },
  {
    categoria: 'Reliquidaciones',
    titulo: '3. Comparar costos de una reliquidación',
    contenido: 'Muestra, mes a mes, cada costo reliquidado al lado del costo original y la diferencia entre ambos.',
    sistema: 'Reliquidaciones',
    ruta: '/reliquidacion/comparar-costo',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te deja ver cuánto cambia cada componente de costo con la reliquidación antes de aplicarla. Se usa después de ejecutar "RELIQUIDAR TARIFA" en Cargue.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Los mismos selectores que en Cargue (APS, Reliquidación, Horizonte y Descripción) y una tabla con RELIQ, APS, AÑO y MES.',
          'Para cada costo (CCSENER, CCSENERAPV, CCSACUE, CCSACUEAPV, CBLS, CLUS, CRT, CDF, CTL, VBA e IAT) hay tres columnas: RELQ (valor reliquidado, fondo azul), TARI (valor original, fondo verde) y DIFE (diferencia, fondo rojo).'
        ]
      }
    ],
    pasos: [
      'Elegí el APS para filtrar las reliquidaciones (opcional).',
      'Elegí la reliquidación. La comparación se consulta sola; no hay botón de consultar.',
      'Revisá las diferencias y, si querés, exportá la tabla con "Exportar".'
    ],
    notas: [
      'Si la tabla queda vacía, esa reliquidación todavía no tiene costos para comparar: revisá si ya se ejecutó "RELIQUIDAR TARIFA" en Cargue.',
      'Esta pantalla es solo de consulta.'
    ]
  },
  {
    categoria: 'Reliquidaciones',
    titulo: '4. Comparar tarifas originales y reliquidadas',
    contenido: 'Muestra, por mes, clase de uso, tipo de tarifa y factor de producción, la tarifa original, la reliquidada y la diferencia, más un resumen por período.',
    sistema: 'Reliquidaciones',
    ruta: '/reliquidacion/comparar-tarifas',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es la revisión final del impacto en tarifas antes de aplicar la reliquidación en el Tarificador, incluyendo lo que habría que cobrar o devolver.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Pestaña "Comparar Tarifas": MES, AÑO, CLASE DE USO, TIPO TARIFA y FACTOR PROD (con filtro "Contiene") y, para cada tarifa (TC, TCAPROV, TCADD, TCADDAPROV, TBL, TLU, TRT, TDF, TTL y TA), la columna ORIG (original), REL (reliquidada) y DIF (diferencia). Al final están las tarifas plenas de energía y acueducto y las columnas COB/DEV ENE y COB/DEV ACU, que se colorean distinto según el valor sea positivo, negativo o cero.',
          'Pestaña "Resumen": selectores de Año y Mes propios y, debajo, los bloques del resumen de ese período.'
        ]
      }
    ],
    pasos: [
      'Elegí el APS y después la reliquidación. La tabla "Comparar Tarifas" se consulta sola.',
      'Revisá las diferencias; podés filtrar por clase de uso, tipo de tarifa o factor.',
      'Abrí la pestaña "Resumen". El Año y el Mes se completan con el primer período que tiene datos.',
      'Cambiá el Año o el Mes para ver otro período: el resumen se consulta solo.'
    ],
    notas: [
      'El Resumen necesita que tengas elegido el APS arriba, además de la reliquidación, el año y el mes.',
      'Si el período elegido no tiene resumen, vas a ver un aviso que te indica ejecutar primero "RELIQUIDAR TARIFA" en Cargue.',
      'Esta pantalla es solo de consulta.'
    ]
  },
  {
    categoria: 'Reliquidaciones',
    titulo: '5. Verificar cambios y aplicar la reliquidación en tarifas',
    contenido: 'En el Tarificador previsualizás qué valores va a cambiar la reliquidación (antes y después) y, si está todo bien, la aprobás para aplicarla en tarifas.',
    sistema: 'Reliquidaciones',
    ruta: '/reliquidacion/tarificador',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es el último paso del flujo y reúne las dos opciones del menú: "Reliquidación - Verificación de Cambios" (previsualizar) y "Reliquidación - Aplicar en Tarifas" (aprobar). Las dos abren esta misma pantalla.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba: el selector de reliquidación, el botón "Previsualizar", el botón "Aprobar" (solo cuando corresponde) y el "Estado actual" de la reliquidación.',
          'Abajo, las pestañas Usuarios, Empresa, Adicional, Relleno y APS. Cada fila identifica empresa, municipio (o relleno), año y mes, y cada columna que cambia muestra dos valores: arriba, en gris, el valor actual; abajo, en verde, el valor que va a quedar.'
        ]
      }
    ],
    pasos: [
      'Elegí la reliquidación.',
      'Tocá "Previsualizar" y revisá los cambios en cada pestaña.',
      'Si estás de acuerdo, tocá "Aprobar" y confirmá en "Confirmar aprobación".',
      'Al terminar se abre "Aprobación Aplicada" con el mensaje del proceso y cuántos registros se aplicaron en Información APS, Empresas, Rellenos, Usuarios y Adicional ("Ninguna" si no hubo).',
      'La pantalla vuelve a consultar sola y actualiza el "Estado actual".'
    ],
    notas: [
      'Aprobar aplica los valores reliquidados en la información de tarifas. Esta pantalla no tiene forma de deshacerlo: revisá bien la previsualización antes.',
      'El botón "Aprobar" solo aparece después de previsualizar y cuando la reliquidación no está "Aplicada".',
      'Si una pestaña no tiene cambios, queda vacía; las demás se muestran igual.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué Comparar Tarifas dice que la reliquidación no tiene resumen generado?',
    contenido: 'Porque todavía no se ejecutó "RELIQUIDAR TARIFA" en Reliquidación - Cargue para esa reliquidación, o el año/mes elegido no tiene datos. Ejecutalo y volvé a consultar.',
    sistema: 'Reliquidaciones',
    ruta: '/reliquidacion/cargue',
    pasos: [
      'Abrí Reliquidación - Cargue y elegí la misma reliquidación.',
      'Tocá "RELIQUIDAR TARIFA" y confirmá.',
      'Volvé a Comparar Tarifas, pestaña "Resumen", y elegí un año y mes dentro del horizonte de la reliquidación.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué no veo el botón "Aprobar" en el Tarificador?',
    contenido: 'El botón aparece recién después de tocar "Previsualizar" y solo si la reliquidación no está "Aplicada". Una reliquidación aplicada no se puede volver a aprobar.',
    sistema: 'Reliquidaciones',
    ruta: '/reliquidacion/tarificador'
  },

  // ---------------------------------------------------------------- Proyecciones
  {
    categoria: 'Proyecciones',
    titulo: '1. Crear una proyección',
    contenido: 'Una proyección se define para un APS, desde el mes siguiente al último cálculo de tarifas hasta el horizonte que elijas. Es la base de la línea de tiempo, el crecimiento de variables y la ejecución.',
    sistema: 'VEO-Regulator',
    ruta: '/proyecciones',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es el primer paso del flujo de proyecciones: Crear Proyección → Líneas de Tiempo → Crecimiento Variables Programadas → Proyectar. En Subsidios y Contribuciones cargás además los porcentajes por clase de uso de la proyección.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla con las proyecciones de los APS que tenés asignados: ID, APS, Nombre, Descripción, Tipo Proy, Desde, Horizonte Hasta y Usuario. Podés ordenar por cualquier columna y filtrar por ID, APS, Nombre, Tipo y Usuario.',
          'Cada fila tiene un lápiz para actualizarla y un tacho para eliminarla.'
        ]
      }
    ],
    pasos: [
      'Tocá "Nueva Proyección".',
      'Elegí el APS. El campo "Desde (último cálculo de tarifas)" se completa solo con el mes siguiente a la última tarifa calculada de ese APS.',
      'Escribí el nombre y la descripción.',
      'Elegí el tipo: "Ingresos" o "Subsidios o Contribuciones".',
      'Completá "Horizonte hasta (año)" y "Horizonte hasta (mes)". Arrancan en el mes actual.',
      'Tocá "Guardar". Vas a ver "Proyección creada correctamente.".'
    ],
    notas: [
      'Todos los datos son obligatorios, incluida la descripción; si falta alguno vas a ver "Todos los datos son obligatorios".',
      'El horizonte no se incluye: la proyección llega hasta el mes anterior al horizonte que cargás. Por ejemplo, con horizonte junio 2027 la proyección termina en mayo 2027 (eso es lo que muestra la columna "Horizonte Hasta").',
      'Si el APS no tiene ningún cálculo de tarifas, vas a ver "El APS seleccionado no tiene un último cálculo de tarifas." y no vas a poder completar el "Desde".',
      'El período inicial no puede quedar después del final.',
      'Al actualizar una proyección no se puede cambiar el APS.',
      'Eliminar pide confirmación ("¿Seguro que querés eliminar la proyección ...?").'
    ]
  },
  {
    categoria: 'Proyecciones',
    titulo: '2. Cargar la línea de tiempo de una proyección',
    contenido: 'Cargás, mes a mes dentro del horizonte de la proyección, los indicadores económicos que usa la proyección: IPC, IPCC, SMLV, IOEXP, factor de productividad e índice IPCC.',
    sistema: 'VEO-Regulator',
    ruta: '/proyecciones/linea-tiempo',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es el segundo paso del flujo. La línea de tiempo tiene una fila por mes entre el "Desde" y el "Hasta" de la proyección, con los valores que se van a usar al proyectar.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba: APS, Proyección, Horizonte Desde, Horizonte Hasta y Descripción.',
          'Abajo, la tabla con AÑO, MES, IPC, IPCC, SMLV, IOEXP, FACT PROD e IND IPCC (según el APS puede aparecer además IPC TCL), 24 meses por página y valores con hasta 5 decimales. Cada fila tiene un lápiz para editarla o un candado si está bloqueada.'
        ]
      }
    ],
    pasos: [
      'Elegí el APS y la proyección. Si la proyección todavía no tiene línea de tiempo, la tabla se arma sola con un mes por fila y todos los valores en 0.',
      'Tocá el lápiz de un mes, cargá los valores y confirmá la fila con el tilde (o descartá con la cruz).',
      'Repetí con los meses que necesites.',
      'Tocá "Guardar" para grabar toda la tabla. Vas a ver "Guardado Correctamente".'
    ],
    notas: [
      'Confirmar una fila con el tilde no la graba: los cambios se guardan recién al tocar "Guardar".',
      'Los meses con candado ya se usaron en una proyección ejecutada y no se pueden modificar. Si se envían igual, se omiten y el mensaje del guardado indica cuántas filas bloqueadas no se modificaron.',
      'La proyección que elijas queda recordada y se preselecciona en las demás pantallas de Proyecciones.'
    ]
  },
  {
    categoria: 'Proyecciones',
    titulo: '3. Cargar el crecimiento de variables desde Drive',
    contenido: 'Traés desde el Google Sheet configurado para el APS el crecimiento proyectado de usuarios, información propia, información de terceros y descuentos, y lo guardás en la proyección.',
    sistema: 'VEO-Regulator',
    ruta: '/proyecciones/crecimiento',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es el tercer paso del flujo. Carga las variables programadas que la proyección usa al ejecutarse. La información sale de un Google Sheet que tiene que estar configurado para el APS.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba: APS, Proyección, Descripción y el botón "Cargar Información desde Drive".',
          'Abajo, cuatro pestañas: Usuarios, Info Propia, Info Terceros y Descuentos. Cada una muestra las columnas tal como vienen en la hoja y tiene su propio botón "Guardar".'
        ]
      }
    ],
    pasos: [
      'Elegí el APS y la proyección.',
      'Tocá "Cargar Información desde Drive" y esperá a que se completen las pestañas.',
      'Revisá cada pestaña.',
      'En cada pestaña que quieras grabar, tocá "Guardar". Vas a ver un mensaje de confirmación por pestaña (por ejemplo "Crecimiento de usuarios guardado.").'
    ],
    notas: [
      'Guardar una pestaña reemplaza lo que esa proyección tenía guardado para esa pestaña.',
      'Para guardar tenés que tener elegida la proyección; para cargar desde Drive alcanza con el APS.',
      'Si el APS no tiene un Google Sheet configurado, vas a ver un aviso en rojo debajo de los selectores.',
      'Si una hoja no se pudo leer, vas a ver un aviso con el nombre de la hoja y las demás se cargan igual.',
      'Si una celda numérica no tiene un número, el guardado se frena con un mensaje como: Fila 5, columna CANTIDAD: "abc" no es un número. Corregí la hoja y volvé a cargar.'
    ]
  },
  {
    categoria: 'Proyecciones',
    titulo: '4. Ejecutar una proyección',
    contenido: 'En Proyectar revisás la línea de tiempo y las variables cargadas de una proyección y la ejecutás con el botón "EJECUTAR".',
    sistema: 'VEO-Regulator',
    ruta: '/proyecciones/ejecutar',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es el último paso del flujo: corre el proceso de proyección con lo que cargaste en Líneas de Tiempo y Crecimiento Variables Programadas.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba: APS, Proyección, Horizonte Desde, Horizonte Hasta, Descripción y el botón "EJECUTAR".',
          'Abajo, dos pestañas de solo lectura: "Lineas de Tiempo" (AÑO, MES, IPC, IPCC, SMLV, IOEXP, FACT PROD e IND IPCC) y "Variables", con las subpestañas USUARIOS, INFORMACION PROPIA, INFORMACION TERCERO y DESCUENTOS COSTO.'
        ]
      }
    ],
    pasos: [
      'Elegí el APS y la proyección. La línea de tiempo y las variables se consultan solas.',
      'Revisá que la línea de tiempo y las variables estén completas. Si una pestaña dice "Sin datos para esta proyección.", cargala antes en su pantalla.',
      'Tocá "EJECUTAR" y esperá.',
      'Leé el recuadro "Resultado": "Proceso ejecutado correctamente." si salió bien o "Ejecución finalizada con observaciones." si no.'
    ],
    notas: [
      '"EJECUTAR" no pide confirmación: el proceso arranca apenas lo tocás.',
      'Los meses de la línea de tiempo que usa una proyección ejecutada quedan bloqueados y ya no se pueden editar en Líneas de Tiempo.',
      'Si la ejecución no termina bien, el aviso muestra el código que devolvió el proceso seguido de "Error al ejecutar la proyeccion".'
    ]
  },
  {
    categoria: 'Proyecciones',
    titulo: 'Cargar los porcentajes de subsidios y contribuciones de una proyección',
    contenido: 'Consultás y editás, para una proyección, el valor de subsidio o contribución de cada clase de uso en un año y mes.',
    sistema: 'VEO-Regulator',
    ruta: '/proyecciones/subcont',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Complementa la proyección con los porcentajes de subsidios y contribuciones por clase de uso. No es la misma pantalla que la otra opción "Subsidios y Contribuciones" del menú: esta trabaja siempre sobre una proyección.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba: APS, Proyección, Año y Mes. Abajo, una tabla con la Clase y su Valor, y los botones "Editar", "Guardar" y "Cancelar".'
        ]
      }
    ],
    pasos: [
      'Elegí el APS, la proyección, el año y el mes. Con los cuatro completos, la consulta se hace sola.',
      'Tocá "Editar": la columna Valor pasa a ser editable (hasta 4 decimales).',
      'Cambiá los valores que necesites.',
      'Tocá "Guardar". Vas a ver "Porcentajes de subsidios y contribuciones editados correctamente" y la tabla se vuelve a consultar. Con "Cancelar" volvés a los valores anteriores.'
    ],
    notas: [
      'Al entrar, el Año y el Mes arrancan en el último período que elegiste en la aplicación o, si no hay, en el mes actual.',
      'La consulta trae los valores del mes anterior al elegido, pero al guardar quedan registrados en el mes que elegiste.',
      'Guardar reemplaza los valores que esa proyección tenía para ese APS y período.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué hay meses con candado en la línea de tiempo?',
    contenido: 'El candado indica que ese mes ya se usó en una proyección ejecutada, así que no se puede modificar. Si guardás la tabla, esas filas se omiten y el resto se graba normalmente.',
    sistema: 'VEO-Regulator',
    ruta: '/proyecciones/linea-tiempo'
  }
];
