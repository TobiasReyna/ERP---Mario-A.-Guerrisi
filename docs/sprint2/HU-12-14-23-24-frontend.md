# HU-12, HU-14, HU-23 y HU-24 — Frontend (Sprint 2)

## Estado
**Frontend terminado** para las 4 historias. Ningún endpoint nuevo de backend
fue creado — es intencional, según lo pedido: dejar el front funcionando de
forma aislada y documentar acá lo que el equipo de backend necesita para
conectarlo.

Las únicas llamadas reales a `erp-backend` son de **solo lectura**, sobre
endpoints que ya existen y ya funcionan:
- `GET /api/articles` — catálogo de artículos (para elegir qué cotizar / qué
  devolver).
- `GET /api/suppliers/todos` — proveedores (para invitar a cotizar).
- `GET /api/deposits` — depósitos (para elegir a qué depósito vuelve el
  stock de una Nota de Crédito).

Todo lo demás (cotizaciones, órdenes de compra, cuentas por pagar, pagos,
notas de crédito/débito, clientes B2B) vive en **mocks en memoria** dentro de
cada `services/*.js` nuevo, que se reinician al recargar la página. Cada
service tiene comentarios en el encabezado explicando exactamente esto.

## Páginas y services nuevos

| HU | Página | Ruta | Service(s) |
|----|--------|------|------------|
| HU-12 | Cotizaciones y Órdenes de Compra | `/Cotizaciones_ordenes_compra` | `purchasingService.js` |
| HU-14 | Cuentas por Pagar | `/Cuentas_por_pagar` | `cxpService.js` |
| HU-23 | Notas de Crédito y Débito | `/Notas_credito_debito` | `creditNotesService.js`, `clientsService.js` |
| HU-24 | Límites de Crédito | `/Limites_de_credito` | `clientsService.js` |

Todas quedaron enganchadas en `App.jsx` (rutas + sidebar, grupos "Compras" y
"Tesorería" nuevo).

## Qué necesita el backend para cada una

### HU-12 — Cotizaciones y Órdenes de Compra
Tablas ya existentes en el SQL real: `cotizaciones`, `cotizaciones_detalle`,
`cotizaciones_proveedores`, `cotizaciones_proveedores_detalle`,
`ordenes_compra`, `ordenes_compra_detalle`.

Endpoints sugeridos (mismo patrón que `supplierController`/`articleController`):
- `POST /api/quotes` — crea `cotizaciones` + `cotizaciones_detalle` +
  `cotizaciones_proveedores` (una fila por proveedor invitado), y dispara el
  envío real por email (hoy el frontend solo simula el envío marcando estado
  `Enviada`).
- `GET /api/quotes` / `GET /api/quotes/:id` — listado y detalle.
- Falta decidir **cómo entra la respuesta del proveedor**: ¿un formulario
  público con un token por `cotizaciones_proveedores.id`? ¿carga manual por
  un usuario interno? El frontend hoy la simula con
  `simularRespuestaProveedor()`, que rellena `cotizaciones_proveedores_detalle`
  con precios aleatorios — ese botón ("Simular respuesta recibida") hay que
  sacarlo una vez que exista el flujo real.
- `POST /api/quotes/:id/approve` — recibe el `proveedor_id` ganador, pasa la
  cotización a `Aprobada`, y genera la `orden_compra` (+ detalle) copiando
  cantidades de `cotizaciones_detalle` y precios de
  `cotizaciones_proveedores_detalle` del ganador. Esto es exactamente lo que
  hace `aprobarYGenerarOrdenCompra()` en el mock.
- `GET /api/purchase-orders` / `GET /api/purchase-orders/:id`.
- `POST /api/purchase-orders/:id/receive` — recibe `[{ detalleId, cantidad }]`,
  incrementa `cantidad_recibida` por línea (tope: `cantidad_solicitada`) y
  recalcula el estado de la cabecera (`Pendiente` → `Parcial` → `Recibida`).
  Acá también debería dispararse el alta en `existencias` (sumar stock) y,
  si hay `saldo_pendiente` en 0 para todas las líneas, la generación
  automática de la fila en `cuentas_por_pagar` (ver HU-14 abajo).
