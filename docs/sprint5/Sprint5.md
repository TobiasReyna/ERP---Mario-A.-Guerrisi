# Sprint 5 — Backlog de Historias de Usuario

**Proyecto:** ERP Mario A. Guerrisi (tienda de instrumentos musicales) — Sistemas III

**Cantidad de historias:** 11  
**Total de Puntos de Función:** 89

## Resumen

| Código | Prioridad | Módulo | Nombre | Rol | Puntos |
|---|---|---|---|---|---|
| HU-46 | 46 | Tesorería | Movimiento Diario de Caja (Libro Diario) | Gerente | 8 |
| HU-47 | 47 | Tesorería | Resumen Diario de Cajas y Conciliación | Gerente | 5 |
| HU-48 | 48 | Tesorería | Dashboard Gerencial de Caja | Gerente | 13 |
| HU-49 | 49 | Tesorería | Reporte PDF del Movimiento Diario de Caja | Gerente | 5 |
| HU-50 | 50 | Reportes | Identificación del Canal de Venta (Presencial y E-commerce) | Sistema | 8 |
| HU-51 | 51 | Reportes | Reporte de Ingresos por Ventas | Gerente | 8 |
| HU-52 | 52 | Reportes | Reporte de Egresos por Pagos a Proveedores | Gerente | 8 |
| HU-53 | 53 | Reportes | Balance de Ingresos y Egresos | Gerente | 8 |
| HU-54 | 54 | Reportes | Exportación a PDF de Reportes de Ingresos, Egresos y Balance | Gerente | 5 |
| HU-55 | 55 | E-commerce | Login del Cliente en la Tienda Web (DNI y Correo Electrónico) | Cliente Externo | 13 |
| HU-56 | 56 | E-commerce | Rediseño y Embellecimiento del Frontend de la Tienda Web | Cliente Externo | 8 |

## Historias de Usuario

### HU-46 — Movimiento Diario de Caja (Libro Diario)

- **Prioridad:** 46
- **Módulo:** Tesorería
- **Puntos de Función:** 8
- **Dependencias:** HU-15, HU-16, HU-26, HU-27, HU-28; Login en el Backoffice (Seguridad y Accesos).

**Como** Gerente  
**Necesito** Consultar, para un día y una sucursal, el listado cronológico de todos los hechos de caja: aperturas, ventas cobradas, ingresos y egresos manuales y cierres.  
**Para** Auditar qué ocurrió en cada caja durante la jornada y rastrear cualquier diferencia hasta su origen.

**Criterios de Aceptación:**

1. Dado un Gerente en la pantalla "Movimiento Diario de Caja", cuando selecciona una fecha (por defecto, hoy) y una sucursal, entonces el sistema lista en orden cronológico todos los eventos del día con hora, caja, cajero, tipo de evento (Apertura, Venta, Ingreso, Egreso, Cierre), detalle (comprobante o concepto) y monto.
2. Dado el listado del día, cuando el Gerente aplica filtros por Caja, Cajero, Tipo de evento o Medio de pago, entonces la tabla y los totales se actualizan sin recargar la página y se mantienen coherentes con los filtros activos.
3. Dado un evento de tipo Venta, cuando el Gerente hace clic en la fila, entonces se despliega el detalle (artículos, cliente, lista de precios aplicada y desglose de pagos por medio); dado un Ingreso o Egreso manual, se muestran concepto, observación y si es un contra-asiento.
4. Dado un día sin actividad o una fecha posterior a hoy, cuando el Gerente consulta, entonces el sistema muestra "Sin movimientos para el filtro seleccionado" y bloquea la selección de fechas futuras.

**Reglas de Negocio y Notas Técnicas:**

El "día" se define por la zona horaria America/Argentina/Buenos_Aires (00:00 a 23:59:59), nunca por UTC. Pantalla de solo lectura. Los eventos se arman a partir de caja_sesiones (apertura y cierre), pagos_venta de ventas Confirmadas y caja_movimientos; las ventas Canceladas no aparecen como cobros. Las ventas del E-commerce no pasan por caja y no integran este listado (ver HU-50 y HU-51). Un turno que cruza la medianoche se muestra en el día de cada evento. Paginación en el servidor para más de 500 eventos. Permisos por rol: Administrador y Gerente ven todas las sucursales; los demás roles no acceden. El backend debe validar el token de sesión y el rol, sin confiar en parámetros enviados por el cliente.

