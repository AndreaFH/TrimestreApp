# Especificación: App de ingresos y gastos trimestrales

Oct 11, 2026 · @Andrea

## 1. Resumen ejecutivo

**Alcance aclarado el 11 de octubre de 2026:** es una aplicación para **una sola persona** (un familiar), que registra sus ingresos y gastos para facilitarle el trabajo. **Nada se guarda en la nube**: todos los datos viven en el ordenador. La app se programa aquí y se empaqueta como instalador para llevarla a otro PC.

La recomendación es una **aplicación de escritorio** (Electron con React y TypeScript) con base de datos SQLite local, cuyo núcleo es una tabla mensual de cuatro columnas que se exporta a Word, Excel y PDF. No hay cuentas, roles, servidor ni conexión a internet.

**Decisiones clave:**

- **Tres estados por celda, no dos.** Ingresos y gastos distinguen *pendiente* (vacío), *confirmado a 0,00 €* y *importe*. Sin esto, un total parcial se confunde con uno definitivo.
- **Bizum como casilla SÍ/NO**, con importe opcional en una versión posterior. La casilla indica solo que hubo algún cobro por Bizum ese día.
- **Los datos locales necesitan copia de seguridad.** Sin nube, un fallo del disco los perdería: la app crea copias automáticas en una carpeta que elige el usuario (por defecto una carpeta del propio PC) y permite exportar e importar una copia para pasar los datos a otro PC.
- **Los totales nunca se guardan.** Se calculan siempre desde los registros diarios; el día de la semana se deriva de la fecha.
- **Los documentos no son contabilidad oficial.** Cada exportación lleva una leyenda de estado y no sustituye a los libros registro ni a las declaraciones.

**Alcance del MVP:** selección de año y trimestre, tres meses, fechas automáticas, ingresos, Bizum, gastos, totales, cierre de mes, historial de cambios, copias de seguridad y exportación a Word (mensual y trimestral), Excel y PDF. CSV, importe de Bizum y varios negocios quedan para fases posteriores.

### Supuestos de partida

| Supuesto | Por qué importa | Cómo cambiaría |
| --- | --- | --- |
| El mismo usuario introduce ingresos, Bizum y gastos; los gastos pueden quedar pendientes hasta que los tenga | La gestoría ya no usa la app: recibe los documentos exportados | Si la gestoría quisiera editar, haría falta otro modelo (nube y cuentas) |
| El otro PC usa **Windows 10 u 11 de 64 bits** | Condiciona el instalador | Otro sistema operativo exige otro empaquetado |
| Un negocio por instalación | Simplifica pantallas y datos | Selector de negocio en una fase posterior |
| La imagen de la plantilla Word **ya está recibida** | El diseño sigue la imagen: tres columnas en la plantilla y cuatro en la app | Los colores exactos se pueden afinar si se desea (sección 6.1) |
| Moneda única, euros, formato es-ES | Es el contexto descrito | Sin impacto |

## 2. Problema y evaluación crítica

El problema real no es «hacer una tabla»: es llevar un registro diario fiable, con estados claros de lo que falta, y obtener documentos listos para entregar a la gestoría. La app es una herramienta personal que evita errores y ahorra tiempo.

**Usuario.** Una persona sin conocimientos de contabilidad que anota ingresos en pocos segundos al día, desde un ordenador de sobremesa o portátil, y completa los gastos cuando los tiene. Al cerrar el trimestre, entrega los documentos a su gestoría.

### Qué mantener y qué cuestionar

| Idea inicial | Valoración | Recomendación |
| --- | --- | --- |
| Cuatro columnas exactas | Acertada: tabla corta, imprimible y fácil de leer | Mantener. El estado va fuera de la tabla, como iconos y avisos |
| Un solo importe diario | Correcto para el MVP | Mantener. Registro por operación solo si hace falta |
| Casilla Bizum SÍ/NO | Útil pero ambigua: no dice cuánto | Mantener y rotular en los documentos «Hubo algún cobro por Bizum». Importe de Bizum en fase 2 |
| Gastos opcionales | Coherente: pueden no estar disponibles al anotar los ingresos | Mantener con estado pendiente visible |
| Todo en local, sin nube | Cumple la privacidad pedida, pero un solo disco es un punto único de fallo | Mantener y compensar con copias automáticas a una carpeta externa |
| Guardar en el navegador | Frágil: borrar datos de navegación lo borra todo | Descartado: base de datos SQLite en una app de escritorio |
| Balance trimestral | Peligroso si faltan gastos | Mostrar solo con gastos completos; si no, «Balance provisional» con aviso |
| Exportar datos incompletos | Útil para ir avanzando | Permitir, con marca visible «Gastos pendientes» en el documento |

### Contradicciones y huecos detectados

- **Día vacío frente a día confirmado sin ingresos.** Si todo vacío cuenta como 0, un olvido pasa por día sin ventas. Se propone el botón «Sin ingresos» y un cierre de mes que pide confirmar los días vacíos.
- **Los días futuros no son «pendientes».** No deben alarmar ni bloquear exportaciones; se muestran atenuados.
- **Bizum sin importe.** No permite conciliar cuánto entró por ese canal. Es una limitación asumida y señalada, no un fallo.
- **Ingresos y gastos con ciclos distintos.** El estado de cumplimentación se mide por separado.
- **Edición tras entregar un trimestre.** Si se corrige un día después de entregar los documentos, las cifras entregadas dejan de coincidir. Se necesita un estado «Cerrado» con confirmación para reabrir.
- **Llevar la app a otro PC.** Hay que probar el instalador en el PC de destino desde las primeras fases, no al final.

### Qué no debe ser la aplicación

No es un programa de contabilidad, no emite facturas, no calcula IVA ni IRPF y no sustituye a los libros registro. Esa frontera evita complejidad y responsabilidad fiscal.

## 3. Aplicaciones existentes en España

