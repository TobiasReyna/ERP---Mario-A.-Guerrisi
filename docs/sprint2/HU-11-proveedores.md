# HU-11 — Gestión de Proveedores (Sprint 2)

## Estado
**Terminado y conectado a Supabase de punta a punta.** Frontend, backend
(Express) y base de datos ya están wireados entre sí.

## Historial de la implementación
Cuando se armó el frontend, la base de datos no tenía todavía las tablas
`proveedores` ni `ordenes_compra`/`ordenes_compra_detalle` (estas últimas,
dependencia de HU-12/HU-13). Para no bloquear el desarrollo,
`erp-front/src/services/supplierService.js` simuló la persistencia en memoria
del lado del cliente, con la misma firma de funciones que iba a tener el
service real.

Con el SQL real de Supabase se confirmó que el equipo de base de datos ya
había creado `proveedores` (con `razon_social`, `cuit`, `email`, `telefono`,
`condicion_pago`, `estado`) y también `ordenes_compra` /
`ordenes_compra_detalle` (HU-12/HU-13) y `cuentas_por_pagar` / `pagos_cxp`
(HU-14). Como el frontend ya manejaba `nombre_contacto`, `direccion`, `notas`
y `fecha_hora_registro` — campos que esa tabla no tenía — se aplicó
`docs/sprint2/migracion_proveedores_campos_adicionales.sql` para agregarlos
sin tocar los datos existentes, y se reemplazó por completo
`erp-front/src/services/supplierService.js` por un service que llama a
`http://localhost:3001/api/suppliers` (mismo patrón que `articleService`).
`Gestion_de_proveedores.jsx` no necesitó cambios, salvo el comentario de
cabecera, porque ya consumía ese service por su firma.

## Criterios de aceptación cubiertos (frontend)
1. **Alta de proveedor**: exige razón social, CUIT con validación de formato
   argentino (11 dígitos + dígito verificador módulo 11, `utils/cuit.js`),
   teléfono, email y condición de pago.
2. **CUIT duplicado**: se verifica en vivo mientras se escribe y también al
   confirmar el alta/edición; si ya existe, se rechaza y se muestra un link
   directo a la ficha del proveedor existente.
3. **Ficha de proveedor**: datos completos + historial de órdenes de compra y
   monto total operado. Hoy el historial siempre está vacío porque depende de
   HU-12/HU-13 (no implementadas); la UI y el service ya están preparados
   para mostrarlo apenas exista la tabla `ordenes_compra`.
4. **Aprobación en homologación**: es un paso de proceso (Definición de
   Terminado), no una pantalla — no aplica una implementación de UI.

## Archivos nuevos — Frontend
- `erp-front/src/utils/cuit.js` — validación y formateo de CUIT.
- `erp-front/src/services/supplierService.js` — mock temporal de persistencia.
- `erp-front/src/pages/Gestion_de_proveedores.jsx` — página completa (listado,
  alta/edición, baja/reactivación, ficha con historial).
- `App.jsx` — nuevo grupo de navegación "Compras" → "Proveedores", ruta
  `/Gestion_de_proveedores`.

## Archivos nuevos — Backend (listos, no wireados a datos reales aún)
- `erp-backend/services/supplierService.js`
- `erp-backend/controllers/supplierController.js` (valida CUIT también del
  lado del servidor, por si algún cliente no pasa por el frontend web)
- `erp-backend/routes/supplierRoutes.js`
- `server.js` — registra `app.use('/api/suppliers', supplierRoutes)`

## Pendiente para el equipo de base de datos
1. **Ejecutar** `docs/sprint2/migracion_proveedores_campos_adicionales.sql`
   contra Supabase (agrega `nombre_contacto`, `direccion`, `notas`,
   `fecha_hora_registro`, `fecha_hora_actualizacion` + el trigger de
   timestamp a `public.proveedores`, que ya existía con el resto de las
   columnas). Es idempotente (`ADD COLUMN IF NOT EXISTS`).
2. `docs/sprint2/ddl_hu11_proveedores.sql` queda como referencia histórica del
   diseño original; no hace falta correrlo porque la tabla ya existe.

## Cómo levantar el flujo completo
1. `cd erp-backend && node server.js` (puerto 3001; usa `SUPABASE_SERVICE_KEY`
   de `.env`, que ignora RLS).
2. `cd erp-front && npm run dev` y entrar a Compras → Proveedores.
3. El listado, alta/edición, baja/reactivación y ficha con historial de OC ya
   pegan contra Supabase real a través de `/api/suppliers`.