### HU-47 — Resumen Diario de Cajas y Conciliación

- **Prioridad:** 47
- **Módulo:** Tesorería
- **Puntos de Función:** 5
- **Dependencias:** HU-26, HU-27, HU-28, HU-46; Login en el Backoffice (Seguridad y Accesos).

**Como** Gerente  
**Necesito** Ver por día el resumen de cada turno y de cada sucursal con fondo inicial, ventas por medio de pago, ingresos, egresos, saldo teórico, efectivo contado y diferencia de arqueo.  
**Para** Conciliar el efectivo y los cobros electrónicos de la jornada y detectar faltantes y sobrantes.

**Criterios de Aceptación:**

1. Dado un día y una sucursal, cuando el Gerente abre el resumen, entonces el sistema muestra una fila por turno (caja y cajero) con hora de apertura y de cierre, fondo inicial, ventas en efectivo, tarjeta de débito, tarjeta de crédito y transferencia, ingresos, egresos, saldo teórico, efectivo físico contado y diferencia (faltante en rojo, sobrante en ámbar).
2. Dado el resumen, cuando se calculan los totales de la sucursal y del día, entonces el sistema suma por columna y la suma de los medios de pago coincide exactamente con el total cobrado del día.
3. Dado un turno todavía abierto, cuando aparece en el resumen, entonces se marca como "En curso", muestra el saldo teórico al momento de la consulta y deja vacíos el efectivo contado y la diferencia.
4. Dado un turno cerrado, cuando el Gerente hace clic en su fila, entonces puede abrir el detalle del cierre y descargar el Reporte de Cierre en PDF de ese turno.

**Reglas de Negocio y Notas Técnicas:**

Para turnos cerrados se usan los valores congelados en el cierre (saldo_teorico, monto_fisico, diferencia_arqueo y cierre_detalle), que no se recalculan nunca. Para turnos abiertos se usa la función caja_resumen_efectivo. Diferencia = efectivo físico - saldo teórico (negativo = faltante, positivo = sobrante). Los cobros con tarjeta y transferencia se informan para la conciliación bancaria pero no forman parte de la diferencia de arqueo. Una misma caja puede tener varios turnos en el día. Zona horaria de Argentina. Permisos: Administrador y Gerente; validar token y rol en el backend.

### HU-48 — Dashboard Gerencial de Caja

- **Prioridad:** 48
- **Módulo:** Tesorería
- **Puntos de Función:** 13
- **Dependencias:** HU-29, HU-46, HU-47, HU-28; Login en el Backoffice (Seguridad y Accesos).

**Como** Gerente  
**Necesito** Un dashboard con los indicadores del día de todas las sucursales y cajas: ventas, efectivo en cajas, estado de cada caja, diferencias de arqueo y comparación con períodos anteriores.  
**Para** Tomar decisiones rápidas sobre la operación del día sin tener que revisar caja por caja.

**Criterios de Aceptación:**

1. Dado un Gerente que ingresa al dashboard, cuando carga la pantalla, entonces el sistema muestra los indicadores del día elegido: total vendido, cantidad de ventas, ticket promedio, efectivo total en cajas, total cobrado por medio de pago, cajas abiertas y cerradas, y la variación porcentual contra el mismo día de la semana anterior.
2. Dado el dashboard, cuando se visualizan los gráficos, entonces se muestran como mínimo las ventas por hora del día, la distribución por medio de pago y las ventas por sucursal y por caja, con las mismas cifras que el resumen diario (HU-47).
3. Dado el panel de alertas, cuando existe una caja con diferencia de arqueo mayor al umbral definido, una caja con efectivo por encima de LIMITE_SEGURIDAD_EFECTIVO ($500.000) o un turno que quedó abierto de un día anterior, entonces se lista destacado en rojo con un enlace a su detalle.
4. Dado el dashboard abierto, cuando transcurren 60 segundos, entonces los datos se refrescan sin recargar la página y se muestra la hora de la última actualización; el selector de fecha y sucursal permite cambiar el alcance de todos los indicadores.

