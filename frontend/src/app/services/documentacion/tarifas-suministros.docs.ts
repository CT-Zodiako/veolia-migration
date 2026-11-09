import { ArticuloDocumentacion } from './documentacion.model';

/** Documentación: Cálculo de Tarifas y Suministros. */
export const DOCS_TARIFAS_SUMINISTROS: ArticuloDocumentacion[] = [
  // ── Cálculo de Tarifas ──────────────────────────────────────────────
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Verificar, calcular y certificar las tarifas del mes',
    contenido:
      'En Cálculo Tarifas revisás las variables del período, calculás las tarifas del APS y, cuando están listas, las certificás. Todo se hace sobre el mes anterior al que elegís (el mes ya cerrado).',
    sistema: 'VEO-Regulator',
    ruta: '/calculo',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es la pantalla central del cálculo tarifario: desde acá verificás las variables cargadas, lanzás el cálculo de tarifas del APS y certificás el resultado.',
          'El año y mes que elegís funcionan como "mes actual": la verificación, el cálculo, la certificación y las consultas se hacen sobre el mes anterior, que es el mes cerrado.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba, una tarjeta por cada costo del período con su valor y el porcentaje de variación. La tarjeta CLUS se puede tocar para abrir el Detalle CLUS.',
          'Gráficas de toneladas (QRT, Qa y TAFNA), kilómetros (LBL), TRNA, usuarios promedio y tarifas, y debajo una tabla resumen con CFT, CVNA, descuento por antigüedad, distancia, salinidad, período adicional, escenario, TRA, TRBL, TRLU y TRRA.',
          'Si el período tiene información semestral, en lugar de las gráficas aparecen las tablas de resumen de variables del semestre, con el botón "Exportar todo" para descargarlas.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. La pantalla consulta sola los costos, las gráficas y el resumen del mes anterior.',
      'Tocá VERIFICAR. Se abre "VERIFICACION DE VARIABLES" con una pestaña por empresa y las variables agrupadas, con su valor.',
      'Revisá los valores. Si están bien, tocá Aplicar para calcular las tarifas; si no, tocá Cancelar y corregí los cargues antes de seguir.',
      'Esperá el mensaje "Tarifas Calculadas". Las tarjetas y el resumen se actualizan solos.',
      'Cuando el resultado esté validado, tocá CERTIFICAR. Al terminar vas a ver el mensaje "Certificado".'
    ],
    notas: [
      'Antes de calcular, el sistema corre validaciones previas. Si alguna falla, ves un mensaje de error por cada una y el cálculo no se hace.',
      'Si el APS ya tiene tarifas calculadas para el período, aparece "Ya existen tarifas calculadas para el APS y Periodo Seleccionado" y no se vuelve a calcular.',
      'CERTIFICAR solo se habilita cuando hay tarifas calculadas que todavía no se certificaron. Un período certificado no se puede certificar de nuevo ("El período ya se encuentra certificado.").',
      'La certificación queda registrada con tu usuario y la fecha; la podés consultar después en Historial de Certificación.'
    ]
  },
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Consultar el detallado de tarifas de un APS',
    contenido:
      'Detallado Tarifas muestra, para un APS, la tarifa plena y la tarifa con subsidios y contribuciones de cada clase de uso y tipo de tarifa del mes cerrado.',
    sistema: 'VEO-Regulator',
    ruta: '/tarifas',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te deja revisar componente por componente las tarifas calculadas de un APS, por clase de uso, tipo de tarifa y tipo de factura.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Pestaña Plena: Clase Uso, Tipo Tarifa, Tipo Fac, Cargo fijo, Tc, Tbl, Tlu, C. Variable, Trt, Tdt, Ttl, Ta y Plena.',
          'Pestaña Sub & Con: las mismas columnas ya con subsidios y contribuciones aplicados, y la tarifa final en S/C.',
          'Si el período no tiene tarifas, ves "Sin datos para el período seleccionado."'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. La consulta se hace sola apenas los tres están completos.',
      'Cambiá entre las pestañas Plena y Sub & Con según lo que necesites revisar.',
      'Usá los filtros de Clase Uso, Tipo Tarifa o Tipo Fac para acotar las filas.',
      'Si necesitás el dato afuera, tocá Exportar para bajar la tabla como archivo .csv.'
    ],
    notas: [
      'Se consulta el mes anterior al seleccionado (el mes cerrado), igual que en Cálculo Tarifas.',
      'Con Columnas elegís qué columnas ver y con Guardar vista guardás esa configuración para la próxima vez.'
    ]
  },
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Comparar las tarifas de todas las APS',
    contenido:
      'La versión gerencial de Detallado Tarifas trae, en una sola tabla, las tarifas plenas y con subsidios y contribuciones de todas las APS para el mes cerrado.',
    sistema: 'VEO-Regulator',
    ruta: '/tarifas-general',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es una vista consolidada para comparar tarifas entre APS sin tener que consultarlas una por una.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Las mismas pestañas Plena y Sub & Con del detallado por APS, con una columna APS adelante para identificar cada fila.'
        ]
      }
    ],
    pasos: [
      'Entrá a la pantalla: carga sola con el período guardado o, si no hay, con el mes actual.',
      'Si querés otro período, cambiá Año o Mes; la tabla se vuelve a consultar sola.',
      'Filtrá por APS, Clase Uso, Tipo Tarifa o Tipo Fac para comparar lo que te interesa.',
      'Tocá Exportar si necesitás llevar la tabla a un archivo .csv.'
    ],
    notas: [
      'Esta pantalla no tiene selector de APS: siempre trae todas.',
      'Se consulta el mes anterior al seleccionado.'
    ]
  },
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Revisar el detallado de facturación',
    contenido:
      'Detallado Facturación reúne, por APS y mes cerrado, las tarifas con las que se factura, el detalle por componente y un resumen visual de lo que paga cada clase de uso.',
    sistema: 'VEO-Regulator',
    ruta: '/facturacion',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite revisar la información de facturación del período: tarifa plena, tarifa con subsidios y contribuciones, factores de producción y los componentes de cada tarifa.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Cinco pestañas: Facturación, Facturación Electrónica, Det Facturación, Det Facturación CLUS y Det Facturación DINC. Cada pestaña se consulta recién cuando la abrís.',
          'En la pestaña Facturación podés desplegar "Resumen de tarifas": tarjetas con la tarifa plena del estrato 4, lo que pagan los estratos 1 y 6 frente a la plena y la brecha entre ambos, toneladas por suscriptor y tres gráficas (tarifa plena y lo que paga cada clase, de qué se compone la tarifa plena y lo que paga según el tipo de tarifa).',
          'El resumen se filtra con Tipo de factura y Tipo de tarifa, y se calcula con las mismas filas que muestra la tabla.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. Se consulta sola la pestaña que tengas abierta.',
      'Pasá a la pestaña que necesites; si todavía no se consultó, se carga en ese momento.',
      'En Facturación, tocá "Resumen de tarifas" para ver tarjetas y gráficas, y elegí Tipo de factura y Tipo de tarifa.',
      'Usá Exportar en cualquier tabla para bajarla como archivo .csv.'
    ],
    notas: [
      'Se consulta el mes anterior al seleccionado.',
      'Algunas pestañas, como Facturación Electrónica, pueden tardar en cargar: esperá a que termine antes de cambiar el período.',
      'La pantalla recuerda si dejaste el resumen abierto o cerrado.'
    ]
  },
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Consultar el historial de certificación de tarifas',
    contenido:
      'Historial de Certificación lista qué APS certificaron sus tarifas en el mes cerrado, cuándo y quién lo hizo.',
    sistema: 'VEO-Regulator',
    ruta: '/histCertificacion',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Sirve para controlar el avance del cierre: ver qué APS ya certificaron y cuáles faltan.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una fila por APS certificada con Código APS, APS, Fecha Certificación, Fecha Integración y el Correo de quien certificó. Las fechas que no existen se muestran como N/A.'
        ]
      }
    ],
    pasos: [
      'Elegí Año y Mes. La tabla se consulta sola.',
      'Filtrá por APS si buscás una en particular.',
      'Tocá Exportar para bajar el listado como archivo .csv.'
    ],
    notas: [
      'No hay selector de APS: trae todas las APS del período.',
      'Se consulta el mes anterior al seleccionado. Si no hay certificaciones, la tabla queda vacía.'
    ]
  },
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Consultar el historial de productividad',
    contenido:
      'Historial de Productividad muestra, para el mes cerrado, los valores de productividad registrados por APS, empresa y costo, con el correo de quien los registró.',
    sistema: 'VEO-Regulator',
    ruta: '/histProductividad',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te deja revisar qué productividad se registró en cada APS y empresa antes o después del cálculo de tarifas.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Columnas Código APS, APS, Empresa, Costo, Valor (con 5 decimales) y Correo.'
        ]
      }
    ],
    pasos: [
      'Elegí Año y Mes. La tabla se consulta sola.',
      'Filtrá por APS o Empresa para encontrar lo que buscás.',
      'Tocá Exportar para bajar la tabla como archivo .csv.'
    ],
    notas: [
      'Trae todas las APS del período; no hay selector de APS.',
      'Se consulta el mes anterior al seleccionado. Un valor en cero o vacío se muestra en blanco.'
    ]
  },

  // ── Suministros ─────────────────────────────────────────────────────
  {
    categoria: 'Suministros',
    titulo: 'Registrar subsidios y contribuciones por clase de uso',
    contenido:
      'En Subsidios y Contribuciones cargás o corregís el porcentaje de subsidio o contribución de cada clase de uso para un APS y mes.',
    sistema: 'VEO-Regulator',
    ruta: '/subcon',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Define cuánto se descuenta (subsidio) o se suma (contribución) a la tarifa de cada estrato y de las clases comercial, industrial y oficial.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla agrupada en Residencial y No residencial con cada clase de uso y su valor en porcentaje, marcado como Subsidio (negativo), Contribución (positivo) o Sin ajuste.',
          'Al pie, un resumen con cuántas clases tienen subsidio, contribución o ningún ajuste.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. Los porcentajes se consultan solos.',
      'Si el período no tiene valores, tocá Agregar; si ya los tiene, tocá Editar.',
      'En el diálogo completá el valor de cada una de las nueve clases (estratos 1 a 6, comercial, industrial y oficial).',
      'Tocá Guardar y confirmá. Vas a ver "Creada Correctamente" o "Modificado Correctamente".'
    ],
    notas: [
      'El valor se carga como fracción: por ejemplo, -0,7 es un subsidio del 70 % y 0,5 es una contribución del 50 %.',
      'Las nueve clases se guardan juntas; una clase que dejás en blanco queda sin valor.',
      'Se consulta y se guarda sobre el mes anterior al seleccionado.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Cargar y corregir los índices CRA del mes',
    contenido:
      'En Índices CRA registrás los valores de IPC, SMLV, IPCC e IOEXP de un período; aplican a todos los APS.',
    sistema: 'VEO-Regulator',
    ruta: '/cra',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Guarda los índices económicos del mes que usa el cálculo tarifario. Como aplican a todos los APS, la pantalla no tiene selector de APS.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'La tabla "Índices del período" con Tipo Índice, Valor y Acciones. Los valores se ven completos, sin redondeo, con coma decimal y punto de miles.',
          'Al pie se indica cuántos de los 4 índices están registrados.'
        ]
      }
    ],
    pasos: [
      'Elegí Año y Mes. Los índices se consultan solos.',
      'Si el período no tiene índices, tocá Agregar, completá IPC, SMLV, IPCC e IOEXP y tocá Guardar.',
      'Para corregir un índice existente, tocá el lápiz de su fila, cambiá el valor y tocá el tilde para guardar. Confirmá en el diálogo.',
      'Si te arrepentiste de una edición, tocá la cruz para cancelar.'
    ],
    notas: [
      'Agregar se deshabilita cuando el período ya tiene índices: en ese caso usá Editar en la fila.',
      'Un índice que dejás vacío al agregar se guarda sin valor.',
      'Se consulta y se guarda sobre el mes anterior al seleccionado.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Registrar el ajuste de productividad de un APS',
    contenido:
      'Ajuste Productividad guarda un único valor de productividad por APS y mes; si no existe lo agregás y si ya existe lo editás.',
    sistema: 'VEO-Regulator',
    ruta: '/productividad',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Registra el ajuste de productividad del período para el APS elegido.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una fila con el Período, el Valor (hasta 6 decimales) y las acciones. Si todavía no hay valor, aparece "Sin valor · Pendiente".'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. El valor se consulta solo.',
      'Si aparece "Sin valor", tocá el botón + de la fila; si ya hay un valor, tocá el lápiz.',
      'Escribí el valor y tocá el tilde para guardar.',
      'Confirmá en el diálogo. Vas a ver "Valor guardado correctamente."'
    ],
    notas: [
      'Hay un solo valor por APS y mes.',
      'Si la consulta falla, la pantalla se comporta como si no hubiera valor, así igual podés agregarlo.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Consultar los descuentos aplicados a cada costo',
    contenido:
      'Descuentos en Costos muestra, para un APS y mes cerrado, el descuento que se aplica a cada costo. Es una pantalla de consulta.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/descuento-costos',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te deja verificar qué descuentos tiene cada costo antes de calcular o revisar tarifas.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'La tabla "Descuentos por costo" con COSTO (código y nombre, por ejemplo CRT · Recolección y transporte) y DESCUENTO. Un 0 significa sin descuento.',
          'Al pie, un resumen con cuántos costos tienen descuento.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. La tabla se consulta sola.',
      'Revisá el valor de cada costo. Usá Exportar si necesitás bajar la tabla.'
    ],
    notas: [
      'Desde acá no se agregan ni editan descuentos: eso se hace en Act. Descuento Costos, dentro de los informes gerenciales.',
      'Se consulta el mes anterior al seleccionado.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Activar el cobro de aprovechamiento sin QA',
    contenido:
      'Activar Aprovechamiento define si en un período se cobra aprovechamiento aunque el APS no tenga QA.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/aprovechamiento',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Normalmente el aprovechamiento solo se cobra cuando el período tiene QA. Con este interruptor podés habilitar el cobro aunque no lo tenga.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'La tarjeta "Cobro de aprovechamiento" con el estado aplicado (Actual: Activado o Desactivado), el interruptor y un aviso cuando hay un cambio sin aplicar.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. El estado actual se consulta solo.',
      'Mové el interruptor a Activado o Desactivado.',
      'Tocá Aceptar y confirmá. Vas a ver "Modificado Correctamente".'
    ],
    notas: [
      'Mover el interruptor no guarda nada: el cambio solo se aplica al tocar Aceptar.',
      'Aceptar queda deshabilitado mientras no haya cambios.',
      'Se consulta y se guarda sobre el mes anterior al seleccionado.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Registrar el costo techo de poda por empresa',
    contenido:
      'Costo de Poda muestra, por empresa, el costo techo reportado al SUI y el costo que se factura en el período, y te deja registrar o corregir el costo techo.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/costo-poda',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Registra el costo techo de poda de cada empresa del APS para el período.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'La tabla "Costos de poda por empresa" con EMPRESA, COSTO TECHO SUI, COSTO FACTURACION y TIPO INGRESO (Manual o Automático), en pesos, con una fila Total cuando hay más de una empresa.',
          'El costo de facturación se resalta cuando supera el costo techo.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. Los costos se consultan solos.',
      'Si el período no tiene costos, tocá Nuevo, completá el valor de cada empresa y tocá Guardar.',
      'Para corregir una empresa, tocá el lápiz de su fila, cambiá el costo techo y tocá el tilde. Confirmá en el diálogo.'
    ],
    notas: [
      'Si el APS ya tiene tarifas calculadas para el período, la pantalla te avisa y deshabilita Nuevo y Editar.',
      'Al registrar con Nuevo, una empresa que dejás vacía se guarda en 0.',
      'Se consulta y se guarda sobre el mes anterior al seleccionado.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Guardar el cargue de productividad del mes',
    contenido:
      'Cargue Productividad trae los valores de productividad por APS y empresa (propios y de terceros) de un mes y te deja guardarlos.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/cargue-productividad',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Consolida la productividad de todos los APS para el período y la guarda de una sola vez.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Dos pestañas, Propios y Terceros, con COD APS, APS, COD EMPRESA, EMPRESA, AÑO, MES y los costos CCS, CBLS, CLUS, CRT, CDF y CTL.',
          'Con Pivotar podés agrupar por APS, empresa, año o mes y elegir una función de agregación; Restaurar vuelve a la tabla original.'
        ]
      }
    ],
    pasos: [
      'Elegí Año y Mes. Los datos se cargan solos y vas a ver "Consulta realizada correctamente".',
      'Revisá las pestañas Propios y Terceros.',
      'Tocá Guardar y confirmá. Al terminar vas a ver "Cargue Productividad guardado correctamente".'
    ],
    notas: [
      'Guardar reemplaza cualquier registro existente para el mismo período.',
      'Se consulta el mes anterior al seleccionado.',
      'Si cambiás el período mientras carga, se descarta lo anterior para que no guardes datos de otro mes.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Verificar la información cargada de un APS',
    contenido:
      'Verificación muestra los resúmenes por empresa, APS y relleno de lo cargado para un APS y mes, y el promedio del semestre anterior.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/verificacion',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te ayuda a controlar que la información cargada del período sea coherente antes de calcular, comparándola con el promedio del semestre anterior.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Tres pestañas: Resumen Empresa (por ejemplo CBLJ, LBLJ, N, M3AGUA, QRTJ), Resumen APS (QRTZ, QBL, QLU, QA, TAFNA, entre otras) y Resumen Relleno (QRS, VL, ESCENARIO, C, entre otras). Los valores se muestran con 4 decimales.',
          'El bloque "Promedio Semestre Anterior" agrupa las variables en Toneladas, Suscriptores, Otros y Costos. Lo podés plegar y la pantalla recuerda tu elección.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. Las tres pestañas se consultan solas.',
      'Revisá cada pestaña y usá Exportar si necesitás bajar alguna tabla.',
      'Tocá "Consultar promedio semestre anterior" para ver el promedio de referencia. Con Actualizar lo volvés a consultar.'
    ],
    notas: [
      'A diferencia de la mayoría de las pantallas de suministros, esta consulta el mismo mes que elegís, no el anterior.',
      'El promedio solo se consulta con el botón y se limpia cuando cambiás APS, Año o Mes.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Hacer el cargue mensual de información',
    contenido:
      'Cargue Mensual reúne los cargues del mes de un APS (información propia, de competidor, de usuarios y de terceros) y la certificación de esa información.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/cargue-mensual',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es donde se carga la información operativa y comercial del mes que después usa el cálculo de tarifas.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Cuatro pestañas: Inf. Propia, Inf. Competidor e Inf. Usuarios se cargan con un archivo .csv; Inf. Terceros se completa a mano con CDF, CTL e Incen. CDF.',
          'Cada cargue con archivo tiene tres pasos: bajar la plantilla, seleccionar el archivo (se valida al instante) y revisar y cargar, donde ves cuántas filas tiene y en qué período se va a guardar.',
          'Inf. Usuarios muestra además un resumen por variables (N, ND, NA, TAFNA) y por estratos antes de guardar.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Mes. El sistema verifica si ya hay tarifas calculadas para el período.',
      'En Inf. Propia o Inf. Competidor, elegí primero la Empresa.',
      'Si no tenés el formato, bajá la plantilla del paso 1. Después seleccioná o arrastrá tu archivo .csv.',
      'Revisá la vista previa y tocá el botón Guardar de la pestaña. Confirmá en el diálogo.',
      'En Inf. Terceros completá CDF, CTL e Incen. CDF y tocá "Guardar Información de Terceros".',
      'Con todo cargado, tocá CERTIFICAR y confirmá. Al final se abre el resultado de la certificación con cada variable, su valor y el valor PGIRS.'
    ],
    notas: [
      'El archivo tiene que corresponder al APS y al año y mes que elegiste (y a la empresa, en Inf. Propia e Inf. Competidor); si no, ves por ejemplo "El APS Seleccionado no concuerda con el APS del archivo!".',
      'Los datos se guardan en el mes anterior al seleccionado: fijate en "Se guarda en" antes de guardar.',
      'Si el APS ya tiene tarifas calculadas para el período, ves el aviso correspondiente, las pestañas de cargue no aparecen y CERTIFICAR queda deshabilitado.',
      'Solo se aceptan archivos .csv con encabezados y al menos una fila de datos.'
    ]
  },
  {
    categoria: 'Suministros',
    titulo: 'Hacer el cargue semestral de información',
    contenido:
      'Cargue Semestral reúne los cargues de un semestre (información propia, de competidor, de usuarios y rural) de un APS y su certificación.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/cargue-semestral',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Carga la información que se reporta por semestre: Semestre 1 (enero a junio) o Semestre 2 (julio a diciembre).'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Pestañas Inf. Propia, Inf. Competidor e Inf. Usuarios, que se cargan con archivo .csv en tres pasos (plantilla, selección y revisión). Inf. Rural, con el campo QRT Rural, aparece solo cuando corresponde al APS y semestre elegidos.',
          'Al certificar se abre "Resultado Certificación Semestral" con los barridos, su valor y el valor PGIRS.'
        ]
      }
    ],
    pasos: [
      'Elegí APS, Año y Semestre.',
      'En Inf. Propia o Inf. Competidor, elegí primero la Empresa.',
      'Bajá la plantilla si la necesitás, seleccioná tu archivo .csv, revisá la vista previa y tocá Guardar. Confirmá en el diálogo.',
      'Si aparece Inf. Rural, completá QRT Rural y tocá "Guardar Información de Rural".',
      'Tocá CERTIFICAR y confirmá para certificar las variables del semestre.'
    ],
    notas: [
      'El archivo tiene que corresponder al APS y al año elegidos (y a la empresa, en Inf. Propia e Inf. Competidor), y todos sus meses tienen que caer dentro del semestre; si no, la pantalla te muestra el error y no deja guardar.',
      'Si el APS ya tiene tarifas calculadas para el período, CERTIFICAR queda deshabilitado, aunque las pestañas de cargue siguen disponibles.',
      'Si la certificación no se completa, ves "No se pudieron certificar las variables."'
    ]
  },

  // ── Preguntas frecuentes ────────────────────────────────────────────
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué veo los datos del mes anterior al que elegí?',
    contenido:
      'En Cálculo Tarifas, los detallados y la mayoría de las pantallas de suministros, el mes que elegís es el "mes actual" y se trabaja sobre el mes anterior, que es el mes ya cerrado. Verificación es la excepción: consulta el mismo mes que elegís.',
    sistema: 'VEO-Regulator',
    notas: [
      'En los cargues mensuales, el paso "Revisar y cargar" muestra en "Se guarda en" el período exacto donde quedan los datos.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué no puedo cargar ni editar datos de un período?',
    contenido:
      'Cuando el APS ya tiene tarifas calculadas para el período, el sistema bloquea los cambios que las afectarían: Cargue Mensual oculta los cargues y deshabilita CERTIFICAR, y Costo de Poda deshabilita Nuevo y Editar.',
    sistema: 'VEO-Regulator',
    notas: [
      'Revisá el aviso "Ya existen tarifas calculadas para el APS y período seleccionado." y confirmá que elegiste el APS y el período correctos.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Qué hago si el Cargue Mensual dice "No se completó la certificación"?',
    contenido:
      'Es una advertencia, no un error: muchas veces el APS necesita el informe de Terceros. Si aplica, cargá Inf. Terceros y volvé a certificar; si no aplica, revisá que los demás informes del período estén completos.',
    sistema: 'VEO-Regulator',
    ruta: '/suministros/cargue-mensual'
  }
];
