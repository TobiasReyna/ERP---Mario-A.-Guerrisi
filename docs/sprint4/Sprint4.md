# Sprint 4 — Mario A. Guerrisi (ERP)

## Resumen

| Código | Prioridad | Módulo | Nombre Instancia | Como | Puntos | Dependencias | Nota |
|---|---|---|---|---|---|---|---|
| HU-32 | 32 | E-commerce | Plataforma Web Responsiva (PWA) | Cliente Externo | 13 | HU-07 (catálogo), HU-34 (validación de stock en tiempo real). | — |
| HU-33 | 33 | E-commerce | Gestión de Sesión y Carrito de Compras | Cliente Externo | — | HU-07 (catálogo), HU-18 (listas de precios). | CAMBIAR |
| HU-34 | 34 | E-commerce | Validación de Stock en Tiempo Real | Sistema | — | HU-01 (stock), HU-19 (descuento de stock en tiempo real). | HECHA |
| HU-35 | 35 | E-commerce | Integración de Pasarelas de Pago | Cliente Externo | — | HU-33 (carrito), HU-34 (validación de stock). | HECHA |
| HU-36 | 36 | E-commerce | Panel de Pedidos del Cliente | Cliente Externo | — | HU-33, HU-35 (pago confirmado). | REVISAR |
| HU-18 | 18 | Venta | Descuentos y Listas de Precios Diferenciadas | Gerente | 8 | HU-07 (catálogo), HU-20 (clientes). | REVISAR Y AGREGAR MAS |
| HU-21 | 21 | Tesorería | Gestión de Control de Caja | Cajero | 8 | HU-15, HU-16 (métodos de pago). | HACER MAS HISTORIAS |
| HU-46 | 46 | Seguridad y Accesos | Login en el Backoffice (ERP) | Empleado (Usuario del Sistema) | 5 | Ninguna | HACER HISTORIAS DE LOGIN |
| HU-47 | 47 | Seguridad y Accesos | Gestión de Sesión (Logout y Expiración) | Empleado (Usuario del Sistema) | 3 | HU-46 | — |

---

## Detalle de historias

### HU-32 — Plataforma Web Responsiva (PWA)

| Campo | Contenido |
|---|---|
| Prioridad | 32 |
| Módulo | E-commerce |
| Como | Cliente Externo |
| ¿Qué necesito? | Acceder desde móvil a tienda web con catálogo sincronizado para buscar productos |
| ¿Para qué? | Comprar online desde cualquier dispositivo |
| Puntos de Función | 13 |
| Dependencias | HU-07 (catálogo), HU-34 (validación de stock en tiempo real). |

**Criterios de Aceptación**

1. Dado un cliente externo desde un dispositivo móvil, cuando accede a la tienda web, entonces la interfaz se adapta correctamente al tamaño de pantalla (responsive) sin pérdida de funcionalidad.
2. Dado el catálogo del ERP central, cuando se actualiza un precio o stock, entonces la tienda web refleja el cambio en un plazo máximo definido (ej. near real-time, menor a 1 minuto).
3. Dado una búsqueda de productos en la tienda web, cuando el cliente ingresa un término, entonces obtiene resultados relevantes en menos de 2 segundos.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

Arquitectura PWA (Progressive Web App) con sincronización de catálogo vía API/eventos desde el ERP central. Debe garantizar compatibilidad con los navegadores modernos más usados (Chrome, Safari, Firefox, Edge, últimas 2 versiones).

---

### HU-33 — Gestión de Sesión y Carrito de Compras

| Campo | Contenido |
|---|---|
| Prioridad | 33 |
| Módulo | E-commerce |
| Como | Cliente Externo |
| ¿Qué necesito? | Registrarme, gestionar direcciones y agregar items al carrito con subtotales en tiempo real |
| ¿Para qué? | Procesar compras online de forma segura |
| Puntos de Función | — |
| Dependencias | HU-07 (catálogo), HU-18 (listas de precios). |
| Nota | CAMBIAR |

**Criterios de Aceptación**

1. Dado un cliente externo nuevo, cuando se registra en la tienda web, entonces el sistema valida formato de email y exige contraseña segura (mínimo de complejidad definido).
2. Dado un carrito con productos agregados, cuando el cliente navega a otra sección o cierra el navegador, entonces el carrito persiste al reingresar (sesión o cuenta).
3. Dado ítems en el carrito, cuando se modifican cantidades, entonces el sistema recalcula el subtotal en tiempo real sin recargar la página.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

El carrito debe persistir server-side (asociado a la cuenta o a un token de sesión) para sobrevivir a cierres de navegador. Los descuentos configurados en listas de precios (HU-18) deben aplicarse también en el canal web.

---

