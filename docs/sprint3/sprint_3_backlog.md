# Sprint 3 Backlog

## HU-15 - Módulo POS para Ventas Presenciales

* **Prioridad:** 15 | **Módulo:** Venta | **Puntos de Función:** 13
* **Como:** Vendedor / Cajero
* **¿Qué necesito?** Crear cotizaciones y convertirlas en órdenes de venta validando stock disponible
* **¿Para qué?** Procesar ventas rápidas en mostrador con confirmación de stock

**Criterios de Aceptación:**

1. Dado un Vendedor/Cajero autenticado, cuando busca un producto por nombre, código o escaneo, el sistema devuelve los resultados en menos de 1 segundo mostrando el stock disponible en pantalla.
2. Dado una cotización en curso, cuando el cliente confirma la compra, el sistema la convierte en una Orden de Venta validando el stock en tiempo real en la base de datos antes de efectuar el cobro.
3. Dado un descuento que excede el porcentaje máximo autorizado para el rol, cuando el cajero intenta aplicarlo, el componente React de la interfaz despliega un modal bloqueante que exige el ingreso de un PIN de autorización gerencial.

**Reglas de Negocio y Notas Técnicas:**
Punto crítico de Severidad 1 según el pliego (caída del POS = bloqueante). Debe validar stock en tiempo real contra la base central antes de confirmar cada línea, evitando sobreventas por condiciones de carrera con otras cajas simultáneas.

**Dependencias:**
HU-01 (stock), HU-07 (catálogo), HU-17 (impuestos por ítem), HU-19 (descuento de stock en tiempo real), HU-20 (búsqueda de clientes).

---

## HU-16 - Gestión de Múltiples Métodos de Pago

* **Prioridad:** 16 | **Módulo:** Venta | **Puntos de Función:** 8
* **Como:** Cajero
* **¿Qué necesito?** Seleccionar distintos métodos de pago (transferencia, crédito, efectivo) y gestionar cuentas corrientes
* **¿Para qué?** Procesar pagos flexibles y controlar cuentas de clientes mayoristas

**Criterios de Aceptación:**

1. Dado un pago combinado (ej. efectivo y transferencia), cuando el cajero ingresa los montos parciales, la interfaz mantiene deshabilitado el botón de confirmación hasta que la suma ingresada alcance exactamente el 100% del total de la venta.
2. Dado un cliente mayorista, cuando se selecciona "cuenta corriente" como método de pago, el sistema valida de forma síncrona que el nuevo saldo proyectado no exceda el límite de crédito vigente.
3. Dado un cliente que excede su límite de crédito, cuando intenta confirmar el pago con cuenta corriente, la operación se bloquea inmediatamente y despliega una alerta roja requiriendo un PIN de autorización gerencial en pantalla para continuar.

**Reglas de Negocio y Notas Técnicas:**
Modelo de pagos: una venta puede tener N registros de pago (pago_id, venta_id, método, monto). La validación de límite de crédito debe ejecutarse de forma síncrona antes de confirmar la venta.

**Dependencias:**
HU-15 (POS), HU-24 (límites de crédito).

---

## HU-19 - Descuento de Stock en Tiempo Real

* **Prioridad:** 19 | **Módulo:** Venta | **Puntos de Función:** 5
* **Como:** Sistema
* **¿Qué necesito?** Descontar automáticamente unidades de stock al confirmar transacción
* **¿Para qué?** Garantizar consistencia absoluta entre sistema y estantería

**Criterios de Aceptación:**

1. Dado una venta confirmada, cuando se procesa el pago, el sistema descuenta el stock de forma inmediata (menor a 1 segundo) del depósito correspondiente.
2. Dado una venta cancelada tras haber descontado unidades, cuando se anula, el sistema revierte automáticamente la cantidad exacta al depósito de origen.
3. Dado un entorno de múltiples cajas operando simultáneamente el mismo artículo, el motor de base de datos resuelve la concurrencia a nivel de SQL Server (utilizando bloqueo optimista o aislamiento transaccional) garantizando que la suma de descuentos jamás genere un stock negativo.

**Reglas de Negocio y Notas Técnicas:**
Requiere control de concurrencia (locking optimista o transacciones con aislamiento serializable) sobre la tabla de existencias para evitar condiciones de carrera entre cajas simultáneas. Debe registrar cada movimiento en el log de auditoría.

**Dependencias:**
HU-01 (stock), HU-15 (POS).

---

## HU-20 - Búsqueda Rápida de Clientes

* **Prioridad:** 20 | **Módulo:** Venta | **Puntos de Función:** 3
* **Como:** Vendedor
* **¿Qué necesito?** Buscar clientes rápidamente por nombre, DNI o CUIT
* **¿Para qué?** Agilizar atención en mostrador

**Criterios de Aceptación:**

1. Dado un vendedor en mostrador, cuando busca un cliente por nombre, DNI o CUIT, el sistema devuelve los resultados en menos de 1 segundo utilizando búsqueda indexada.
2. Dado un cliente seleccionado, la interfaz muestra su historial de compras y, de aplicar, su saldo de cuenta corriente vigente actualizado al instante.
3. Dado un DNI o CUIT con formato inválido, cuando el usuario lo ingresa en el buscador, la vista de la interfaz pinta el borde del campo en rojo y deshabilita el botón de búsqueda de inmediato para evitar peticiones erróneas al servidor.

**Reglas de Negocio y Notas Técnicas:**
Requiere índice de búsqueda (full-text o índice compuesto) sobre nombre, DNI y CUIT. Validación de formato argentino de DNI/CUIT conforme a la exigencia de la DoD.

**Dependencias:**
HU-45 (migración de clientes históricos, si aplica).

---

## HU-34 - Bloqueo Síncrono por Quiebre de Stock (POS)

* **Prioridad:** 34 | **Módulo:** Venta | **Puntos de Función:** 8
* **Como:** Vendedor / Cajero
* **¿Qué necesito?** Bloquear la adición de productos o la confirmación de la venta si no hay stock real en la base de datos central
* **¿Para qué?** Evitar sobreventas en mostrador y mantener la consistencia del inventario físico

**Criterios de Aceptación:**

1. Dado un producto sin stock disponible en la base de datos central, cuando el cajero intenta escanearlo o agregarlo a la cotización en curso, la interfaz del POS bloquea la inserción y despliega una alerta roja indicando "Stock Insuficiente".
2. Dado un producto que agota su stock (vendido por otra caja) mientras el cliente actual lo tiene cargado en su orden, cuando el cajero presiona "Confirmar Venta" para iniciar el cobro, el sistema ejecuta una validación síncrona de seguridad y aborta el flujo de pago si detecta el quiebre.
3. Dado un bloqueo por falta de stock en el paso de cobro, el componente React resalta en rojo la línea exacta del artículo sin inventario en la pantalla del cajero, obligando a eliminarlo de la orden para poder continuar con el resto de la compra.

**Reglas de Negocio y Notas Técnicas:**
La validación de stock debe ser estrictamente síncrona y transaccional contra Microsoft SQL Server antes de cualquier inserción de pagos. Esta historia complementa a la HU-15 actuando como el camino infeliz (unhappy path) definitivo para quiebres de stock en el mostrador.

**Dependencias:**
HU-15 (POS), HU-19 (Descuento de stock en tiempo real).