Ninguna de las herramientas revisadas ofrece lo que se pide aquí: un registro diario de ingresos con casilla Bizum y una tabla mensual imprimible en Word. Todas son software de facturación o contabilidad, con modelos fiscales y facturas como núcleo. El hueco real es un cuaderno diario ligero para quien no factura cliente a cliente, por ejemplo un negocio de cobro directo en caja.

| Herramienta | Orientación | Colaboración con gestoría | Exportación | Precio publicado | Nivel de verificación |
| --- | --- | --- | --- | --- | --- |
| [Contasimple](https://www.contasimple.com/precios/) | Facturación, impuestos y contabilidad para autónomos | Usuarios extra «para tu gestor» y exportación en formato a3ASESOR, eco y con | Excel; PDF de facturas | Básico gratis (12 documentos/año). Profesional 10,95 €/mes anual o 12,95 €/mes trimestral. Ultimate 15,95 € o 19,95 €. Sin IVA | **Verificado** en su página oficial de precios |
| [Quipu](https://getquipu.com/es/gestion-impuestos) | Facturación y gastos con modelos AEAT | Trabajo colaborativo con el gestor, según su web | No comprobado | Fuentes de terceros discrepan (de 13 € a 17 €/mes de entrada) | Funciones según web oficial; **precio no verificado** |
| [Holded](https://www.holded.com/es/programa-contabilidad/contabilidad-colaborativa) | ERP con facturación y contabilidad | Invitación al asesor con permisos y panel multicliente para gestorías | No comprobado | No consultado en página oficial | Colaboración según web oficial; **precio no verificado** |
| Billin (TeamSystem) | Facturación electrónica | Acceso para el gestor del cliente, según un comparador de terceros | No comprobado | 6,60 €/mes + IVA en anual, según terceros | **No verificado** en fuente oficial |

*Dato corregido:* algunos comparadores externos dan 50 registros al año para el plan gratuito de Contasimple, pero su página oficial indica 12. Por eso los precios y límites de esta tabla solo valen como orientación hasta volver a comprobarlos.

### Buenas prácticas que conviene adoptar

- **Exportación pensada para el gestor**, no solo para el cliente (Contasimple publica una exportación en formato a3ASESOR, eco y con). Aquí se cubre con Word, Excel y PDF; CSV queda para fase 2.
- **Exportación libre a Excel**: «tu información es tuya», según Contasimple. Se adopta como principio.
- **Copia de seguridad automática**, que Contasimple publica como diaria. Aquí es obligatoria y local.
- **Cifrado de comunicaciones**: no aplica, porque la app no usa red.

### Qué no copiar

Facturación, modelos fiscales, OCR, conciliación bancaria y cumplimiento de VeriFactu. Añaden coste, riesgo legal y complejidad, y no resuelven el problema planteado.

**Fuentes:** [Contasimple, precios](https://www.contasimple.com/precios/) (página abierta, 11 oct 2026) · [Quipu, impuestos y colaboración con el gestor](https://getquipu.com/es/gestion-impuestos) · [Holded, contabilidad colaborativa](https://www.holded.com/es/programa-contabilidad/contabilidad-colaborativa) · [Holded para asesorías](https://www.holded.com/es/asesorias) · [Capterra, Quipu](https://www.capterra.es/software/189268/quipu) · [Invoo, comparativa con Billin](https://invoo.es/es/blog/comparaciones/invoo-vs-billin-comparativa-2026/)

## 4. Definición funcional y reglas de negocio

Cada regla siguiente es normativa para la IA desarrolladora: si el código y esta sección discrepan, manda esta sección.

### 4.1 Calendario

| Regla | Definición |
| --- | --- |
| Trimestres | T1 = meses 1 a 3, T2 = 4 a 6, T3 = 7 a 9, T4 = 10 a 12. Trimestre natural, no fiscal |
| Días del mes | Todas las fechas desde el día 1 hasta el último día natural, generadas por código con la librería de fechas del lenguaje (nunca a mano) |
| Año bisiesto | Lo decide la librería: divisible entre 4, salvo los divisibles entre 100 que no lo sean entre 400. Febrero 2028 tiene 29 días y febrero 2027 tiene 28 |
| Día de la semana | Se calcula desde la fecha y en español: lunes, martes, miércoles, jueves, viernes, sábado, domingo. No se guarda en base de datos |
| Zona horaria | Las fechas son fechas de calendario sin hora (tipo DATE). «Hoy» se calcula en Europe/Madrid |
| Años permitidos | Del año de alta del negocio hasta el año actual más 1 |

### 4.2 Estados de cada día

Cada día guarda dos campos independientes, uno para ingresos y otro para gastos, con tres estados cada uno. Esto evita confundir un olvido con un cero.

| Estado | Ingresos | Gastos | Cómo se muestra |
| --- | --- | --- | --- |
| Pendiente | Sin valor guardado | Sin valor guardado | Celda vacía, con un punto de color discreto si el día ya pasó |
| Confirmado a cero | Valor 0,00 | Valor 0,00 | «0,00 €» |
| Con importe | Valor mayor que 0 | Valor mayor que 0 | Importe formateado |

- Un día futuro nunca cuenta como pendiente: se muestra atenuado y no genera avisos.
- El botón «Sin ingresos» guarda 0,00 € y Bizum = NO en un solo toque.
- Borrar el contenido de una celda la devuelve a *pendiente*; no la deja en cero.

### 4.3 Importes

- Se guardan en **céntimos como entero** (por ejemplo 25000 para 250,00 €) para evitar errores de redondeo con decimales binarios.
- Rango válido: de 0 a 99.999.999 céntimos (999.999,99 €). Los negativos se rechazan; una devolución se anota restando en la celda del día correspondiente y con una nota, o se deja para fase 2 como línea de ajuste.
- Entrada tolerante: se aceptan «250», «250,5», «250,50» y «250.50». Tras salir de la celda se normaliza a «250,50 €». Se rechaza texto, más de dos decimales y varias comas.
- Visualización es-ES: punto de millares y coma decimal, por ejemplo «1.234,50 €».

### 4.4 Indicador Bizum

| Ingresos del día | Bizum | Resultado |
| --- | --- | --- |
| Pendiente | Sin marcar | Se muestra «—» |
| 0,00 € | Forzado a NO | NO, casilla bloqueada |
| Mayor que 0 | SÍ o NO | Lo que marque el usuario; si no marca nada, por defecto NO y se guarda al registrar el importe |

Bizum = SÍ solo significa que hubo al menos un cobro por Bizum ese día. Si el usuario baja los ingresos a 0,00 €, Bizum pasa a NO automáticamente.

### 4.5 Totales

- **Total ingresos del mes** = suma de los ingresos de los días con importe; los días pendientes suman 0 pero se cuentan aparte.
- **Total gastos del mes** = suma de los gastos con importe. Si hay al menos un día con gastos pendiente (excluidos los futuros), el total se rotula «Parcial» o «Pendiente»; si no hay ninguno registrado, «Pendiente».
- **Días con Bizum** = número de días con Bizum = SÍ.
- **Totales trimestrales** = suma de los tres totales mensuales, nunca una suma de cifras ya redondeadas ni guardadas.
- **Balance trimestral** = ingresos menos gastos, mostrado como definitivo solo si los tres meses tienen estado de gastos «Completo». En otro caso aparece como «Balance provisional» con el aviso de qué meses faltan.
- Los totales salen de una única función de cálculo, la misma para la pantalla y para los tres formatos de exportación.

### 4.6 Estado de un mes

| Estado | Condición | Quién lo cambia |
| --- | --- | --- |
| Abierto | Valor inicial | Automático |
| Cerrado | El usuario pulsa «Cerrar mes» tras confirmar los días pasados que sigan vacíos | El usuario |

Un mes cerrado no se edita. Para reabrirlo se pide confirmación y se anota en el historial. El cierre es voluntario: sirve para que las cifras entregadas a la gestoría no cambien sin querer.

Aparte del cierre, cada mes tiene un marcador «Gastos completos», que el usuario activa cuando confirma que no falta ningún gasto. Es lo que permite mostrar un balance como definitivo (sección 4.5). Si después se añade o cambia un gasto, el marcador se desactiva solo.

### 4.7 Un solo usuario

No hay cuentas, contraseñas ni roles. Quien abre la app puede ver y editar todo. No hay PIN de arranque (decisión confirmada): la protección es la contraseña de Windows y, si se quiere, el cifrado del disco.

### 4.8 Historial y guardado

- Cada cambio en un día guarda campo, valor anterior, valor nuevo y fecha. No se borra nunca; hay botón «Deshacer» para el último cambio de una celda.
- Guardado inmediato en la base de datos al salir de cada celda; un cierre inesperado no pierde lo ya confirmado. No hay cola sin conexión porque la app no usa red.
- Solo hay una instancia de la app abierta a la vez; si se intenta abrir otra, se avisa y se cierra.

## 5. Diseño UX/UI y wireframes

El objetivo de uso es entrar, elegir el periodo, anotar el día y salir en menos de un minuto. Por eso la pantalla de inicio abre directamente el mes actual, y el selector de año y trimestre queda siempre visible.

### Principios visuales

- Blanco para las celdas de datos, salmón claro (`#FBE3D6`) para etiquetas y la columna de días, bordes de 1 px en gris oscuro (`#333`). Tonos tomados de la plantilla recibida.
- Tipografía sans-serif de al menos 16 px en móvil para evitar el zoom automático al editar.
- Importes alineados a la derecha con cifras tabulares; objetivos táctiles de al menos 44 px de alto.
- Estado siempre con icono **y** texto, nunca solo con color: ● pendiente, ✓ completo, 🔒 cerrado.
- Mensajes breves: «Guardado», «Sin conexión: se guardará al volver», «Importe no válido: usa números, por ejemplo 250,50».

### Pantallas

| Pantalla | Propósito |
| --- | --- |
| Inicio | Abre el mes actual; accesos a trimestre, historial y copias |
| Trimestre | Tres tarjetas de mes con totales y estado |
| Mes (tabla) | Registro diario de cuatro columnas |
| Resumen trimestral | Totales por mes, días con Bizum, estado de gastos |
| Historial | Periodos anteriores y registro de cambios con «Deshacer» |
| Exportar | Elegir formato y alcance; avisos de validación |
| Copias y ajustes | Nombre del negocio, carpeta de copias, exportar e importar copia |

### Wireframe: tabla mensual (móvil y escritorio)

```text
┌───────────────────────────────────────────────┐
│ ‹  2027 ▾    T1 ▾      [Ene] Feb  Mar   ⤓ Exportar │
├───────────────────────────────────────────────┤
│ Mes: ENERO          Año: 2027        ● 3 días pendientes │
├──────────────┬────────────┬────────┬───────────┤
│ Día          │ Ingresos(€)│ ¿Bizum?│ Gastos(€) │
├──────────────┼────────────┼────────┼───────────┤
│ 01 — Viernes │   250,00 € │  SÍ    │           │
│ 02 — Sábado  │   180,00 € │  NO    │           │
│ 03 — Domingo │            │  —     │           │  ← pendiente
│ 04 — Lunes   │     0,00 € │  NO    │           │  ← sin ingresos
│ …            │            │        │           │
├──────────────┼────────────┼────────┼───────────┤
│ TOTAL        │ 1.230,00 € │ 9 días │ Pendiente │
└──────────────┴────────────┴────────┴───────────┘
 [ Sin ingresos ]  [ Cerrar mes ]   Guardado ✓
```

Interacción: tocar la celda de ingresos abre el teclado numérico; Intro o salir de la celda guarda y baja a la fila siguiente. La casilla Bizum alterna SÍ y NO con un toque. La celda de gastos se edita igual que la de ingresos y puede quedar vacía. La fila de cabecera y la de totales quedan fijas al desplazarse.

### Wireframe: vista del trimestre

```text
┌ T1 2027 ──────────────────────────────────────┐
│ ┌ Enero ───────┐ ┌ Febrero ─────┐ ┌ Marzo ──────┐ │
│ │ 4.120,00 €   │ │ 3.870,00 €   │ │ 2.050,00 € │ │
│ │ Gastos: ●    │ │ Gastos: ✓    │ │ Gastos: ●  │ │
│ │ 31/31 días   │ │ 28/28 días   │ │ 12/31 días │ │
│ └──────────────┘ └──────────────┘ └────────────┘ │
│ Trimestre: 10.040,00 € ingresos · Gastos pendientes │
│ Balance provisional · [ Resumen ]  [ Exportar ]      │
└────────────────────────────────────────────────┘
```

### Gastos y pendientes

Los gastos se anotan en la misma tabla y pueden dejarse vacíos. Un indicador en la cabecera del mes cuenta los días con ingresos pendientes y los meses con gastos sin completar, y el botón «Marcar gastos completos» confirma que no falta ninguno. Para cerrar el mes o exportar con datos incompletos se muestra un aviso, pero nunca se bloquea.

## 6. Plantilla Word y exportaciones

Una sola fuente de verdad genera los tres formatos: la aplicación lee los registros, calcula los totales con las reglas de la sección 4 y rellena cada documento. Ninguna exportación modifica datos.

### 6.1 Plantilla Word mensual

Diseño basado en la imagen de la plantilla recibida: cabecera con dos campos, tabla con bordes finos negros, etiquetas salmón, celdas de datos blancas, fila TOTAL.

**Qué cambia respecto a la plantilla:** la imagen tiene tres columnas (Día, Ingresos, Gastos) y siempre 31 filas. La versión final añade la columna «¿Bizum?», muestra el día de la semana junto al número y genera solo los días reales del mes. Se conserva el resto: recuadros Mes y Año arriba, etiquetas salmón, bordes negros finos, fila Total y una sola página A4.

| Elemento | Especificación |
| --- | --- |
| Página | A4 vertical, márgenes de 2 cm (ancho útil 17 cm) |
| Cabecera | Dos recuadros con borde negro fino en la misma línea, como en la plantilla: «Mes» ancho (10,5 cm) y «Año» estrecho (5,5 cm), con 0,6 cm de separación. Cada uno lleva una etiqueta de 1,6 cm con fondo salmón («Mes» normal, «Año» en cursiva) y su valor ya relleno al lado (ENERO, 2027). Nombre del negocio en el pie de página |
| Tabla | Tabla real de Word de 4 columnas, bordes de 0,5 pt negros, ancho fijo de 17 cm |
| Anchos de columna | Día 4,6 cm · Ingresos (€) 4,4 cm · ¿Bizum? 3,0 cm · Gastos (€) 5,0 cm |
| Fila de cabecera | Fondo salmón `#FBE3D6`, solo la celda «Día» lleva fondo salmón, en negrita; «Ingresos (€)», «¿Bizum?» y «Gastos (€)» van en blanco y centradas, como en la plantilla. Se repite en cada página |
| Filas de datos | Una por día natural. Altura mínima 0,65 cm, fuente 10 pt sans-serif, «no dividir fila entre páginas» |
| Primera columna | «01 — Viernes» (día con dos cifras, guion largo, día de la semana en español), con fondo salmón y negrita como la columna de días de la plantilla |
| Alineación | Importes a la derecha con formato «1.234,50 €»; Bizum centrado; días futuros o pendientes con celda vacía |
| Fila TOTAL | Etiqueta «TOTAL» con fondo salmón y negrita; suma de ingresos; «n días» en Bizum; suma de gastos o «Pendiente» / «Parcial» |
| Nota de pendientes | Si hay pendientes, nota bajo la tabla en cursiva: «Gastos pendientes de completar en N días» |
| Pie | «Documento informativo, no sustituye a los libros registro ni a las declaraciones fiscales» y la fecha de generación |

Un mes de 31 días ocupa 33 filas de 0,65 cm, unos 21,5 cm, y cabe en una página A4 con la cabecera. Si el contenido desborda, la repetición de cabecera y la regla de no dividir filas garantizan un corte limpio, y la fila TOTAL se marca «mantener con la anterior» para no quedar sola.

### 6.2 Documento Word trimestral

1. Portada: nombre del negocio, «Ingresos y gastos — T1 2027», fecha de generación y estado del trimestre (completo, parcial).
2. Los tres meses, cada uno en una sección nueva con salto de página y la tabla de 6.1.
3. Resumen trimestral: tabla con una fila por mes (ingresos, gastos, días con ingresos, días con Bizum, estado de gastos) y una fila TOTAL.
4. Balance: cifra definitiva solo con gastos completos; si no, «Balance provisional» y la lista de meses incompletos.

Nombres de archivo: `Ingresos_Gastos_Enero_2027.docx` y `Ingresos_Gastos_2027_T1.docx`. Caracteres especiales del negocio se sustituyen por guion bajo.

### 6.3 Excel (.xlsx)

- Libro con cuatro hojas: `Enero 2027`, `Febrero 2027`, `Marzo 2027` y `Resumen T1`.
- Cada hoja mensual con las mismas cuatro columnas. Importes como **números reales** con formato `#.##0,00 €`; fecha en columna A como valor de fecha real con formato `dd/mm/aaaa — dddd`, para poder ordenar y filtrar.
- Fila TOTAL con fórmulas `SUMA` sobre el rango, no valores pegados, de forma que el total se recalcule si la gestoría edita una celda en Excel.
- Celdas pendientes vacías; cero confirmado como 0. Fila de cabecera inmovilizada.
- Un único mes se puede descargar por separado con la misma estructura.

### 6.4 PDF

El PDF se genera dentro de la propia app con el motor de impresión de Electron (`printToPDF`) a partir de una página HTML maquetada con las mismas medidas de la sección 6.1: A4, márgenes de 2 cm, mismas columnas y anchos, mismos colores. Se exporta un mes o el trimestre completo, con las tres tablas y el resumen. Alternativa descartada: convertir el .docx con LibreOffice, porque obligaría a instalarlo en el otro PC. Consecuencia: Word y PDF son fieles a la misma especificación, pero no idénticos píxel a píxel; la prueba E5 lo comprueba.

### 6.5 CSV (evaluación)

Aporta valor para importar en otros programas, pero no entra en el MVP. En fase 2 se ofrecerá con separador punto y coma, codificación UTF-8 con BOM y coma decimal, que es lo que Excel en español abre sin asistente.

### 6.6 Validaciones previas a exportar

| Comprobación | Resultado |
| --- | --- |
| Gastos pendientes | Aviso: se puede exportar y el documento lo indica |
| Días pasados sin ingreso registrado | Aviso con el número de días; se puede exportar |
| Importes no válidos o fuera de rango | **Bloquea** la exportación: no debería existir tras la validación, pero se vuelve a comprobar |
| Mes sin cerrar | Aviso; el pie del documento dice «Mes sin cerrar» |
| Totales distintos de la suma de las filas | **Bloquea** y registra un error |

## 7. Datos, arquitectura y traslado a otro PC

Recomendación: una aplicación de escritorio de Windows hecha con Electron, React y TypeScript, con base de datos SQLite en un solo fichero local. Sin servidor, sin cuentas y sin ninguna conexión de red. Se entrega como instalador (.exe) y los datos se trasladan con un fichero de copia.

### 7.1 Arquitectura

```text
App de escritorio (Electron)
 ├─ Interfaz: React + TypeScript
 ├─ Lógica: calendario, estados, totales (un único módulo con pruebas)
 ├─ Datos: SQLite en un fichero local (carpeta de datos del usuario de Windows)
 ├─ Exportación: Word (biblioteca docx), Excel (ExcelJS), PDF (printToPDF)
 └─ Copias: automáticas a una carpeta elegida + exportar e importar copia

Sin red: la app no hace ninguna conexión saliente
```

| Capa | Elección | Por qué |
| --- | --- | --- |
| Aplicación | Electron con React y TypeScript | Se programa con las herramientas web habituales, funciona sin instalar nada más y genera instalador de Windows |
| Datos | SQLite (`better-sqlite3`), modo WAL, transacciones | Un fichero, fiable ante cierres bruscos, sin servidor |
| Exportación | `docx`, `exceljs`, `printToPDF` de Electron | Todo funciona dentro de la app, sin LibreOffice ni Word instalado |
| Empaquetado | `electron-builder`: instalador NSIS y, si se quiere, versión portable | Un fichero que se copia y se instala en otro PC |
| Actualizaciones | Manuales: se entrega un instalador nuevo; sin actualización automática | La app no debe usar red |
| Alternativa | Tauri: instalador más pequeño, pero exige Rust y WebView2 | Más pequeño, más trabajo de preparación; descartado para el MVP |
| Alternativa descartada | Página HTML con almacenamiento del navegador | Un borrado de datos de navegación lo pierde todo; no vale para datos económicos |

**Verificaciones que no se han podido hacer todavía:** no sé si el entorno donde se programa puede generar el instalador de Windows directamente; si no puede, se compila en un PC con Windows con un solo comando. Tampoco puedo ver la interfaz con ventana real desde aquí: la lógica y las exportaciones se prueban automáticamente, pero la revisión visual y la impresión las debes confirmar tú en el PC. Por eso la fase 1 incluye un instalador mínimo probado en el PC de destino.

### 7.2 Modelo de datos

El estado pendiente o confirmado se **deriva** de si el campo es nulo: nulo es pendiente y 0 es confirmado a cero. No existe un segundo campo que pueda desincronizarse.

| Tabla | Campos | Restricciones |
| --- | --- | --- |
| `day_entries` | date, income\_cents, bizum, expense\_cents, updated\_at | Clave primaria: date (texto AAAA-MM-DD). Importes enteros ≥ 0 o nulos; bizum nulo si income\_cents es nulo y falso si es 0 |
| `month_status` | year, month, closed\_at, expenses\_complete | Clave primaria (year, month) |
| `audit_log` | id, entry\_date, field, old\_value, new\_value, at | Solo inserción |
| `settings` | business\_name, backup\_folder, schema\_version | Una sola fila |

**Se guarda:** los registros diarios, el estado de cada mes, el historial y los ajustes. **Se calcula siempre:** día de la semana, filas del calendario, totales mensuales y trimestrales, días con Bizum, estado de cumplimentación y balance. Los días sin datos no tienen fila: el calendario los genera y la fila nace al escribir.

### 7.3 Seguridad y privacidad locales

- Los datos nunca salen del PC salvo que el usuario copie una copia de seguridad o un documento exportado a otro sitio.
- La app no incluye telemetría, anuncios ni comprobación de actualizaciones.
- Protección del acceso: contraseña de Windows y, si se quiere, cifrado del disco (BitLocker en las ediciones que lo incluyen). Sin PIN de arranque (sección 4.7).
- Las copias en USB o carpetas contienen datos económicos: deben guardarse como cualquier documento del negocio.
- Es un uso doméstico de un solo usuario; la protección de datos de terceros no se ve afectada porque no se almacenan datos personales de clientes, solo importes diarios.

### 7.4 Copias de seguridad

| Mecanismo | Funcionamiento |
| --- | --- |
| Copia automática | Al cerrar la app, una copia consistente de la base en la carpeta elegida; se conservan las últimas 30. Se usa la copia en caliente de SQLite, no un simple copiado del fichero |
| Aviso de copia atrasada | Si pasan más de 7 días sin copia, un aviso al abrir; no bloquea |
| Exportar copia | Botón que guarda un fichero `.sqlite` con nombre y fecha, en el sitio que elija el usuario |
| Importar copia | Valida el fichero (esquema y versión), guarda antes una copia de los datos actuales y pide confirmación antes de sustituir |
| Antes de actualizar | La app hace una copia automática si detecta una versión nueva del esquema |

**Decisión confirmada:** las copias van a una carpeta del propio PC. Protege de borrados y errores de la app, pero no de un fallo del disco o del equipo. Por eso se mantiene el aviso de copia atrasada y se recomienda copiar esa carpeta a un USB de vez en cuando; el riesgo de pérdida por fallo del disco sigue abierto en la sección 8.

### 7.5 Llevar la app y los datos a otro PC

1. En el PC original: «Exportar copia» y guardar el fichero en un USB.
2. En el PC nuevo: ejecutar el instalador (.exe) que se entrega junto con la app. No hace falta instalar nada más, ni Node, ni Word, ni LibreOffice; Windows puede mostrar un aviso de editor desconocido porque el instalador no está firmado (la firma de código es de pago y queda como mejora).
3. Abrir la app y pulsar «Importar copia» con el fichero del USB.
4. Comprobar un mes concreto y los totales; las dos instalaciones no se sincronizan, así que desde ese momento solo debe usarse una.

## 8. Matriz de riesgos

En una app local de un solo usuario, el riesgo que más pesa es perder los datos con un único disco; después, confundir pendiente con cero y que la app no funcione en el otro PC. Probabilidades e impactos son estimaciones de criterio, no datos medidos.

| Riesgo | Prob. | Impacto | Prioridad | Medida preventiva | Si ocurre |
| --- | --- | --- | --- | --- | --- |
| Pérdida de datos por fallo del disco o del PC | Media | Muy alto | **1** | Copia automática a una carpeta del PC, aviso si hay más de 7 días sin copia, copia manual ocasional a un USB | Instalar la app en otro PC e importar la última copia |
| Pendiente confundido con cero | Alta | Alto | **1** | Tres estados, cierre de mes con confirmación de días vacíos, aviso de pendientes | Reabrir el mes, completar y reexportar; el historial muestra qué cambió |
| La app no instala o no arranca en el otro PC | Media | Alto | **1** | Instalador de prueba en el PC de destino en la fase 1; sin dependencias externas | Compilar de nuevo en un PC con Windows o usar la versión portable |
| Balance incompleto tomado por definitivo | Media | Alto | **1** | «Balance provisional» y leyenda de estado en cada documento | Reemitir el documento |
| Cambio en un trimestre ya entregado | Media | Alto | 2 | Estado «Cerrado» con confirmación para reabrir | Comparar con el historial y emitir versión corregida con fecha |
| Base de datos dañada por un cierre brusco o una actualización | Baja | Alto | 2 | Modo WAL, transacciones, copia antes de migrar el esquema | Restaurar la última copia |
| Error al teclear un importe | Alta | Medio | 2 | Validación de formato y rango; aviso si el importe supera 3 veces la media del mes | Corregir con «Deshacer»; el historial guarda el valor anterior |
| Bizum mal marcado | Media | Medio | 2 | Casilla de un toque; rótulo «Hubo algún cobro por Bizum» en los documentos | Corregir; no afecta a ningún total |
| Cálculo de totales incorrecto | Baja | Alto | 2 | Importes enteros en céntimos; una sola función de cálculo; pruebas con casos fijos | Corregir y reexportar; bloqueo si las sumas no cuadran |
| Fechas o día de la semana erróneos en exportaciones | Baja | Alto | 2 | Una sola función de calendario; pruebas de los 4 trimestres y febrero bisiesto | Corregir y reexportar |
| Borrado o edición accidental | Media | Medio | 3 | Historial por celda, «Deshacer», confirmación al borrar | Restaurar el valor anterior |
| Acceso de otras personas al PC | Media | Medio | 3 | Contraseña de Windows, cifrado de disco | Cambiar contraseñas; las copias antiguas pueden retirarse |
| Informes tomados como contabilidad oficial | Media | Alto | 2 | Leyenda en el pie de cada documento; sin cálculo de IVA ni IRPF | Aclararlo por escrito; la gestoría usa sus propios libros |

**Escala:** prioridad 1 = resolver antes de usar la app; 2 = resolver en el MVP; 3 = vigilar y mejorar después.

## 9. MVP, mejoras futuras y fases

El MVP cubre el recorrido completo de una persona: anotar ingresos y gastos, cerrar el mes, guardar copias y entregar el Word del trimestre. Todo lo demás espera.

| Entra en el MVP | Espera a fases posteriores |
| --- | --- |
| App de escritorio con instalador de Windows | Firma de código del instalador |
| Selector de año y trimestre; tres meses; fechas automáticas | Varios negocios con selector |
| Ingresos, casilla Bizum y botón «Sin ingresos» | Importe de Bizum además de la casilla |
| Gastos con estados pendiente, cero e importe | Registro detallado por operación |
| Totales mensuales y trimestrales; avisos de pendientes | Adjuntar justificantes |
| Cierre de mes y «Gastos completos» | Exportación CSV y formato para programas de gestoría |
| Historial de cambios y «Deshacer» | Plantillas con logotipo del negocio |
| Word mensual y trimestral, Excel y PDF | Importar datos desde Excel |
| Copias automáticas, exportar e importar copia | Sincronización entre equipos (rompería la regla de no nube) |
| Aviso de copia atrasada | Actualización automática (rompería la regla de no red) |

### Plan de implementación por fases

Las duraciones son estimaciones para un desarrollador o una IA con revisión humana y deben ajustarse tras la fase 0.

| Fase | Contenido | Duración estimada | Puerta de salida |
| --- | --- | --- | --- |
| 0. Validación | Revisar esta especificación y confirmar la versión de Windows | 2 a 3 días | Reglas y plantilla aprobadas |
| 1. Cimientos | Proyecto Electron, SQLite, función de calendario con pruebas e **instalador mínimo probado en el PC de destino** | 1 semana | Pruebas de calendario en verde y la app abre en el otro PC |
| 2. Registro | Tabla mensual, estados, Bizum, totales, guardado inmediato | 2 semanas | Se registra un mes completo y se cierra y abre la app sin perder nada |
| 3. Control | Cierre de mes, gastos completos, historial, deshacer, copias, exportar e importar copia | 1 a 2 semanas | Se restaura una copia en otro PC con los mismos totales |
| 4. Exportaciones | Word, Excel, PDF y validaciones previas | 2 semanas | Documentos legibles al imprimir y revisados por la gestoría |
| 5. Uso real | Un trimestre de uso con lista de incidencias | 3 meses | Decisión sobre mejoras |

### Hipótesis que pueden cambiar el plan

- Si el otro PC no es Windows 10 u 11 de 64 bits, cambian el instalador y las pruebas de la fase 1.
- Si la gestoría pidiera editar datos o ver cambios a distancia, haría falta un modelo con nube, que contradice el alcance actual.
- Si hay más de un negocio desde el inicio, el selector de negocio sube al MVP.

## 10. Pruebas y criterios de aceptación

La aplicación se acepta cuando superan todas las pruebas de prioridad A, los documentos coinciden con los datos en pantalla y la gestoría aprueba un trimestre de prueba impreso. Las pruebas de calendario y de totales se automatizan con valores fijos.

### Casos con resultado esperado

| Código | Prueba | Resultado esperado |
| --- | --- | --- |
| C1 | Cuatro trimestres | T1 = ene-feb-mar, T2 = abr-may-jun, T3 = jul-ago-sep, T4 = oct-nov-dic |
| C2 | Días por mes en 2027 | Enero 31, febrero 28, marzo 31, abril 30; ninguna fila 29, 30 o 31 donde no existe |
| C3 | Febrero bisiesto | Febrero 2028 tiene 29 días; febrero 2027 y febrero 2100 tienen 28; febrero 2000 tiene 29 |
| C4 | Días de la semana | 01/01/2027 = viernes, 01/02/2027 = lunes, 29/02/2028 = martes |
| C5 | Ingreso con Bizum | 250,00 € y SÍ: total del mes sube 250,00 € y «días con Bizum» sube 1 |
| C6 | Ingreso sin Bizum | 180,00 € y NO: total sube 180,00 € y los días con Bizum no cambian |
| C7 | Día sin ingresos | Botón «Sin ingresos»: celda 0,00 €, Bizum NO, día no cuenta como pendiente |
| C8 | Día pendiente | Celda vacía y Bizum «—»; se cuenta como pendiente; no suma |
| C9 | Gasto pendiente | El total de gastos muestra «Pendiente» y el balance trimestral «Provisional» |
| C10 | Gasto confirmado a cero | 0,00 € cuenta como registrado; no genera aviso |
| C11 | Totales con tres días | 250,00 + 180,00 + 320,00 = 750,00 € en pantalla, Word, Excel y PDF |
| C12 | Importes inválidos | «abc», «12,345», «1,2,3», «-5» rechazados con mensaje; «250», «250,5» y «250.50» aceptados |
| C13 | Importe límite | 999.999,99 € aceptado; 1.000.000,00 € rechazado |
| C14 | Bizum con ingresos a cero | Al borrar el importe y poner 0,00 €, Bizum pasa a NO |
| C15 | Persistencia | Cerrar la app y volver a abrirla: mismos datos |
| C16 | Periodo anterior | Abrir T1 de un año pasado, modificar un día y ver totales e historial actualizados |
| C17 | Cierre brusco | Terminar el proceso de la app a la fuerza justo tras editar una celda: al abrir, el dato confirmado sigue ahí |
| C18 | Copia y restauración | Exportar copia, instalar en un PC sin datos, importar: mismos datos y mismos totales |
| C19 | Mes cerrado | No se puede editar; reabrir pide confirmación y queda en el historial |
| C20 | Gastos completos | Al cambiar un gasto de un mes marcado, el marcador se desactiva solo |
| C21 | Deshacer | Restaura el valor anterior de la celda y lo anota en el historial |

### Datos locales, copias e instalación

| Código | Prueba | Resultado esperado |
| --- | --- | --- |
| L1 | Sin red | Con el cortafuegos bloqueando la app, todo funciona y no hay intentos de conexión |
| L2 | Instalación limpia | Instalar en un Windows sin Node, Word ni LibreOffice: la app abre y exporta los tres formatos |
| L3 | Copia automática | Al cerrar se crea un fichero en la carpeta elegida y solo se conservan las últimas 30 |
| L4 | Copia dañada | Importar un fichero corrupto o de otra versión se rechaza con mensaje y no toca los datos actuales |
| L5 | Actualización | Instalar una versión nueva sobre la anterior conserva los datos y hace copia antes de migrar |
| L6 | Segunda instancia | Abrir la app dos veces avisa y no abre una segunda ventana |

### Exportaciones

| Código | Prueba | Resultado esperado |
| --- | --- | --- |
| E1 | Word mensual | Tabla real de Word, 4 columnas, cabecera de tabla repetida, fila TOTAL junto a su tabla |
| E2 | Word trimestral | Portada, tres meses en páginas separadas, resumen y estado de gastos |
| E3 | Impresión | Un mes de 31 días cabe en A4 sin recortes; probar en Word, LibreOffice y vista previa de impresión |
| E4 | Excel | Importes numéricos con formato de moneda, fechas reales, totales con fórmula `SUMA` que coinciden con la pantalla |
| E5 | PDF | Mismas columnas, anchos y colores que la especificación 6.1; ninguna columna recortada |
| E6 | Fechas y días | Cada fila del documento coincide con la función de calendario para los 12 meses de 2027 y febrero de 2028 |
| E7 | Exportación con pendientes | Se genera y muestra la nota «Gastos pendientes» y la leyenda de estado |
| E8 | Totales descuadrados | La exportación se bloquea y se registra el error |

### Prioridad de las pruebas

Prioridad A (antes de lanzar): C1 a C4, C8, C9, C11, C12, C15, C17, C18, C19, L2 a L4, E1, E3, E4 y E6. Prioridad B (en el MVP): el resto.

## 11. Requisitos finales para la IA desarrolladora

Este bloque se puede entregar tal cual junto con las secciones 4, 6, 7 y 10, que contienen las reglas, las exportaciones, el modelo de datos y las pruebas. Si dos secciones se contradicen, manda la sección 4.

### Requisitos funcionales

| Id | Requisito |
| --- | --- |
| RF1 | El usuario elige año y trimestre y ve tres tarjetas de mes con totales y estado |
| RF2 | La tabla mensual tiene exactamente cuatro columnas: Día, Ingresos (€), ¿Bizum?, Gastos (€) |
| RF3 | Las fechas y el día de la semana se generan por código, en español, sin entrada manual ni almacenamiento |
| RF4 | Ingresos y gastos admiten tres estados: pendiente, cero confirmado e importe (sección 4.2) |
| RF5 | Bizum se registra como SÍ o NO por día, con las reglas de la sección 4.4 |
| RF6 | Los totales y el balance salen de una única función de cálculo, con las reglas de la sección 4.5, y nunca se guardan |
| RF7 | Un solo usuario, sin cuentas ni PIN (sección 4.7) |
| RF8 | Cierre de mes, marcador «Gastos completos», historial de cambios y «Deshacer» (secciones 4.6 y 4.8) |
| RF9 | Exportación a Word mensual, Word trimestral, Excel y PDF según la sección 6 |
| RF10 | Copias automáticas, exportar e importar copia (sección 7.4) |
| RF11 | Avisos visibles ante gastos pendientes, días vacíos pasados y meses sin cerrar, sin bloquear nunca la exportación salvo importes inválidos o totales descuadrados |

### Requisitos no funcionales

- App de escritorio para Windows 10 y 11 de 64 bits, con instalador (.exe) que funcione sin instalar nada más.
- **Cero red:** sin conexiones salientes, sin telemetría y sin comprobación de actualizaciones.
- Datos en SQLite local con transacciones y modo WAL; guardado inmediato al salir de cada celda.
- Interfaz y documentos en español de España; importes con coma decimal; letra mínima de 16 px en pantalla.
- Migraciones de esquema versionadas, con copia previa.

### Fuera de alcance

Cuentas, nube, sincronización, facturación, cálculo de IVA o IRPF, modelos de la Agencia Tributaria, conciliación bancaria, OCR y cualquier función de contabilidad oficial.

### Lenguaje y herramientas obligatorios

**Todo el código se escribe en TypeScript** (modo estricto, sin `any` salvo justificación), tanto la interfaz como la lógica y el acceso a datos. No se usan otros lenguajes de programación en el proyecto. Razón: un solo lenguaje y un solo gestor de paquetes simplifican el desarrollo y el empaquetado en Windows.

| Elemento | Decisión |
| --- | --- |
| Lenguaje | TypeScript en modo estricto |
| Plataforma de escritorio | Electron, con la versión estable vigente al empezar, fijada en `package.json` |
| Interfaz | React con Vite; hojas de estilo CSS normales, sin librería de componentes |
| Base de datos | SQLite con `better-sqlite3`, solo accesible desde el proceso principal de Electron |
| Word | Biblioteca `docx` |
| Excel | Biblioteca `exceljs` |
| PDF | `printToPDF` de Electron sobre una página HTML maquetada según la sección 6.1 |
| Fechas | Fechas como texto `AAAA-MM-DD`; cálculo con `Date.UTC` para evitar errores de zona horaria. Sin librería de fechas salvo que sea imprescindible |
| Pruebas | Vitest para la lógica y las exportaciones; comprobación visual manual de la interfaz |
| Calidad | ESLint y Prettier |
| Empaquetado | `electron-builder`, instalador NSIS para Windows de 64 bits |
| Gestor de paquetes | npm |

**Estructura de carpetas obligatoria:**

```text
src/core       Calendario, importes, estados y totales. TypeScript puro, sin dependencias, con pruebas
src/main       Proceso principal de Electron: SQLite, copias de seguridad, exportación a Word, Excel y PDF
src/preload    Puente seguro entre la interfaz y el proceso principal, con un contrato de tipos
src/renderer   Interfaz en React; no accede a la base de datos ni al disco directamente
tests/         Pruebas automáticas, con los casos de la sección 10
```

**Reglas de arquitectura:** la lógica de negocio vive solo en `src/core` y la usan por igual la pantalla y las exportaciones. La interfaz nunca calcula totales por su cuenta. Solo `src/main` toca la base de datos y el disco. Sin dependencias que usen red en tiempo de ejecución.

### Instrucciones de trabajo para la IA desarrolladora

```text
Implementa la aplicación descrita en este documento por fases (sección 9).
Usa exclusivamente TypeScript y el stack de la sección 11, con la estructura de carpetas indicada.
Empieza por el módulo src/core de calendario y sus pruebas (casos C1 a C4).
No cambies ninguna regla de la sección 4 sin preguntar.
No guardes totales ni el día de la semana en la base de datos.
Guarda los importes como enteros en céntimos.
La app no debe abrir ninguna conexión de red.
En la fase 1, genera un instalador mínimo y confirma que abre en el PC de destino.
Entrega al final de cada fase el código, las pruebas pasadas y una lista de dudas.
Sigue la plantilla Word definida en la sección 6.1 con sus medidas.
```

### Decisiones confirmadas y pendientes

- **Confirmado:** el PC de destino es Windows.
- **Confirmado:** sin PIN de arranque.
- **Confirmado:** copias de seguridad en una carpeta del propio PC.
- **Resuelto:** la plantilla Word se recibió y se aplicó en la sección 6.1.
- **Sin confirmar:** si es Windows 10 u 11 de 64 bits, y si la misma persona anota también los gastos.