### HU-34 — Validación de Stock en Tiempo Real

| Campo | Contenido |
|---|---|
| Prioridad | 34 |
| Módulo | E-commerce |
| Como | Sistema |
| ¿Qué necesito? | Bloquear compra web si no hay stock real en la BD central |
| ¿Para qué? | Evitar sobreventas y mantener consistencia |
| Puntos de Función | — |
| Dependencias | HU-01 (stock), HU-19 (descuento de stock en tiempo real). |
| Nota | HECHA |

**Criterios de Aceptación**

1. Dado un producto en el carrito, cuando el cliente inicia el checkout, entonces el sistema valida el stock real contra la base de datos central antes de habilitar el pago.
2. Dado un producto sin stock suficiente al momento de pagar, cuando se intenta confirmar, entonces el sistema bloquea la compra y muestra un mensaje de stock insuficiente.
3. Dado un checkout iniciado, cuando el cliente avanza al pago, entonces el sistema reserva temporalmente el stock por un tiempo limitado (ej. 10 minutos) para evitar sobreventa entre canales.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

Requiere sincronización con garantías ACID entre el canal e-commerce y el ERP central (misma fuente de verdad de stock). La reserva temporal (soft-lock) debe liberarse automáticamente si el pago no se completa dentro del plazo.

---

### HU-35 — Integración de Pasarelas de Pago

| Campo | Contenido |
|---|---|
| Prioridad | 35 |
| Módulo | E-commerce |
| Como | Cliente Externo |
| ¿Qué necesito? | Procesar pago con pasarelas locales (ej. MercadoPago) |
| ¿Para qué? | Ofrecer múltiples opciones de pago |
| Puntos de Función | — |
| Dependencias | HU-33 (carrito), HU-34 (validación de stock). |
| Nota | HECHA |

**Criterios de Aceptación**

1. Dado un checkout con monto a pagar, cuando el cliente selecciona una pasarela (ej. MercadoPago), entonces el sistema redirige o embebe el flujo de pago mediante su SDK/API oficial.
2. Dado un pago aprobado por la pasarela, cuando se recibe la confirmación (webhook), entonces el sistema actualiza automáticamente el estado del pedido a 'Pagado'.
3. Dado un error o rechazo en el pago, cuando ocurre, entonces el sistema informa el motivo al cliente y no descuenta stock definitivo.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

Cumplimiento PCI-DSS: no almacenar datos sensibles de tarjeta en el ERP; delegar el manejo de datos de pago íntegramente a la pasarela. Implementar manejo idempotente de webhooks para evitar duplicar confirmaciones de pago.

---

### HU-36 — Panel de Pedidos del Cliente

| Campo | Contenido |
|---|---|
| Prioridad | 36 |
| Módulo | E-commerce |
| Como | Cliente Externo |
| ¿Qué necesito? | Visualizar estado actualizado de mis pedidos y seguimiento de compra |
| ¿Para qué? | Monitorear entrega de pedidos |
| Puntos de Función | — |
| Dependencias | HU-33, HU-35 (pago confirmado). |
| Nota | REVISAR |

**Criterios de Aceptación**

1. Dado un cliente externo autenticado, cuando accede a 'Mis Pedidos', entonces visualiza el historial completo con estado actualizado de cada uno.
2. Dado un pedido en tránsito, cuando cambia su estado (preparación, despacho, entrega), entonces el sistema notifica automáticamente al cliente.
3. Dado un pedido despachado con número de seguimiento, cuando el cliente lo consulta, entonces accede al link o código de seguimiento del transportista.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

El estado del pedido debe sincronizarse con los procesos internos (venta confirmada, preparación en depósito, despacho) mediante eventos, no polling manual.

---

### HU-18 — Descuentos y Listas de Precios Diferenciadas

| Campo | Contenido |
|---|---|
| Prioridad | 18 |
| Módulo | Venta |
| Como | Gerente |
| ¿Qué necesito? | Definir listas de precios diferenciadas (por volumen B2B o precio sugerido al público) |
| ¿Para qué? | Automatizar facturación según categoría de cliente |
| Puntos de Función | 8 |
| Dependencias | HU-07 (catálogo), HU-20 (clientes). |
| Nota | REVISAR Y AGREGAR MAS |

**Criterios de Aceptación**

1. Dado un Gerente autenticado, cuando define una lista de precios (ej. 'Mayorista B2B'), entonces puede asociarla a uno o varios clientes o grupos de clientes.
2. Dado un cliente con lista de precios asignada, cuando el vendedor lo selecciona en el POS, entonces los precios se aplican automáticamente sin intervención manual.
3. Dado dos listas de precios distintas para un mismo artículo, cuando el Gerente las compara, entonces el sistema muestra el margen resultante para cada una.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