**Reglas de Negocio y Notas Técnicas:**

Amplía el panel de monitoreo de cajas de HU-29 y reutiliza sus tarjetas por caja. Los indicadores se calculan en el servidor mediante agregaciones SQL, no en el navegador. Ventas del día: solo Confirmadas, sin Canceladas. LIMITE_SEGURIDAD_EFECTIVO fijo en $500.000 por ahora (configurable por sucursal en una etapa posterior). El umbral de diferencia de arqueo es configurable y su valor inicial lo define el Product Owner. Zona horaria de Argentina. Tiempo de carga menor a 3 segundos con un día de datos. Permisos: Administrador y Gerente (todas las sucursales); el backend no debe exponer datos de sucursales no autorizadas.

### HU-49 — Reporte PDF del Movimiento Diario de Caja

- **Prioridad:** 49
- **Módulo:** Tesorería
- **Puntos de Función:** 5
- **Dependencias:** HU-28, HU-46, HU-47.

**Como** Gerente  
**Necesito** Generar y descargar en PDF el reporte del movimiento de caja de un día, por sucursal o consolidado.  
**Para** Conservar un respaldo formal de la jornada y presentarlo a la gerencia o al contador.

**Criterios de Aceptación:**

1. Dado el Movimiento Diario o el Resumen de un día, cuando el Gerente presiona "Exportar PDF", entonces el sistema genera y descarga un PDF con encabezado (sucursal, fecha, usuario que lo genera, fecha y hora de generación), indicadores del día, resumen por caja y por medio de pago, diferencias de arqueo y el detalle cronológico.
2. Dado un filtro activo por sucursal, caja o cajero, cuando se genera el PDF, entonces el reporte refleja exactamente esos filtros y los indica en el encabezado; si se elige "Todas las sucursales", agrupa por sucursal con subtotales.
3. Dado un día con más de 150 filas de movimientos, cuando se genera el reporte, entonces se pagina correctamente con numeración "Página X de Y" y sin cortar filas ni dejar páginas en blanco.
4. Dado un usuario sin permisos o una fecha futura, cuando intenta generar el reporte, entonces el sistema responde con error de autorización o de validación y no genera ningún archivo.

**Reglas de Negocio y Notas Técnicas:**

Generación en el servidor, reutilizando el generador de PDF del Reporte de Cierre (pdfkit). Documento interno, no válido como factura. Los importes del PDF deben coincidir al centavo con la pantalla. Nombre de archivo: movimiento-caja-<sucursal>-<AAAA-MM-DD>.pdf. Registrar en auditoría quién generó el reporte y cuándo. Fechas y horas en zona horaria de Argentina.

### HU-50 — Identificación del Canal de Venta (Presencial y E-commerce)

- **Prioridad:** 50
- **Módulo:** Reportes
- **Puntos de Función:** 8
- **Dependencias:** HU-15, HU-16, HU-35, HU-36.

**Como** Sistema  
**Necesito** Que cada venta quede identificada por su canal (Presencial o E-commerce) y que ambos orígenes se consulten desde una única fuente de datos.  
**Para** Consolidar los ingresos de los dos canales sin duplicar ni perder ventas.

**Criterios de Aceptación:**

1. Dado una venta registrada en el POS, cuando se confirma, entonces queda guardada con canal "Presencial", junto con su sucursal, su sesión de caja y su usuario.
2. Dado un pedido del E-commerce con el pago confirmado, cuando se registra, entonces queda disponible para consulta con canal "E-commerce", con el medio de pago informado por la pasarela y sin asociarse a una caja física.
3. Dado el histórico de ventas existente, cuando se ejecuta la migración, entonces todas las ventas anteriores quedan marcadas como "Presencial" sin modificar sus totales ni sus fechas.
4. Dado un pedido del E-commerce con pago rechazado, pendiente, reembolsado o cancelado, cuando se consultan los ingresos, entonces no se computa como ingreso.

**Reglas de Negocio y Notas Técnicas:**

