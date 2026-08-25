 ### 🔴 Prioridad 1: Catálogo de Artículos (Prerrequisito - HU-07)

  Sin estos endpoints, el sistema no tiene sobre qué operar.

  1. POST /api/articles: Creación de un nuevo artículo. Deberá validar que el codigo_ean13 y el codigo_interno no
  existan previamente.
  2. PUT /api/articles/:id: Modificación de un artículo. (Nota: Cuando se modifique el precio aquí, el trigger de la
  base de datos trg_fn_registrar_historial_precio actuará automáticamente para registrarlo en historial_precios).
  3. GET /api/articles: Listado general de artículos (paginado y con filtros básicos por descripción o código) para
  usar en grillas y buscadores.
  4. GET /api/articles/:id: Obtener el detalle completo de un artículo específico.
  5. PATCH /api/articles/:id/status: Baja lógica de un artículo (actualizar el campo estado a false).

  ### 🟠 Prioridad 2: Maestros y Listas de Valores (Auxiliares críticos)

  Endpoints necesarios para poblar los menús desplegables (selects) del Frontend, tanto para crear artículos como
  para el endpoint de ajustes que ya crearon.
  6. GET /api/categories: Listar las categorías.
  7. GET /api/brands: Listar las marcas.
  8. GET /api/countries: Listar los países de origen.
  9. GET /api/deposits: Listar los depósitos activos.
  10. GET /api/adjustment-reasons: Listar los motivos de ajuste activos (para poder alimentar el POST
  /api/stock/adjust).

  ### 🟡 Prioridad 3: Consultas de Disponibilidad (HU-01)

  11. GET /api/stock/:articulo_id (o GET /api/stock?articulo_id=...): Este endpoint es clave para la HU-01. Debe
  devolver las existencias actuales de un artículo con dos datos importantes:
      • El stock consolidado (suma total de todos los depósitos).
      • El desglose por depósito (ej: Tienda Central vs Galería Margalef).


  ### 🟢 Prioridad 4: Trazabilidad e Historial (HU-02)

  12. GET /api/stock/:articulo_id/history: Obtener el historial de movimientos de un artículo. Deberá cruzar/unir los
  datos de las tablas ajustes_stock y transferencias_stock para mostrar una línea de tiempo de qué pasó con ese
  artículo, quién lo hizo, cuándo y por qué.

  ### 🔵 Prioridad 5: Políticas de Reposición y Alertas (HU-06)

  13. PUT /api/stock/policies/:articulo_id (o POST /api/stock/policies): Endpoint para que el Encargado de Compras
  configure los niveles de stock_minimo y stock_maximo en la tabla politicas_reposicion_deposito (o en la tabla
  existencias dependiendo de si lo configuran por depósito o general).
  14. GET /api/stock/alerts (o /api/stock/replenishments): Un listado que devuelva únicamente los artículos cuyo
  stock actual ha perforado el límite de stock mínimo, e incluya el cálculo de cantidad sugerida a reponer
  (stock_maximo - stock_actual).
  ──────
  Nota sobre Ventas: Mencionaste "registro de ventas" en tu mensaje y se menciona en las HU (ej: "sin bloquear
  operaciones de venta"). Sin embargo, en el DDL de este Sprint 1 no existen tablas de ventas (facturas,
  detalles_ventas, etc.). Asumo que la construcción del módulo de Venta en el POS (Ej: POST /api/sales) entrará
  formalmente en el Sprint 2 una vez que toda esta base de inventario y catálogo esté terminada.