# Historias de Usuario — Sprint 1
## Proyecto ERP Mario A. Guerrisi

Total de historias planificadas: **4**

---

## HU-01 — Gestión de Inventario Multi-Depósito

| Campo | Detalle |
|---|---|
| **Prioridad** | 1 |
| **Módulo** | Stock |
| **Puntos de Función** | 8 |
| **Dependencias** | HU-07 (Catálogo de Productos): no puede existir stock de un artículo no catalogado. |

**Como** Encargado de Depósito,
**necesito** Segmentar el stock de artículos por cada uno de los depósitos físicos (Tienda Central y Galería Margalef) visualizando disponibilidad en tiempo real,
**para** Controlar el inventario en múltiples ubicaciones y optimizar la distribución de productos.

### Criterios de Aceptación

- 1. Dado un usuario autenticado con rol Encargado de Depósito, cuando consulta el stock de un artículo, entonces el sistema muestra la cantidad disponible desglosada por depósito (Tienda Central y Galería Margalef) con una latencia menor a 2 segundos.
- 2. Dado un artículo con existencias en ambos depósitos, cuando se solicita el stock consolidado, entonces el sistema calcula el total sumado sin duplicar registros ni sobrescribir cantidades por depósito.
- 3. Dado un movimiento de stock entre depósitos, cuando se confirma la operación, entonces el sistema actualiza origen y destino de forma atómica (todo o nada) y genera un registro de auditoría con usuario, timestamp, IP y valores previo/posterior.
- 4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

### Reglas de Negocio y Notas Técnicas

Modelo de datos: tabla de existencias con clave compuesta (artículo_id, depósito_id, cantidad). Las actualizaciones de stock deben ejecutarse dentro de una transacción ACID para evitar condiciones de carrera ante ventas simultáneas. Requiere índice compuesto (artículo_id, depósito_id) para consultas de disponibilidad en tiempo real.

---

## HU-02 — Registrar Movimientos y Ajustes de Stock

| Campo | Detalle |
|---|---|
| **Prioridad** | 2 |
| **Módulo** | Stock |
| **Puntos de Función** | 8 |
| **Dependencias** | HU-01 (Inventario Multi-Depósito). |

**Como** Encargado de Depósito,
**necesito** Registrar movimientos internos, mermas y ejecutar recuentos físicos sin bloquear operaciones de venta,
**para** Mantener la consistencia del inventario y permitir correcciones por diferencias, roturas o pérdidas.

### Criterios de Aceptación

- 1. Dado un Encargado de Depósito autenticado, cuando registra una merma o ajuste, entonces el sistema exige un motivo obligatorio de una lista predefinida (rotura, pérdida, vencimiento, diferencia de recuento) antes de confirmar.
- 2. Dado un proceso de recuento físico en ejecución, cuando se están procesando ventas en el POS de forma simultánea, entonces ambas operaciones se ejecutan sin bloquearse mutuamente (el ajuste corre en background/cola asíncrona).
- 3. Dado un ajuste de stock confirmado, cuando se consulta el historial del artículo, entonces se visualiza usuario, fecha/hora, motivo y diferencia (cantidad anterior vs. nueva).
- 4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

### Reglas de Negocio y Notas Técnicas

Los ajustes deben procesarse mediante una cola de tareas o transacción de bajo bloqueo (row-level locking) para no impactar el rendimiento del POS, conforme a la exigencia de la DoD de no bloquear operaciones de venta. Todo ajuste genera log de auditoría con campos: id de transacción, usuario, jerarquía, timestamp, IP, módulo, valor previo/posterior.

---

## HU-06 — Niveles de Stock Mínimo y Alertas de Reposición

| Campo | Detalle |
|---|---|
| **Prioridad** | 6 |
| **Módulo** | Stock |
| **Puntos de Función** | 5 |
| **Dependencias** | HU-01, HU-03 (alertas), HU-07 (catálogo). |

**Como** Encargado de Compras,
**necesito** Configurar niveles de stock mínimo para que el sistema sugiera reposiciones automáticas,
**para** Optimizar reposiciones y evitar quiebres de inventario.

### Criterios de Aceptación

- 1. Dado un artículo con niveles mínimo/máximo configurados, cuando el stock alcanza el mínimo, entonces el sistema genera automáticamente una sugerencia de reposición con la cantidad óptima (máximo - actual).
- 2. Dado un conjunto de artículos en estado de reposición sugerida, cuando el Encargado de Compras lo solicita, entonces puede exportar el listado a Excel para generar órdenes de compra.
- 3. Dado un cambio manual en el nivel mínimo de un artículo, cuando se guarda, entonces el sistema recalcula inmediatamente si corresponde generar alerta.
- 4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

### Reglas de Negocio y Notas Técnicas

Los niveles mín/máx se configuran por artículo y opcionalmente por depósito. El cálculo de sugerencia de compra debe considerar el stock consolidado de todos los depósitos, salvo que se configure por depósito individual.

---

## HU-07 — Gestión Centralizada del Catálogo de Productos

| Campo | Detalle |
|---|---|
| **Prioridad** | 7 |
| **Módulo** | Artículos |
| **Puntos de Función** | 5 |
| **Dependencias** | Ninguna (base del modelo de datos). Bloquea a: HU-01, HU-02, HU-05, HU-08, HU-09, HU-10, HU-13, y todos los módulos de Venta y E-commerce. |

**Como** Gerente,
**necesito** Crear, modificar y eliminar artículos con código, descripción, EAN-13, categorías y precios,
**para** Unificar la información de productos en un catálogo maestro actualizado.

### Criterios de Aceptación

- 1. Dado un Gerente autenticado, cuando crea un artículo, entonces el sistema exige código interno único, descripción, código EAN-13 (validado por dígito verificador), categoría y precio.
- 2. Dado un intento de alta con un EAN-13 ya existente, cuando se guarda, entonces el sistema rechaza la operación y notifica el conflicto.
- 3. Dado un cambio de precio en un artículo existente, cuando se confirma, entonces el sistema conserva el precio anterior en el historial junto con usuario y fecha del cambio.
- 4. Dado que se cumple el criterio anterior, cuando el Product Owner revisa la funcionalidad en el entorno de homologación, entonces otorga la aprobación formal (Done) según la Definición de Terminado.

### Reglas de Negocio y Notas Técnicas

Catálogo maestro: tabla artículos con restricción UNIQUE sobre código EAN-13. El historial de precios se modela como tabla independiente (artículo_id, precio, vigencia_desde, usuario). Esta historia es prerrequisito técnico de todo el sistema, ya que ningún movimiento de stock, venta o compra puede referenciar un artículo inexistente.

---