Crear una vista única en la base de datos (por ejemplo, v_ingresos_ventas) que unifique las ventas presenciales Confirmadas y los pedidos E-commerce pagos, con las columnas: fecha, canal, sucursal, medio de pago, monto, estado y referencia. Cada venta se cuenta una sola vez (clave canal + id). Los cobros del E-commerce no afectan el arqueo ni el saldo de efectivo de ninguna caja. Fecha del ingreso = fecha de confirmación del pago. Moneda: pesos argentinos. Decisión pendiente con el equipo de E-commerce: si los pedidos viven en la tabla ventas con un campo canal o en una tabla propia.

### HU-51 — Reporte de Ingresos por Ventas

- **Prioridad:** 51
- **Módulo:** Reportes
- **Puntos de Función:** 8
- **Dependencias:** HU-50, HU-15, HU-16, HU-35; Login en el Backoffice (Seguridad y Accesos).

**Como** Gerente  
**Necesito** Un reporte de los ingresos por ventas en un rango de fechas, que incluya el módulo presencial y el E-commerce.  
**Para** Conocer cuánto se vendió, por qué canal y con qué medios de pago ingresa el dinero.

**Criterios de Aceptación:**

1. Dado un Gerente en "Reporte de Ingresos", cuando elige un rango de fechas (máximo 12 meses) y presiona "Generar", entonces el sistema muestra el total de ingresos, la cantidad de ventas, el ticket promedio y el desglose por canal (Presencial y E-commerce).
2. Dado el reporte generado, cuando aplica filtros por canal, sucursal o medio de pago, o cambia la agrupación (día, semana o mes), entonces la tabla y el gráfico de evolución se recalculan y los totales coinciden con la suma de las filas.
3. Dado un total o una fila agrupada, cuando el Gerente hace clic, entonces ve el detalle de las ventas que la componen (comprobante o pedido, fecha, cliente, canal, medio de pago y monto).
4. Dado un rango sin ventas, cuando se genera el reporte, entonces muestra "Sin ingresos en el período" con los totales en cero; dado un rango inválido (fecha final anterior a la inicial o mayor a 12 meses), entonces el sistema informa el error de validación.

**Reglas de Negocio y Notas Técnicas:**

Ingreso = ventas Confirmadas del POS + pedidos E-commerce con pago confirmado. Se excluyen ventas Pendientes, Canceladas y pedidos no pagos. El importe es el total cobrado, con la lista de precios y los descuentos ya aplicados. Una venta con pagos mixtos se reparte entre los medios de pago utilizados. No incluye los ingresos manuales de caja (por ejemplo, reposición de cambio), porque no son ventas. Corte de fechas en zona horaria de Argentina. Agregaciones en el servidor. Permisos: Administrador y Gerente.

### HU-52 — Reporte de Egresos por Pagos a Proveedores

- **Prioridad:** 52
- **Módulo:** Reportes
- **Puntos de Función:** 8
- **Dependencias:** HU-23 (comprobantes de proveedor), módulo de Cuentas por Pagar (pagos a proveedores); Login en el Backoffice (Seguridad y Accesos).

**Como** Gerente  
**Necesito** Un reporte de los egresos de un período, formado únicamente por los pagos realizados a proveedores.  
**Para** Controlar cuánto dinero se paga a proveedores, a quiénes y cuándo.

**Criterios de Aceptación:**

1. Dado un Gerente o un Tesorero en "Reporte de Egresos", cuando elige un rango de fechas y presiona "Generar", entonces el sistema muestra el total pagado a proveedores, la cantidad de pagos y el desglose por proveedor ordenado de mayor a menor monto.
2. Dado el reporte generado, cuando filtra por proveedor o cambia la agrupación (día, semana o mes), entonces la tabla y el gráfico se recalculan y los totales coinciden con la suma de las filas.
3. Dado un proveedor del reporte, cuando hace clic en su fila, entonces ve el detalle de los pagos: fecha de pago, comprobante o cuenta por pagar imputada, monto pagado y usuario que lo registró.
4. Dado un período con cuentas por pagar todavía no canceladas, compras sin pagar o egresos manuales de caja, cuando se genera el reporte, entonces ninguno de ellos se incluye en los totales.

**Reglas de Negocio y Notas Técnicas:**

