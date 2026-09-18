-- =============================================================
-- Migración Sprint 3 (parte 2) — Alta rápida de clientes desde el POS
-- Ejecutar DESPUÉS de migracion_pos_sprint3.sql y rpc_stock_venta.sql
-- =============================================================

-- Corrige un problema de la migración anterior: cuit seguía siendo
-- NOT NULL, lo que impedía dar de alta un cliente solo con DNI.
ALTER TABLE public.clientes
  ALTER COLUMN cuit DROP NOT NULL;

-- Nuevos campos para el alta rápida (nombre + dni + teléfono + dirección)
ALTER TABLE public.clientes
  ADD COLUMN telefono text NOT NULL DEFAULT '',
  ADD COLUMN direccion text NOT NULL DEFAULT '';

-- Un cliente necesita al menos un identificador (dni o cuit) para
-- poder buscarse luego en HU-20.
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_dni_o_cuit_check CHECK (dni IS NOT NULL OR cuit IS NOT NULL);