Modelo de datos: tabla listas_precios y tabla precio_por_lista (lista_id, artículo_id, precio). La asignación cliente-lista debe resolverse antes de renderizar el catálogo en el POS para evitar demoras.

---

### HU-21 — Gestión de Control de Caja

| Campo | Contenido |
|---|---|
| Prioridad | 21 |
| Módulo | Tesorería |
| Como | Cajero |
| ¿Qué necesito? | Apertura con fondo inicial, registro de ingresos/egresos, arqueo y cierre de caja |
| ¿Para qué? | Controlar efectivo diario y cuadrar arqueos de turno |
| Puntos de Función | 8 |
| Dependencias | HU-15, HU-16 (métodos de pago). |
| Nota | HACER MAS HISTORIAS |

**Criterios de Aceptación**

1. Dado el inicio de turno, cuando el cajero abre la caja, entonces el sistema exige el registro de un fondo inicial (monto declarado).
2. Dado movimientos de ingreso y egreso durante el turno, cuando se registran, entonces cada uno queda asociado al usuario y timestamp correspondiente.
3. Dado el cierre de turno, cuando el cajero realiza el arqueo, entonces el sistema compara el efectivo declarado contra el calculado por el sistema y registra la diferencia si existe.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

El cierre de caja debe generar un reporte diario inmutable (no editable posteriormente) que sirva de base para auditoría. Las diferencias de arqueo deben quedar registradas con el usuario responsable.

---

### HU-46 — Login en el Backoffice (ERP)

| Campo | Contenido |
|---|---|
| Prioridad | 46 |
| Módulo | Seguridad y Accesos |
| Como | Empleado (Usuario del Sistema) |
| ¿Qué necesito? | Iniciar sesión en el panel de administración (ERP) utilizando mi correo electrónico y contraseña. |
| ¿Para qué? | Validar mi identidad y acceder de forma segura a los módulos de gestión correspondientes a mi rol operativo. |
| Puntos de Función | 5 |
| Dependencias | Ninguna |
| Nota | HACER HISTORIAS DE LOGIN |

**Criterios de Aceptación**

1. Dado un empleado con cuenta activa, cuando ingresa su email y contraseña válidos en la pantalla de login, entonces el sistema lo autentica y lo redirige al dashboard principal del ERP.
2. Dado un intento de acceso con un email no registrado o contraseña incorrecta, cuando el usuario envía el formulario, entonces el sistema rechaza el ingreso y muestra un mensaje de error genérico ("Credenciales inválidas") para evitar la enumeración de usuarios.
3. Dado un empleado cuyo estado en la tabla usuarios ha sido marcado como inactivo (estado = false), cuando intenta iniciar sesión, entonces el sistema bloquea el ingreso indicando que la cuenta está deshabilitada, incluso si la contraseña es la correcta.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

Si se utiliza Supabase Auth, la identidad se gestiona en la tabla interna auth.users. El backend o frontend debe leer el UUID generado allí y cruzarlo con la tabla public.usuarios para obtener el rol_id y habilitar los permisos. Las contraseñas nunca deben viajar en texto plano.

---

### HU-47 — Gestión de Sesión (Logout y Expiración)

| Campo | Contenido |
|---|---|
| Prioridad | 47 |
| Módulo | Seguridad y Accesos |
| Como | Empleado (Usuario del Sistema) |
| ¿Qué necesito? | Cerrar mi sesión de forma segura y que el sistema detecte automáticamente mi inactividad. |
| ¿Para qué? | Evitar que personas no autorizadas operen el ERP en mi nombre si dejo mi computadora desatendida. |
| Puntos de Función | 3 |
| Dependencias | HU-46 |

**Criterios de Aceptación**

1. Dado un empleado con sesión activa en el ERP, cuando hace clic en "Cerrar Sesión" (Logout), entonces el sistema destruye su token de acceso y lo redirige a la pantalla de login.
2. Dado un token de sesión caducado por tiempo, cuando el empleado intenta realizar una acción o moverse a otra pantalla, entonces el sistema intercepta la petición, limpia la sesión local y exige loguearse de nuevo.
3. Dado un usuario que acaba de cerrar sesión, cuando intenta usar el botón "Atrás" del navegador web, entonces el sistema bloquea la renderización de las pantallas internas del ERP y lo mantiene en el login.
4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

**Reglas de Negocio y Notas Técnicas**

El token JWT o cookie de sesión debe configurarse con un tiempo de vida (TTL) alineado a la jornada laboral (ej. 8 a 12 horas). El frontend (React) debe implementar "Route Guards" (Rutas Privadas) para verificar que exista un token válido antes de renderizar cualquier vista.

---