Egreso = pagos efectivamente registrados a proveedores (tabla pagos_cxp, por fecha_pago), es decir, criterio de caja y no devengado. NO incluye: egresos manuales de caja (HU-27), devoluciones a clientes ni otros gastos del comercio. Un pago parcial se computa por el monto efectivamente pagado. La agrupación por proveedor usa la razón social. Moneda: pesos argentinos. Corte de fechas en zona horaria de Argentina. Permisos: Administrador, Gerente y Tesorero.

### HU-53 — Balance de Ingresos y Egresos

- **Prioridad:** 53
- **Módulo:** Reportes
- **Puntos de Función:** 8
- **Dependencias:** HU-51, HU-52; Login en el Backoffice (Seguridad y Accesos).

**Como** Gerente  
**Necesito** Un balance que compare los ingresos por ventas con los egresos por pagos a proveedores en un período.  
**Para** Conocer el resultado neto de caja y la evolución del negocio.

**Criterios de Aceptación:**

1. Dado un Gerente en "Balance de Ingresos y Egresos", cuando elige un período (día, semana, mes o rango personalizado), entonces ve el Total de Ingresos, el Total de Egresos y el Resultado Neto (ingresos menos egresos), con el neto negativo destacado en rojo.
2. Dado el balance, cuando elige una agrupación (día, semana o mes), entonces un gráfico de barras compara ingresos contra egresos en cada intervalo y la tabla muestra el neto acumulado.
3. Dado el desglose, cuando el Gerente lo consulta, entonces ve los ingresos por canal (Presencial y E-commerce) y los egresos por proveedor (los 10 mayores y el resto agrupado).
4. Dado el balance, cuando activa "Comparar con el período anterior", entonces el sistema muestra la variación absoluta y porcentual de cada total.

**Reglas de Negocio y Notas Técnicas:**

Ingresos = HU-51; Egresos = HU-52 (únicamente pagos a proveedores). Debe mostrarse una leyenda aclarando que es un flujo de caja simplificado que no incluye otros gastos (sueldos, alquileres, impuestos, egresos manuales de caja) ni el costo de la mercadería. Los totales deben coincidir al centavo con los reportes HU-51 y HU-52 para el mismo filtro (misma fuente de datos). Permisos: Administrador y Gerente.

### HU-54 — Exportación a PDF de Reportes de Ingresos, Egresos y Balance

- **Prioridad:** 54
- **Módulo:** Reportes
- **Puntos de Función:** 5
- **Dependencias:** HU-49, HU-51, HU-52, HU-53.

**Como** Gerente  
**Necesito** Exportar a PDF cada uno de los reportes (Ingresos, Egresos y Balance) con los filtros que tiene aplicados.  
**Para** Entregar reportes formales a la gerencia o al contador y conservar un respaldo de cada período.

**Criterios de Aceptación:**

1. Dado un reporte de Ingresos, Egresos o Balance generado en pantalla, cuando el Gerente presiona "Exportar PDF", entonces se descarga un PDF con título, período, filtros aplicados, usuario, fecha y hora de generación, totales y la tabla de detalle.
2. Dado el PDF generado, cuando se compara con la pantalla, entonces los importes y cantidades coinciden al centavo.
3. Dado un reporte con más de 500 filas, cuando se exporta, entonces el PDF se pagina con numeración "Página X de Y" y se genera en menos de 10 segundos.
4. Dado un usuario sin permisos sobre el reporte, cuando intenta exportarlo, entonces el sistema responde con error de autorización y no genera el archivo.

**Reglas de Negocio y Notas Técnicas:**

Generación en el servidor reutilizando el generador de PDF existente (pdfkit). Documento interno, no válido como factura. Registrar en auditoría quién exportó cada reporte y cuándo. Nombre de archivo con tipo de reporte y período. El gráfico de evolución en el PDF es deseable pero no obligatorio en esta historia. El reporte PDF del movimiento diario de caja se resuelve en HU-49.

### HU-55 — Login del Cliente en la Tienda Web (DNI y Correo Electrónico)

