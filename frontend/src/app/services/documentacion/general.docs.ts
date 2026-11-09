import { ArticuloDocumentacion } from './documentacion.model';

/** Documentación: Primeros pasos, Configuración y preguntas frecuentes generales. */
export const DOCS_GENERAL: ArticuloDocumentacion[] = [
  // ---------------------------------------------------------------- Primeros pasos
  {
    categoria: 'Primeros pasos',
    titulo: 'Ingresar y elegir el sistema',
    contenido: 'Entrá con tu correo y contraseña, y después elegí el sistema con el que querés trabajar: VEO-Regulator, Reliquidaciones o SUI 853, según los que tengas asignados.',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'La pantalla de ingreso valida tu usuario y te muestra solo los sistemas a los que tenés acceso. Cada sistema tiene su propio menú y sus propios permisos.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Los campos "Correo electrónico" y "Contraseña" y el botón "Ingresar". Cuando las credenciales son correctas se abre la ventana "Seleccioná el sistema" con un botón por cada sistema disponible.'
        ]
      }
    ],
    pasos: [
      'Escribí tu correo electrónico y tu contraseña.',
      'Tocá "Ingresar" y esperá el mensaje "Validando credenciales...".',
      'En la ventana "Seleccioná el sistema", elegí el sistema al que querés entrar.',
      'Vas a llegar a Inicio, con el menú lateral del sistema elegido.'
    ],
    notas: [
      'Si el correo o la contraseña no coinciden, vas a ver "Usuario o Pass Incorrecto".',
      'Si tu usuario está inactivo, vas a ver "Usuario no existe o inactivo"; pedile a un administrador que lo active.',
      'Si no tenés ningún sistema asignado, vas a ver "No tiene sistemas activos asignados"; un administrador te lo asigna desde Configuración > Usuarios, pestaña Sistemas.',
      'Para salir, tocá tu nombre arriba a la derecha y elegí "Salir".',
      'Si tu sesión vence mientras trabajás, la aplicación te devuelve a esta pantalla para que vuelvas a ingresar.'
    ]
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Moverte por el menú lateral',
    contenido: 'El menú de la izquierda agrupa las pantallas a las que tenés permiso, organizadas en secciones como Operación, Informes, Planeación y Sistema.',
    secciones: [
      {
        titulo: 'Cómo está organizado',
        parrafos: [
          'Arriba aparece Inicio como acceso directo. Debajo, las opciones se agrupan por módulo (por ejemplo Suministros, Reversiones, Informes o Configuración) y los módulos se ordenan en secciones: Operación, Informes, Planeación y Sistema.',
          'Solo ves las opciones que tenés habilitadas en el sistema en el que ingresaste. Si te falta una, pedile a un administrador que te dé el permiso.'
        ]
      },
      {
        titulo: 'Dónde estás parado',
        parrafos: [
          'La opción abierta queda resaltada y su grupo se despliega solo. En la barra superior ves el título de la pantalla y, arriba de él, el nombre del grupo al que pertenece.'
        ]
      }
    ],
    pasos: [
      'Tocá el nombre de un grupo para desplegar o plegar sus opciones.',
      'Tocá una opción para abrir la pantalla.',
      'Si necesitás más espacio, tocá el botón de flechas junto al logo para contraer el menú; tocalo de nuevo para expandirlo.'
    ],
    notas: [
      'El menú no tiene buscador: para llegar rápido a las pantallas que más usás, agregalas como accesos en Inicio.',
      'La aplicación recuerda en tu navegador si dejaste el menú contraído o expandido.'
    ]
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Cambiar de sistema sin cerrar sesión',
    contenido: 'Si tenés acceso a más de un sistema, podés pasar de uno a otro desde el selector de la barra superior sin volver a ingresar tu contraseña.',
    pasos: [
      'Tocá el botón con el nombre del sistema actual, en la barra superior.',
      'Elegí el sistema al que querés pasar.',
      'Esperá a que termine el cambio: la aplicación te lleva a Inicio y carga el menú del nuevo sistema.'
    ],
    notas: [
      'El selector solo aparece si tenés asignado más de un sistema.',
      'Tus accesos de Inicio y los últimos APS, año y mes que elegiste se guardan por separado para cada sistema.',
      'Si el cambio falla, seguís en el sistema en el que estabas.'
    ]
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Cambiar entre modo claro y oscuro',
    contenido: 'El botón de luna o sol en la barra superior alterna entre modo claro y modo oscuro, y la preferencia queda guardada en tu navegador.',
    pasos: [
      'Tocá el ícono de luna (para pasar a modo oscuro) o de sol (para volver a modo claro), en la barra superior.'
    ],
    notas: [
      'La preferencia se guarda en el navegador que estás usando: si entrás desde otro equipo o navegador, vas a tener que elegirla de nuevo.',
      'Cerrar sesión no borra tu preferencia de tema.'
    ]
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Usar Inicio y personalizar tus accesos',
    contenido: 'Inicio muestra tarjetas de acceso directo a las pantallas que más usás; con "Personalizar" elegís cuáles aparecen y podés reordenarlas arrastrándolas.',
    ruta: '/',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es la pantalla a la que llegás al ingresar o al cambiar de sistema. Te deja armar tu propio tablero de accesos a las pantallas del menú.'
        ]
      },
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          '"Mis accesos": una tarjeta por cada pantalla elegida, con el nombre de la opción y el grupo del menú al que pertenece. Al final está la tarjeta "Agregar acceso".',
          'Más abajo, el recuadro "¿Necesitas ayuda con algo más?" con el botón "Ver Documentación".'
        ]
      }
    ],
    pasos: [
      'Tocá "Personalizar" (o la tarjeta "Agregar acceso") para abrir el panel "Personalizar accesos".',
      'Marcá las páginas que querés ver en Inicio. Con "Todas" y "Ninguna" marcás o desmarcás todo de una vez.',
      'Tocá "Guardar" para aplicar los cambios, o "Cancelar" para descartarlos.',
      'Para cambiar el orden, arrastrá una tarjeta y soltala en el lugar que quieras.',
      'Tocá una tarjeta para abrir esa pantalla.'
    ],
    notas: [
      'Solo podés elegir pantallas a las que tenés permiso en el sistema actual.',
      'Tu selección y el orden se guardan en tu navegador, por usuario y por sistema.',
      'Si nunca personalizaste Inicio, se muestran unos accesos por defecto según tus permisos.'
    ]
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Elegir APS, año y mes en las consultas',
    contenido: 'Los selectores de APS, Año y Mes recuerdan tu última elección, así no tenés que volver a elegirla en cada pantalla.',
    secciones: [
      {
        titulo: 'Cómo funcionan',
        parrafos: [
          'Muchas pantallas te piden APS, Año y Mes antes de consultar. Cuando elegís un valor en cualquiera de ellas, la próxima pantalla que abras arranca con esa misma elección.',
          'La lista de APS muestra solo los APS que tenés asignados, y tiene un buscador para encontrarlos rápido. El año se elige de una lista y el mes por su nombre.'
        ]
      }
    ],
    pasos: [
      'Abrí la lista de APS y escribí parte del nombre para filtrarla.',
      'Elegí el año y el mes.',
      'Según la pantalla, la consulta se dispara sola al completar los parámetros o con el botón de consulta.'
    ],
    notas: [
      'La elección se guarda en tu navegador, por usuario y por sistema.',
      'Si el APS que tenías guardado ya no está asignado a tu usuario, el selector queda vacío para que elijas otro.',
      'Los selectores que están dentro de un formulario de alta o edición no cambian el APS recordado.',
      'Si no ves un APS que necesitás, pedile a un administrador que te lo asigne desde Configuración > Usuarios, pestaña APS.'
    ]
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Trabajar con las tablas: columnas, vistas y exportación',
    contenido: 'Las tablas de consulta te dejan ordenar, filtrar, mover, ocultar y fijar columnas, guardar vistas, cambiar la densidad, verlas en pantalla completa y exportarlas a CSV.',
    secciones: [
      {
        titulo: 'Qué podés hacer',
        parrafos: [
          'Ordenar: tocá el título de una columna para ordenar por ella.',
          'Filtrar: escribí en el campo que aparece debajo del título de la columna (solo en las columnas que lo permiten).',
          'Mover: arrastrá el título de una columna y soltalo sobre otra.',
          'Ocultar y mostrar: tocá la cruz del título para ocultar una columna, o elegí cuáles ver desde "Ver Columnas". "Restaurar columnas" vuelve a la configuración original.',
          'Fijar: marcá la casilla del título para que la columna quede fija a la izquierda mientras te desplazás.',
          'Densidad: elegí entre "Normal" y "Compacta" para ver más o menos filas a la vez.',
          'Pantalla completa: tocá "Pantalla completa" para que la tabla ocupe toda la ventana; mientras tanto se usa la densidad compacta. "Salir de pantalla completa" vuelve a como estaba.'
        ]
      },
      {
        titulo: 'Vistas guardadas',
        parrafos: [
          'Una vista guarda qué columnas ves y en qué orden. Tocá "Guardar vista", ponele un nombre (por ejemplo "Solo lo esencial") y después aplicala desde "Vistas guardadas". Con el ícono de papelera eliminás la vista elegida.'
        ]
      }
    ],
    pasos: [
      'Tocá "Exportar".',
      'Escribí el nombre del archivo (se guarda con extensión .csv).',
      'Marcá las columnas a exportar; con "Todas" y "Ninguna" las marcás o desmarcás de una vez.',
      'Tocá "Exportar" para descargar el archivo.'
    ],
    notas: [
      'Las vistas guardadas quedan en tu navegador: no las ven otros usuarios ni aparecen en otro equipo.',
      'Algunas pantallas arrancan con ciertas columnas ya fijadas; podés desfijarlas igual que cualquier otra.'
    ]
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Pedir ayuda: documentación y soporte',
    contenido: 'El botón redondo de ayuda, abajo a la derecha de cualquier pantalla, te lleva a este Centro de documentación o abre las opciones de Soporte Directo.',
    pasos: [
      'Tocá el botón de ayuda (el salvavidas) abajo a la derecha.',
      'Elegí "Ver Documentación" para abrir el Centro de documentación, o "Soporte Directo" para ver los canales de soporte.',
      'En el Centro de documentación, buscá por palabra clave o entrá a un módulo; desde cada artículo podés ir directo a la pantalla con "Ir a la pantalla".'
    ],
    notas: [
      'También podés abrir la documentación desde el botón "Ver Documentación" de Inicio.',
      'Los canales de Soporte Directo (correo, teléfono y chat) todavía no están conectados: al elegirlos vas a ver un aviso de que es una simulación.'
    ]
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Cambiar tu contraseña',
    contenido: 'Desde el menú de tu perfil podés cambiar tu contraseña ingresando la actual y la nueva dos veces; al terminar, la aplicación te pide volver a ingresar.',
    ruta: '/cambiar-clave',
    pasos: [
      'Tocá tu nombre, arriba a la derecha, y elegí "Cambiar Clave".',
      'Completá "Contraseña Actual", "Nueva Contraseña" y "Confirmar Nueva Contraseña".',
      'Tocá "Cambiar Contraseña".',
      'Cuando veas "Clave cambiada", la aplicación cierra tu sesión a los pocos segundos y te lleva a la pantalla de ingreso: entrá con la contraseña nueva.'
    ],
    notas: [
      'Los tres campos son obligatorios, y la nueva contraseña y su confirmación tienen que ser iguales.',
      'Si la contraseña actual no es correcta, vas a ver "Clave Actual Erronea" y tenés que escribirla de nuevo.'
    ]
  },

  // ---------------------------------------------------------------- Configuración
  {
    categoria: 'Configuración',
    titulo: 'Crear y editar usuarios',
    contenido: 'En Gestión de Usuarios das de alta usuarios, editás sus datos, los activás o desactivás y les reiniciás la contraseña.',
    sistema: 'VEO-Regulator',
    ruta: '/usuarios',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Es la pantalla de administración de usuarios. Tiene cuatro pestañas: Usuarios (los datos de cada persona), APS, Sistemas y Permisos (qué puede ver y usar cada uno).'
        ]
      },
      {
        titulo: 'Qué muestra la pestaña Usuarios',
        parrafos: [
          'Una tabla con ID, Apellido, Nombre, Correo y Estado, ordenada por apellido. Podés buscar por apellido, nombre o correo en los campos "Buscar" de cada columna.',
          'En Acciones, el lápiz abre la edición y la llave reinicia la contraseña.'
        ]
      }
    ],
    pasos: [
      'Para crear un usuario, tocá "Nuevo Usuario".',
      'Completá Nombre, Apellido, Correo, Contraseña, Confirmar Contraseña y Estado, y tocá "Guardar".',
      'Para editar, tocá el lápiz de la fila, cambiá los datos y tocá "Guardar". Al editar no se cambia la contraseña.',
      'Para activar o desactivar un usuario, tocá el botón "Activo" o "Inactivo" de su fila.',
      'Para reiniciar la contraseña, tocá la llave y confirmá con "Reiniciar". Anotá la nueva contraseña que aparece en la ventana "Reinicio de clave" y pasásela al usuario.'
    ],
    notas: [
      'Nombre, Apellido y Correo son obligatorios; al crear, la contraseña y su confirmación también, y tienen que ser iguales.',
      'No se puede repetir un correo: si ya existe vas a ver "El correo ya se encuentra registrado".',
      'El cambio de estado se aplica apenas tocás el botón, sin pedir confirmación. Un usuario inactivo no puede ingresar.',
      'La contraseña reiniciada se muestra una sola vez; al cerrar la ventana ya no se puede volver a ver. Recomendale al usuario cambiarla desde "Cambiar Clave".',
      'Un usuario nuevo no ve nada hasta que le asignes sistemas, permisos y APS en las otras pestañas.'
    ]
  },
  {
    categoria: 'Configuración',
    titulo: 'Asignar APS a un usuario',
    contenido: 'En la pestaña APS de Gestión de Usuarios elegís qué APS puede consultar cada usuario; son los que después le aparecen en los selectores de APS.',
    sistema: 'VEO-Regulator',
    ruta: '/usuarios',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'A la izquierda, la lista de usuarios con un buscador por nombre o correo. A la derecha, todos los APS con una casilla cada uno y un resumen de cuántos tiene asignados el usuario.',
          'Los APS que cambiaste y todavía no guardaste se marcan como "cambio", y abajo ves cuántos cambios tenés sin guardar.'
        ]
      }
    ],
    pasos: [
      'Entrá a Configuración > Usuarios y abrí la pestaña "APS".',
      'Elegí el usuario en la lista de la izquierda.',
      'Marcá o desmarcá los APS. Podés usar "Buscar APS", "Seleccionar todos", "Ninguno" y "Solo asignados" para trabajar más rápido.',
      'Tocá "Guardar APS". Si te equivocaste, "Descartar" vuelve a lo que estaba guardado.'
    ],
    notas: [
      '"Seleccionar todos" y "Ninguno" solo afectan a los APS que se ven con el filtro actual.',
      'Al terminar vas a ver "APS Asignadas Correctamente".'
    ]
  },
  {
    categoria: 'Configuración',
    titulo: 'Dar acceso a sistemas a un usuario',
    contenido: 'En la pestaña Sistemas de Gestión de Usuarios encendés los sistemas (VEO-Regulator, Reliquidaciones, SUI 853) a los que puede entrar cada usuario.',
    sistema: 'VEO-Regulator',
    ruta: '/usuarios',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'A la izquierda, la lista de usuarios con buscador. A la derecha, una tarjeta por sistema con un interruptor; las tarjetas encendidas indican cuántas opciones con permiso tiene el usuario en ese sistema, y las apagadas dicen "Sin acceso".'
        ]
      }
    ],
    pasos: [
      'Entrá a Configuración > Usuarios y abrí la pestaña "Sistemas".',
      'Elegí el usuario en la lista de la izquierda.',
      'Encendé o apagá el interruptor de cada sistema.',
      'Tocá "Guardar sistemas". "Descartar" vuelve a lo que estaba guardado.'
    ],
    notas: [
      'Al quitar un sistema, el usuario deja de verlo al ingresar y en el selector de sistema.',
      'Dar acceso a un sistema no alcanza: después configurá qué opciones del menú puede usar en la pestaña "Permisos".',
      'Solo aparecen los usuarios que tienen correo cargado.',
      'Al terminar vas a ver "Sistemas Asignados Correctamente".'
    ]
  },
  {
    categoria: 'Configuración',
    titulo: 'Configurar los permisos de menú de un usuario',
    contenido: 'En la pestaña Permisos de Gestión de Usuarios elegís, sistema por sistema, qué opciones del menú puede ver y usar cada usuario.',
    sistema: 'VEO-Regulator',
    ruta: '/usuarios',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'A la izquierda, la lista de usuarios con buscador. A la derecha, un botón por cada sistema asignado al usuario, con cuántas opciones tiene habilitadas sobre el total.',
          'Debajo, las opciones del sistema elegido agrupadas por módulo del menú; las opciones sueltas aparecen en el grupo "General". Cada opción tiene un interruptor y cada grupo una casilla para marcarlo entero.'
        ]
      }
    ],
    pasos: [
      'Entrá a Configuración > Usuarios y abrí la pestaña "Permisos".',
      'Elegí el usuario en la lista de la izquierda.',
      'Elegí el sistema en los botones de arriba.',
      'Encendé o apagá cada opción, marcá un grupo entero con su casilla, o usá "Marcar todos" / "Desmarcar todos" para todo el sistema.',
      'Tocá "Guardar permisos". "Descartar" vuelve a lo que estaba guardado.'
    ],
    notas: [
      'Si el usuario no tiene sistemas asignados, primero asignáselos en la pestaña "Sistemas".',
      'Al guardar se graban los permisos de todos los sistemas del usuario, no solo del que estás viendo.',
      'El usuario ve el menú actualizado la próxima vez que ingresa, recarga la página o cambia de sistema.',
      'Al terminar vas a ver "Opciones Asignadas Correctamente".'
    ]
  },
  {
    categoria: 'Configuración',
    titulo: 'Administrar las APS',
    contenido: 'En Configuración APS creás, editás, activás o desactivás las áreas de prestación del servicio (APS) y definís su resolución, ID SUI y características.',
    sistema: 'VEO-Regulator',
    ruta: '/aps',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Arriba, cuatro indicadores: Total APS, Activos, Inactivos y Con IAT.',
          'Debajo, una tabla con ID, Nombre, Resolución, Propio, Solo relleno, Estado, IAT e ID SUI, ordenada por nombre y con un buscador en la columna Nombre.'
        ]
      }
    ],
    pasos: [
      'Para crear una APS, tocá "Nueva APS"; para editar, tocá el lápiz de la fila.',
      'Completá Nombre e ID SUI, y elegí la Resolución (720 o 351).',
      'Marcá lo que corresponda: Propio, Solo relleno, Activo e IAT.',
      'Tocá "Guardar".',
      'Para activar o desactivar una APS, tocá el botón "Activo" o "Inactivo" de su fila.'
    ],
    notas: [
      'El nombre es obligatorio y admite hasta 30 caracteres. La resolución arranca en 720.',
      'Los indicadores se calculan sobre lo que muestra la tabla: si filtrás por nombre, cuentan solo esas APS.',
      'La papelera no borra la APS: la deja inactiva, y sigue apareciendo en la tabla como "Inactivo".',
      'Una APS nueva no le aparece a nadie hasta que se la asignes a los usuarios en Configuración > Usuarios, pestaña APS.'
    ]
  },
  {
    categoria: 'Configuración',
    titulo: 'Administrar las empresas',
    contenido: 'En Configuración Empresas creás, editás, activás o desactivás las empresas y cargás su NUAP.',
    sistema: 'VEO-Regulator',
    ruta: '/empresas',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla con ID, Nombre, Estado, Propia y NUAP, ordenada por nombre y con un buscador en la columna Nombre.'
        ]
      }
    ],
    pasos: [
      'Para crear una empresa, tocá "Nueva Empresa"; para editar, tocá el lápiz de la fila.',
      'Completá el Nombre y, si corresponde, el NUAP.',
      'Marcá "Activa" y "Propia" según corresponda.',
      'Tocá "Guardar".',
      'Para activar o desactivar una empresa, tocá el botón "Activa" o "Inactiva" de su fila.'
    ],
    notas: [
      'El nombre es obligatorio; la primera letra se guarda en mayúscula.',
      'Si dejás el NUAP vacío, se guarda como 0.',
      'La papelera pide confirmación y no borra la empresa: la deja inactiva, y sigue apareciendo en la tabla como "Inactiva".'
    ]
  },
  {
    categoria: 'Configuración',
    titulo: 'Administrar los rellenos sanitarios',
    contenido: 'En Configuración de Rellenos creás, editás, activás o desactivás los rellenos sanitarios y cargás su descripción y NUSD.',
    sistema: 'VEO-Regulator',
    ruta: '/rellenos',
    secciones: [
      {
        titulo: 'Qué muestra la pantalla',
        parrafos: [
          'Una tabla con ID, Nombre, Descripción, Estado, Propio, Regional y NUSD, ordenada por nombre y con un buscador en la columna Nombre. Si la descripción es larga, pasá el mouse por encima para verla completa.'
        ]
      }
    ],
    pasos: [
      'Para crear un relleno, tocá "Nuevo Relleno"; para editar, tocá el lápiz de la fila.',
      'Completá Nombre, Descripción y, si corresponde, NUSD.',
      'Marcá "Activo", "Propio" y "Regional" según corresponda.',
      'Tocá "Guardar".',
      'Para activar o desactivar un relleno, tocá el botón "Activo" o "Inactivo" de su fila.'
    ],
    notas: [
      'Nombre (hasta 20 caracteres) y Descripción son obligatorios.',
      'La papelera pide confirmación y no borra el relleno: lo deja inactivo, y sigue apareciendo en la tabla como "Inactivo".'
    ]
  },
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Ejecutar las validaciones del período',
    contenido: 'Validaciones corre los controles de negocio de un APS y un período (tarifas calculadas y certificadas, costo de poda, integración con el sistema comercial, relleno configurado) y te muestra cuáles pasan y cuáles no.',
    sistema: 'VEO-Regulator',
    ruta: '/validaciones',
    secciones: [
      {
        titulo: 'Para qué sirve',
        parrafos: [
          'Te permite revisar, antes de avanzar con un período, que los datos cumplan las reglas de negocio. Las validaciones solo consultan: no modifican información.'
        ]
      },
      {
        titulo: 'Qué validaciones hay',
        parrafos: [
          'Existencia de Tarifa: que haya tarifas calculadas para el período.',
          'SUI vs Facturación: que el costo de poda de facturación no supere el costo SUI techo.',
          'Productividad: que, cuando hay productividad, el costo de poda SUI no sea igual al del período anterior.',
          'Enero: que haya cambio en el costo de poda en el mes de enero.',
          'Integración SC: que las tarifas no se hayan integrado todavía con el sistema comercial.',
          'Existencia Relleno: que el APS tenga un relleno configurado.',
          'Tarifa Certificada: que existan tarifas certificadas para el período.'
        ]
      }
    ],
    pasos: [
      'En "Parámetros", elegí el APS, el año y el mes.',
      'Tocá "Ejecutar Todas" para correr todas las validaciones, o "Ejecutar" en la tarjeta de una sola.',
      'Revisá el resultado de cada tarjeta: "OK" en verde si pasó, o el mensaje del problema en rojo si no.',
      'Tocá "Limpiar" para borrar los resultados y empezar de nuevo.'
    ],
    notas: [
      'El año y el mes son obligatorios; si falta alguno vas a ver "Seleccione año y mes".',
      'El APS se elige de una lista propia de esta pantalla (CVA, CVNA y San Pedro) y arranca en CVA.',
      'El año y el mes arrancan con tu última elección o, si no hay, con el mes actual.'
    ]
  },

  // ---------------------------------------------------------- Preguntas frecuentes
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Qué hago si un cargue queda con error?',
    contenido: 'Leé el mensaje que aparece en pantalla: indica si el problema está en el archivo (formato, columnas o separador) o en el servidor. Si es un error del servidor, el mensaje trae un "Código de soporte": pasáselo a soporte junto con el archivo.',
    notas: [
      '"Formato de archivo inválido" o "Error al parsear el archivo": revisá que sea el archivo correcto, con sus columnas, separador y contenido, y volvé a subirlo.',
      '"El archivo llegó al servidor pero falló el guardado en base de datos": intentá de nuevo y, si se repite, contactá a soporte.',
      'Los usuarios de soporte ven además un botón con ícono de base de datos, abajo a la derecha, con el log de errores de la sesión y el detalle técnico de cada uno.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Cómo recupero mi contraseña?',
    contenido: 'No hay un "olvidé mi contraseña" en la pantalla de ingreso: pedile a un administrador que te la reinicie desde Configuración > Usuarios. Te va a pasar una contraseña nueva, que después podés cambiar desde "Cambiar Clave".',
    notas: [
      'El administrador toca la llave de tu fila en la pestaña Usuarios y la aplicación genera una contraseña nueva, que se muestra una sola vez.',
      'Si recordás tu contraseña y solo querés cambiarla, hacelo vos desde tu perfil > "Cambiar Clave".'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué no veo una pantalla en el menú o un APS en la lista?',
    contenido: 'El menú y los APS dependen de los permisos de tu usuario en el sistema en el que ingresaste. Un administrador los habilita desde Configuración > Usuarios, en las pestañas Permisos y APS.',
    notas: [
      'Revisá primero estar en el sistema correcto: cada sistema tiene su propio menú.',
      'Los cambios de permisos se ven la próxima vez que ingresás, recargás la página o cambiás de sistema.'
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Por qué la aplicación me devolvió a la pantalla de ingreso?',
    contenido: 'Tu sesión venció o dejó de ser válida, así que la aplicación la cerró por seguridad. Volvé a ingresar con tu correo y contraseña.',
    notas: [
      'También pasa a propósito después de cambiar tu contraseña.',
      'Tus preferencias (tema, accesos de Inicio, vistas de tablas y últimos APS, año y mes) no se pierden al volver a ingresar.'
    ]
  }
];
