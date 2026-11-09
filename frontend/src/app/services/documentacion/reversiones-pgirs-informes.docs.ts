import { ArticuloDocumentacion } from './documentacion.model';

/** Documentación: Reversiones, PGIRS e Informes. */
export const DOCS_REVERSIONES_PGIRS_INFORMES: ArticuloDocumentacion[] = [
  // ── Reversiones ──────────────────────────────────────────────────────────
  {
    categoria: 'Reversiones',
    titulo: 'Autorizar una reversión de tarifas integradas',
    contenido:
      'Registrá la autorización que habilita reversar un período de una APS cuando sus tarifas ya fueron integradas con el sistema comercial. Sin esta autorización, la reversión queda bloqueada.',
    sistema: 'VEO-Regulator',
    ruta: '/reversion_auth',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Reversar un período es una operación en dos pasos. Si las tarifas certificadas de la APS para ese período ya se integraron con el sistema comercial, primero alguien tiene que registrar una autorización en esta pantalla, y recién después se puede ejecutar la reversión desde "Ejecutar Reversión".',
          'Si las tarifas del período todavía no se integraron con el sistema comercial, la reversión no necesita autorización.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Los selectores de APS, Año y Mes (arrancan en el año y mes actuales), un campo Descripción para dejar el motivo de la autorización y el botón Guardar.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS.',
      'Elegí el año y el mes actuales (el mes en curso, no el que vas a reversar).',
      'Escribí en Descripción el motivo de la autorización.',
      'Tocá Guardar. Si todo sale bien vas a ver el mensaje "Se guardo la Autorizacion correctamente".',
      'Avisale a quien va a ejecutar la reversión que ya puede hacerlo desde "Ejecutar Reversión" con la misma APS, año y mes.'
    ],
    notas: [
      'La autorización se guarda para el mes anterior al que elegiste: si seleccionás marzo, autorizás la reversión de febrero. Es el mismo criterio que usa "Ejecutar Reversión".',
      'APS, año, mes y descripción son obligatorios; si falta alguno vas a ver "Debe seleccionar APS, año, mes y descripción". La descripción tiene que tener entre 3 y 500 caracteres.',
      'Registrá una sola autorización por APS y período: la validación de la reversión espera encontrar exactamente una.',
      'La pantalla solo aparece en el menú si tu usuario tiene asignada la opción "Autorización Reversiones".',
      'Podés revisar las autorizaciones que registraste en "Detallado Autorización".'
    ]
  },
  {
    categoria: 'Reversiones',
    titulo: 'Ejecutar una reversión',
    contenido:
      'Reversá la información certificada de una APS para el mes cerrado anterior al que elegís, dejando registrado el motivo. Es una operación destructiva que no se puede deshacer desde la interfaz.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/reversion',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Borra y resguarda la información certificada del período (incluidas las tarifas calculadas). Cada reversión queda registrada con su motivo y usuario en "Histórico Reversión".'
        ]
      },
      {
        titulo: 'Cómo se relaciona con la autorización',
        parrafos: [
          'Antes de reversar, el sistema valida el período. Si las tarifas de la APS para ese período ya fueron integradas con el sistema comercial, la reversión se bloquea salvo que exista una autorización registrada en "Autorización Reversiones" para esa misma APS y período.',
          'Por eso el orden es: primero se autoriza (solo si las tarifas ya se integraron) y después se ejecuta.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Un aviso de que la operación es destructiva, los selectores de APS, Año y Mes (arrancan en el año y mes actuales), el campo Motivo y el botón Reversar.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS.',
      'Elegí el año y el mes actuales. La reversión se aplica al mes anterior, que es el último mes cerrado.',
      'Escribí el motivo de la reversión.',
      'Tocá Reversar. El sistema valida que el período se pueda reversar.',
      'Si la validación pasa, se abre una confirmación que indica el mes y año que se van a reversar. Revisalo y tocá Reversar para continuar, o Cancelar para volver.',
      'Cuando termina vas a ver "Periodo Reversado Correctamente" y el motivo se limpia.'
    ],
    notas: [
      'Es irreversible desde la interfaz: la información certificada del período se borra (queda resguardada). Confirmá bien la APS y el mes antes de aceptar.',
      'Si seleccionás marzo, se reversa febrero. El mensaje de confirmación muestra el período real que se va a reversar.',
      'La APS y el motivo son obligatorios: vas a ver "Debe Seleccionar una APS" o "El valor es obligatorio" si falta alguno.',
      'Si aparece "No se pueden realizar la reversion, para el periodo seleccionado ya que las tarifas fueron integradas con el SC", primero hay que registrar la autorización en "Autorización Reversiones".',
      'La pantalla solo aparece en el menú si tu usuario tiene asignada la opción "Ejecutar Reversión".'
    ]
  },
  {
    categoria: 'Reversiones',
    titulo: 'Consultar el histórico de reversiones',
    contenido:
      'Revisá todas las reversiones ejecutadas, con su APS, período, fecha, motivo y usuario, y exportalas a un archivo.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/historico',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite auditar qué reversiones se hicieron, cuándo, por qué y quién las ejecutó.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla con las columnas APS, AÑO, MES, FECHA (día y hora), MOTIVO y USUARIO, ordenada de los períodos más recientes a los más viejos.',
          'Debajo de cada encabezado (salvo Motivo) hay un filtro de texto, y arriba de la tabla está el botón Exportar.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: el histórico se carga solo, no hace falta elegir APS ni período.',
      'Escribí en los filtros de APS, Año, Mes, Fecha o Usuario para acotar las filas.',
      'Cambiá la cantidad de filas por página (10, 20 o 50) si necesitás ver más.',
      'Tocá Exportar para descargar la tabla.'
    ],
    notas: [
      'El archivo exportado es un CSV separado por punto y coma (;), con el nombre "DetalleReversiones".',
      'Los filtros buscan por "contiene": por ejemplo, escribir parte del nombre de la APS o del correo del usuario alcanza.'
    ]
  },
  {
    categoria: 'Reversiones',
    titulo: 'Revisar las autorizaciones de reversión registradas',
    contenido:
      'Consultá las autorizaciones de reversión que registraste con tu usuario: APS, período, descripción y fecha de creación.',
    sistema: 'VEO-Regulator',
    ruta: '/detautorizacion',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te sirve para confirmar que una autorización quedó guardada antes de que se ejecute la reversión, o para revisar qué autorizaste y cuándo.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla con APS, Año, Mes, Descripción, Fecha creación y Usuario. Podés ordenar tocando cualquier encabezado y filtrar con los campos "Buscar" de cada columna (salvo Descripción).'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: las autorizaciones se cargan solas.',
      'Usá los filtros "Buscar" para encontrar una APS, año, mes, fecha o usuario.',
      'Tocá un encabezado para ordenar por esa columna.'
    ],
    notas: [
      'Solo ves las autorizaciones registradas con tu propio usuario.',
      'El año y mes de cada fila son los del período autorizado, es decir, el mes anterior al que se eligió al guardar la autorización.'
    ]
  },

  // ── PGIRS ────────────────────────────────────────────────────────────────
  {
    categoria: 'PGIRS',
    titulo: 'Cargar y editar las variables PGIRS de una APS',
    contenido:
      'Registrá los valores y frecuencias de las siete variables PGIRS (barrido y CLUS) de una APS para un período, y corregilos fila por fila cuando haga falta.',
    sistema: 'VEO-Regulator',
    ruta: '/pgirs/variables',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Las variables PGIRS son las metas del plan de gestión de residuos contra las que después se comparan los valores medidos en "Informe PGIRS". Esta pantalla es donde se cargan y se corrigen.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Los selectores de APS, Año y Mes, el botón Nuevo y una tabla con COD APS, APS, AÑO, MES, VARIABLE, FRECUENCIA, VALOR, USUARIO, FECHA INGRESO y TIPO INGRESO, con un lápiz por fila para editar.',
          'Las variables son LBL (barrido) y CESPED, PODA, LAVADO, PLAYAS, INS CESTAS y MAN CESTAS (CLUS). Cada una lleva un valor y una frecuencia: Mensual, Semestral o Anual.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS, el año y el mes. La consulta se hace sola cuando los tres están completos.',
      'Si el período no tiene variables, tocá Nuevo.',
      'En el formulario completá el valor y la frecuencia de las siete variables (Barridos: LBL; CLUS: CESPED, PODA, LAVADO, PLAYAS, INS CESTAS y MAN CESTAS).',
      'Tocá Guardar. Si todo sale bien vas a ver "Variable creada correctamente" y la tabla se actualiza.',
      'Para corregir una variable ya cargada, tocá el lápiz de la fila, cambiá el valor o la frecuencia y tocá el tilde para guardar (o la cruz para cancelar).'
    ],
    notas: [
      'Los datos se consultan y se guardan para el mes anterior al que elegiste: si seleccionás marzo, trabajás sobre febrero.',
      'El botón Nuevo se deshabilita cuando el período ya tiene variables cargadas; en ese caso editalas fila por fila.',
      'Las siete variables con su frecuencia son obligatorias: si falta alguna vas a ver "Este campo es obligatorio" y no se guarda nada.',
      'Cada fila que editás queda marcada con TIPO INGRESO "MANUAL", que se resalta en naranja, y se actualizan el usuario y la fecha de ingreso.'
    ]
  },
  {
    categoria: 'PGIRS',
    titulo: 'Consultar el resumen de ingresos de variables PGIRS',
    contenido:
      'Revisá, para una APS, en qué períodos se ingresaron variables PGIRS, de qué forma, cuándo y por qué usuario.',
    sistema: 'VEO-Regulator',
    ruta: '/pgirs/informe-variables',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te da una vista rápida de la historia de carga de variables PGIRS de una APS, para detectar períodos sin cargar o corregidos a mano.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla con APS, INGRESO (el período), TIPO INGRESO, FECHA INGRESO y USUARIO, ordenada del período más reciente al más viejo. Las columnas APS, INGRESO y TIPO INGRESO tienen filtro.',
          'Los ingresos de tipo "MANUAL" se resaltan en naranja.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS: la consulta se hace sola.',
      'Usá los filtros de APS, INGRESO o TIPO INGRESO para acotar la tabla.',
      'Si necesitás el detalle, tocá Exportar para descargar la tabla.'
    ],
    notas: [
      'No se elige período: la tabla muestra todos los períodos registrados para la APS.',
      'Si la APS no tiene ingresos vas a ver "Sin datos".'
    ]
  },
  {
    categoria: 'PGIRS',
    titulo: 'Comparar valores medidos contra las metas PGIRS',
    contenido:
      'Compará, período a período, los valores medidos de cada actividad de CLUS y de barrido de una APS contra su meta PGIRS, con colores que marcan si se cumple.',
    sistema: 'VEO-Regulator',
    ruta: '/pgirs/resumen',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es el informe para seguir el cumplimiento del PGIRS de una APS: para cada actividad muestra el valor medido al lado de la meta cargada en "Variables PGIRS".'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Dos pestañas. Clus: APS, NOM APS, PERIODO y, de a pares, el valor medido y su meta PGIRS para PODA, CESPED, LAVADO, PLAYA, instalación de cestas (I CEST) y mantenimiento de cestas (M CEST).',
          'Barrido: APS, NOM APS, PERIODO, SEMESTRE, BARRIDO y BARRIDO PGIRS.',
          'Las columnas de meta PGIRS se ven en azul. Los valores medidos se pintan de verde cuando están dentro de la meta y de rojo cuando la superan.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS: se cargan las dos pestañas a la vez.',
      'Revisá la pestaña Clus y filtrá por PERIODO si buscás un mes puntual.',
      'Pasá a la pestaña Barrido y filtrá por PERIODO o SEMESTRE.',
      'Tocá Exportar en cualquiera de las dos pestañas para descargar su tabla.'
    ],
    notas: [
      'Los valores se muestran con dos decimales.',
      'Si la meta PGIRS de un período no está cargada, completala primero en "Variables PGIRS".'
    ]
  },

  // ── Informes ─────────────────────────────────────────────────────────────
  {
    categoria: 'Informes',
    titulo: 'Consultar la información general de una proyección',
    contenido:
      'Revisá, para una proyección de una APS, la facturación de energía y acueducto, los costos y las tarifas proyectadas, mes a mes.',
    sistema: 'VEO-Regulator',
    ruta: '/generales',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Reúne en una sola pantalla los resultados de una proyección ya creada, para analizarlos o exportarlos.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba, los selectores de APS y Proyección y, en solo lectura, el Horizonte Desde, el Horizonte Hasta y la Descripción de la proyección elegida.',
          'Abajo, cuatro pestañas: FACT Ene (facturación de energía), FACT Acu (facturación de acueducto), Costos y Tarifas. Las de facturación y Tarifas se abren por año, mes, clase de uso y tipo de tarifa; Costos, por año, mes y tipo de factura.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS.',
      'Elegí la proyección. Se completan el horizonte y la descripción, y se carga la pestaña que tengas abierta.',
      'Cambiá de pestaña para ver las otras tablas; cada una se consulta al abrirla.',
      'Filtrá por año, mes u otras columnas de texto, y tocá Exportar si necesitás la tabla en un archivo.'
    ],
    notas: [
      'Si cambiás de APS se limpia la proyección elegida y tenés que volver a seleccionarla.',
      'Los valores numéricos se muestran redondeados a dos decimales.',
      'Las tablas muestran 24 filas por página.'
    ]
  },
  {
    categoria: 'Informes',
    titulo: 'Ver el detallado de costos de todas las APS',
    contenido:
      'Compará, para un período, el valor a cobrar contra el valor real de cada costo en todas las APS, con su variación.',
    sistema: 'VEO-Regulator',
    ruta: '/gerencial/costos',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es un informe gerencial para revisar de un vistazo cómo quedó cada componente de costo en todas las APS del período.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Los selectores de Año y Mes y una tabla con APS, Costo, Valor a Cobrar, Valor Real y Variación. La columna APS tiene filtro.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: se carga sola con el año y mes que tengas guardados o, si no, con el mes actual.',
      'Cambiá el año o el mes para consultar otro período; la tabla se actualiza sola.',
      'Filtrá por APS si buscás una en particular y tocá Exportar para descargar la tabla.'
    ],
    notas: [
      'Se consulta el mes anterior al que elegiste: si seleccionás marzo, ves febrero.',
      'No se elige APS: el informe trae todas.',
      'Valor a Cobrar y Valor Real se muestran con 2 decimales; Variación, con 6.'
    ]
  },
  {
    categoria: 'Informes',
    titulo: 'Ver el detallado de subsidios y aportes',
    contenido:
      'Consultá, para un período, los valores de subsidio y aporte de todas las APS por clase de uso y tipo de predio.',
    sistema: 'VEO-Regulator',
    ruta: '/gerencial/sub-aporte',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es un informe gerencial para revisar los subsidios y aportes aplicados en todas las APS de un período.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Los selectores de Año y Mes y una tabla con APS, Clase Uso, Tipo Predio y Valor. APS, Clase Uso y Tipo Predio tienen filtro.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: se carga sola con el año y mes que tengas guardados o, si no, con el mes actual.',
      'Cambiá el año o el mes para consultar otro período; la tabla se actualiza sola.',
      'Filtrá por APS, clase de uso o tipo de predio y tocá Exportar para descargar la tabla.'
    ],
    notas: [
      'Se consulta el mes anterior al que elegiste: si seleccionás marzo, ves febrero.',
      'No se elige APS: el informe trae todas.',
      'El valor se muestra con 6 decimales.'
    ]
  },
  {
    categoria: 'Informes',
    titulo: 'Seguir el avance del cálculo de tarifas en el Dashboard',
    contenido:
      'Mirá cuántas APS ya tienen tarifas calculadas en un período, cuáles están pendientes y cuándo se hizo cada cálculo.',
    sistema: 'VEO-Regulator',
    ruta: '/gerencial/dashboard',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite controlar el cierre del mes: qué APS ya calcularon tarifas y cuáles faltan.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Tarjetas de resumen: APS calculados (cantidad sobre el total y porcentaje con cálculo), Pendientes (con el nombre de algunas APS y "+N" para el resto) y Último cálculo (fecha y APS).',
          'Un gráfico "Cálculos por fecha" con cuántas APS se calcularon cada día.',
          'La tabla "Estado de cálculo por APS" con ID, APS, Estado del cálculo (Calculado con su fecha, o Pendiente) y Usuario. Las filas pendientes se resaltan.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: se carga sola con el año y mes que tengas guardados o, si no, con el mes actual.',
      'Cambiá el año o el mes para ver otro período.',
      'Usá los botones Todos, Calculados o Pendientes sobre la tabla para filtrar por estado; cada uno muestra cuántas APS tiene.',
      'Tocá Exportar si necesitás la tabla en un archivo.'
    ],
    notas: [
      'Se consulta el mes anterior al que elegiste: si seleccionás marzo, ves febrero.',
      'Las tarjetas y el gráfico siempre cuentan todas las APS del período, aunque filtres la tabla.'
    ]
  },
  {
    categoria: 'Informes',
    titulo: 'Consultar el costo de poda por empresa',
    contenido:
      'Revisá, para una APS, el costo techo y el costo de facturación de poda de cada empresa, período por período.',
    sistema: 'VEO-Regulator',
    ruta: '/gerencial/poda',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite comparar lo que se factura por poda contra el costo techo, empresa por empresa, en toda la historia de la APS.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'El selector de APS y una tabla con Período, Empresa, Costo Techo, Costo Facturación, Tipo Ingreso, Fecha Creación y Usuario. Período, Empresa y Tipo Ingreso tienen filtro.',
          'Los registros con Tipo Ingreso "MANUAL" se resaltan en naranja.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS: la consulta se hace sola.',
      'Filtrá por período, empresa o tipo de ingreso.',
      'Tocá Exportar para descargar la tabla.'
    ],
    notas: ['No se elige período: la tabla trae todos los períodos de la APS.']
  },
  {
    categoria: 'Informes',
    titulo: 'Cargar descuentos de costos de una APS',
    contenido:
      'Agregá o actualizá el valor de descuento de cada costo de una APS para un período.',
    sistema: 'VEO-Regulator',
    ruta: '/gerencial/descuento-costos',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Registra los descuentos que se aplican a los costos de una APS en un período, y permite corregirlos.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Los selectores de APS, Año y Mes, el botón Agregar y una tabla con COSTO y DESCUENTO, con un lápiz por fila para editar.'
        ]
      }
    ],
    pasos: [
      'Elegí la APS, el año y el mes. La tabla se consulta sola cuando los tres están completos.',
      'Para cargar un descuento nuevo, tocá Agregar.',
      'En el formulario elegí el costo en Descuento (podés buscarlo por nombre) e ingresá el Valor.',
      'Tocá Guardar. Vas a ver "Descuento registrado correctamente." y la tabla se actualiza.',
      'Para cambiar un descuento ya cargado, tocá el lápiz de la fila, ajustá el Valor y tocá Guardar.'
    ],
    notas: [
      'Se consulta y se guarda para el mes anterior al que elegiste: si seleccionás marzo, trabajás sobre febrero.',
      'Agregar se habilita recién con APS, año y mes seleccionados.',
      'Al agregar, la lista solo ofrece los costos que todavía no tienen descuento en ese período.',
      'El valor admite hasta 4 decimales.',
      'Si tocás Guardar sin elegir un costo vas a ver "debe seleccionar un descuento!!" y el formulario se cierra sin guardar.'
    ]
  },

  // ── Preguntas frecuentes ─────────────────────────────────────────────────
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué no me deja reversar un período con tarifas integradas?',
    contenido:
      'Si las tarifas certificadas del período ya se integraron con el sistema comercial, la reversión necesita una autorización previa para esa APS y período, registrada en "Autorización Reversiones".',
    sistema: 'VEO-Regulator',
    ruta: '/reversion_auth',
    pasos: [
      'Entrá a "Autorización Reversiones" y registrá la autorización con la misma APS, año y mes que vas a usar al reversar.',
      'Confirmá en "Detallado Autorización" que quedó guardada.',
      'Volvé a "Ejecutar Reversión" y tocá Reversar otra vez.'
    ],
    notas: [
      'El mensaje que vas a ver es "No se pueden realizar la reversion, para el periodo seleccionado ya que las tarifas fueron integradas con el SC".',
      'Si ya hay más de una autorización para la misma APS y período, la validación también bloquea la reversión.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué los informes y reversiones muestran el mes anterior al que elegí?',
    contenido:
      'En Reversiones, Variables PGIRS, Detallado de Costos, Detallado Sub y Aportes, Dashboard y Act. Descuento Costos, el año y mes que elegís es el mes en curso, y el sistema trabaja sobre el mes anterior, que es el último mes cerrado.',
    notas: [
      'Ejemplo: si elegís marzo de 2026, se consulta, guarda o reversa febrero de 2026; si elegís enero, se usa diciembre del año anterior.',
      'En "Ejecutar Reversión" el mensaje de confirmación muestra el período real que se va a reversar.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Qué significan los colores del Informe PGIRS?',
    contenido:
      'En el Informe PGIRS las columnas de meta se ven en azul; los valores medidos se pintan de verde si están dentro de la meta y de rojo si la superan.',
    sistema: 'VEO-Regulator',
    ruta: '/pgirs/resumen',
    notas: [
      'En "Variables PGIRS", "Resumen variables PGIRS" y "Costo de Poda", el naranja marca los registros con tipo de ingreso "MANUAL".'
    ]
  }
];