- **Prioridad:** 55
- **Módulo:** E-commerce
- **Puntos de Función:** 13
- **Dependencias:** HU-33 (sesión y registro del cliente), HU-20 (búsqueda de clientes), HU-34 y HU-35 (el checkout exige cliente identificado), HU-36 (Panel de Pedidos / Tus envíos); convive con HU-46 y HU-47 (auth.users compartido con el ERP).

**Como** Cliente Externo  
**Necesito** Identificarme en la tienda web con mi DNI o con el correo electrónico registrado en mi cuenta de cliente (verificado con un código de un solo uso enviado a ese correo), y que mi sesión se mantenga mientras navego, para comprar y consultar mis envíos sin volver a identificarme en cada pantalla.  
**Para** Comprar online de forma segura y ágil, con la certeza de que solo yo puedo ver o modificar mis datos, mis compras y mis envíos.

**Criterios de Aceptación:**

1. Dado un cliente sin sesión, cuando pulsa "Ingresar" y escribe su correo electrónico, entonces el sistema responde siempre el mismo mensaje, envía un código de 6 dígitos de un solo uso a ese correo y, al ingresarlo, abre una sesión persistente; si el correo coincide con el email de un cliente activo, queda identificado sin pedirle más datos.
2. Dado un cliente con el correo verificado pero sin registro asociado, cuando ingresa su DNI, entonces: (a) si no existe, completa el alta (nombre, teléfono y dirección; correo bloqueado con el verificado); (b) si existe sin email (cliente histórico), confirma los últimos 4 dígitos de su teléfono y el sistema le asocia el correo; (c) si ya tiene otro correo, no se vincula y se le indica ingresar con su DNI.
3. Dado un cliente que ingresa solo con su DNI, cuando lo envía, entonces el sistema responde siempre el mismo mensaje, envía un código real de un solo uso al correo registrado (reemplaza al código fijo de prueba) y no devuelve datos del cliente al navegador; un código incorrecto, vencido o tras 5 intentos se rechaza con mensaje genérico, y un cliente con estado = false no ingresa aunque el código sea válido.
4. Dado un cliente con sesión, cuando navega, recarga la página o vuelve de Mercado Pago, entonces sigue identificado y conserva su carrito; sin sesión, "Continuar con el pago" abre el login, y el checkout y "Tus envíos" usan al cliente de la sesión, no los datos enviados por el navegador.
5. Dado un cliente con sesión, cuando pulsa "Cerrar sesión", entonces se destruye la sesión y el botón "Atrás" no vuelve a mostrar sus datos; dado un visitante sin sesión, cuando consulta o modifica datos de clientes o envíos por la API, entonces recibe 401/403.

**Reglas de Negocio y Notas Técnicas:**

Sin tablas nuevas: identidad = correo verificado por Supabase Auth (código de un solo uso enviado al correo, de cualquier dominio) + DNI; el vínculo es clientes.email (en minúsculas) contra auth.users, con índice único parcial sobre lower(email) previo diagnóstico de duplicados. Los clientes no están en public.usuarios: su sesión nunca habilita el ERP (HU-46). El backend valida el token Bearer en /api/clientes, /api/checkout y /api/envios; se elimina el GET /api/clientes?dni= público (hoy devuelve la fila completa) y el código fijo "123456". OWASP: mensajes anti-enumeración, códigos de vencimiento corto, límite de intentos y reenvíos por IP, DNI y correo, y log de accesos fallidos. El carrito se guarda en localStorage para sobrevivir a la recarga. Requiere configurar la plantilla del correo con {{ .Token }} y un SMTP propio. Revisar RLS: la clave anon es pública.

### HU-56 — Rediseño y Embellecimiento del Frontend de la Tienda Web

- **Prioridad:** 56
- **Módulo:** E-commerce
- **Puntos de Función:** 8
- **Dependencias:** HU-07 (catálogo), HU-32 (PWA), HU-33 (carrito), HU-34 (validación de stock en tiempo real).

**Como** Cliente Externo  
**Necesito** Una tienda con página de inicio atractiva, un catálogo con filtros en una barra lateral y fichas de producto desde las que pueda agregar al carrito, viendo primero los instrumentos que tienen stock.  
**Para** Encontrar y comprar instrumentos de forma rápida y cómoda desde cualquier dispositivo, con una imagen coherente con la marca.