- `PATCH /api/purchase-orders/:id/cancel` — solo si `estado = 'Pendiente'`.

### HU-14 — Cuentas por Pagar
Tablas: `cuentas_por_pagar`, `pagos_cxp`.

En el sistema real, `cuentas_por_pagar` la genera automáticamente HU-13 al
confirmar la recepción de una orden de compra (no hay alta manual). El mock
de HU-14 seedea cuentas directamente para poder mostrar el flujo aislado.

Endpoints sugeridos:
- `GET /api/accounts-payable?proveedorId=&estado=&vencidoDesde=&vencidoHasta=`
- `POST /api/accounts-payable/:id/payments` — body `{ monto_pagado }`, valida
  `monto_pagado <= saldo_pendiente`, inserta en `pagos_cxp`, actualiza
  `saldo_pendiente` y `estado` (`Pagada` si llega a 0).
- Un job (cron o trigger) que recalcule `estado = 'Mora'` para toda cuenta
  `Pendiente` con `fecha_vencimiento < now()`. El mock lo simula
  recalculando en cada `listarCuentasPorPagar()`.

### HU-23 — Notas de Crédito y Débito
Tablas: `notas_credito_debito`, `notas_credito_debito_detalle`.
Depende de `ventas_mock_origen`, que sigue siendo una tabla puente hasta que
exista el módulo de Ventas real.

⚠️ **Inconsistencia a resolver con el equipo de base de datos**: el SQL real
define `numero_comprobante` con una única secuencia compartida
(`sq_notas_credito_debito_numero`) para NC y ND juntas, pero la regla de
negocio de la HU-23 pide **numeración correlativa independiente por tipo de
comprobante**. El mock del frontend (`creditNotesService.js`) simula
numeración independiente por tipo (`NC-0001`, `ND-0001`, ...) porque es lo
que pide el criterio de aceptación — hay que decidir si conviene una
secuencia por tipo en la base, o aplicar el prefijo en la capa de aplicación
sobre la secuencia compartida existente.

Endpoints sugeridos:
- `GET /api/credit-debit-notes?tipo=&desde=&hasta=`
- `POST /api/credit-debit-notes` — valida `factura_origen_id` obligatorio
  (ya lo exige el `NOT NULL` + FK de la tabla), inserta la nota y sus líneas
  en `notas_credito_debito_detalle` si `afecta_inventario = true`. Si
  `afecta_inventario`, este es el punto donde debería dispararse el
  incremento real de `existencias` (sumar `cantidad` al depósito indicado
  por línea) — el frontend hoy solo simula esto con un aviso, no escribe
  nada en `existencias`.
- `GET /api/credit-debit-notes/summary?desde=&hasta=` — para el reporte de
  totales netos del período (criterio de aceptación 3); el mock lo resuelve
  en el cliente con `obtenerResumenPeriodo()`.

### HU-24 — Límites de Crédito
Tabla: `clientes` (ya existe con `limite_credito` y `saldo_actual`). No hay
controller/service de clientes en el backend todavía.

Endpoints sugeridos:
- `GET /api/clients` — listado con saldo y límite.
- `PUT /api/clients/:id/credit-limit` — body `{ limite_credito }`, solo rol
  Gerente.
- El "bloqueo automático" (criterio de aceptación 2/3) hoy es puramente
  informativo en el frontend (`saldo_actual >= limite_credito` → badge
  "Bloqueado"). La validación real tiene que vivir en el futuro endpoint de
  ventas (HU-15/16), consultando esta misma regla antes de confirmar una
  venta a cuenta corriente.

## Cómo reemplazar cada mock cuando el backend esté listo
Mismo patrón que se usó para HU-11 (`supplierService.js`): cada función del
service mock tiene la misma firma que va a tener la versión real con `fetch`.
Al reemplazar la implementación interna por llamadas a los endpoints de
arriba, ninguna de las 4 páginas debería necesitar cambios — igual que pasó
con `Gestion_de_proveedores.jsx` en HU-11.