**Criterios de Aceptación:**

1. Dado un cliente que ingresa a la raíz (/), cuando carga la página, entonces ve un carrusel principal, una franja de beneficios, los carruseles "Algunos de nuestros productos estrella" (con stock, al azar), "Imperdibles" (últimos ingresos) y "Preferidos por los clientes" (más vendidos), sin repetir artículos, y el carrusel "Nuestras marcas", donde cada marca lleva al catálogo filtrado.
2. Dado cualquier pantalla de la tienda, cuando el cliente la recorre, entonces el logo y "Inicio" llevan a la página de inicio y el pie muestra solo el contacto: teléfono +54 9 387569305 (llamada y WhatsApp), MarioAGuerrisi@gmail.com, Caseros 1056 y Galería Margalef (ambas en Salta Capital, con enlace a Google Maps).
3. Dado un cliente en /catalogo desde un escritorio, cuando carga la pantalla, entonces los filtros (Disponibilidad, Categorías, Marca y Origen) quedan en una barra lateral izquierda fija y los resultados ocupan el resto del ancho en grilla, con buscador, orden, vista grilla/lista y paginación; en un móvil los filtros se abren en un modal y los productos se ven en 2 columnas sin scroll horizontal.
4. Dado una ficha de producto (en el catálogo o en la landing), cuando el cliente pulsa "Agregar al carrito", entonces el artículo se suma, el botón confirma con "¡Agregado!", la ficha muestra un selector de cantidad con tope en las "últimas unidades" y el encabezado actualiza cantidad y total al instante; sin stock, el botón queda deshabilitado.
5. Dado un cliente que entra a /catalogo sin filtros, cuando se carga el listado, entonces solo ve artículos con stock; con "Sin stock" o "Todos" (los de stock primero) el total y la paginación son coherentes, y si no hay resultados con stock se ofrece "Ver también los sin stock".

**Reglas de Negocio y Notas Técnicas:**

Solo capa de presentación y lectura: no cambia el checkout ni la reserva de stock (HU-34). Se mantienen la paleta Guerrisi, la tipografía Inter y el sistema de diseño, sin librerías nuevas. La landing se renderiza en el servidor sin caché; cada sección falla por separado y un carrusel con menos de 3 artículos no se muestra. Disponibilidad = Σ por depósito activo de max(cantidad − cantidad_reservada, 0) (regla de HU-32), sin exponer el stock físico. "Preferidos" suma ventas_detalle.cantidad de ventas Confirmadas. La tabla marcas no tiene logo (se usa el nombre) y no se muestran ofertas ni cuotas porque el sistema no los maneja. Carruseles accesibles por teclado y táctil, con autoplay que respeta prefers-reduced-motion; objetivos táctiles de 40 px o más. Los datos de contacto viven en un único archivo de configuración.

## Supuestos y decisiones a validar

1. Numeración: se pidió comenzar en HU-46, pero docs/sprint4/Sprint4.md ya usa HU-46 (Login) y HU-47 (Gestión de Sesión). Hay que renumerar o coordinar con el equipo de Seguridad y Accesos.
2. Prioridad: sigue la convención del equipo (la prioridad coincide con el número de la historia).
3. Puntos de Función: son una estimación inicial propuesta (escala 3, 5, 8, 13 usada en los sprints anteriores); deben validarse con el equipo.
4. Módulo "Reportes": nombre propuesto para HU-50 a HU-54; no existe todavía en los backlogs anteriores.
5. Egresos = únicamente pagos a proveedores (tabla pagos_cxp). Los egresos manuales de caja (HU-27) quedan fuera de los reportes generales y solo aparecen en el movimiento diario de caja.
6. Ingresos = ventas del POS (Confirmadas) + pedidos E-commerce con pago confirmado. Depende de cómo el equipo de E-commerce guarde los pedidos (ver HU-50).
7. LIMITE_SEGURIDAD_EFECTIVO = $500.000 (valor definido por el equipo para la alerta de retiro de valores).
8. Rol "Gerente" tomado de constants/roles.js del repositorio. Los endpoints nuevos deben validar token y rol en el backend.
