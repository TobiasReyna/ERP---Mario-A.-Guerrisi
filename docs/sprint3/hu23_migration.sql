-- =============================================================================
-- Migración HU-23: Registro de Comprobantes de Proveedores
-- Ejecutar en Supabase SQL Editor
-- =============================================================================

-- 1. Tabla principal de comprobantes de proveedores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comprobantes_proveedores (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id          UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE RESTRICT,
    tipo_comprobante      TEXT NOT NULL CHECK (tipo_comprobante IN ('Factura', 'Nota de Crédito', 'Nota de Débito')),
    numero_comprobante    TEXT NOT NULL,
    monto_total           NUMERIC(15, 2) NOT NULL CHECK (monto_total > 0),
    fecha_emision         DATE NOT NULL,
    fecha_vencimiento     DATE,  -- NULL para Notas de Crédito
    id_cuenta_por_pagar   UUID REFERENCES public.cuentas_por_pagar(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- CA-2: unicidad proveedor + número de comprobante
    CONSTRAINT uq_comprobante_proveedor UNIQUE (proveedor_id, numero_comprobante)
);

-- Índice para búsquedas frecuentes por proveedor
CREATE INDEX IF NOT EXISTS idx_comprobantes_proveedores_proveedor_id
    ON public.comprobantes_proveedores (proveedor_id);

-- Índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_comprobantes_proveedores_tipo
    ON public.comprobantes_proveedores (tipo_comprobante);


-- 2. Agregar columna a cuentas_por_pagar para referenciar el comprobante de origen
-- (las CxP generadas por HU-23 tienen su comprobante; las de HU-13/OC no)
-- -----------------------------------------------------------------------------
ALTER TABLE public.cuentas_por_pagar
    ADD COLUMN IF NOT EXISTS comprobante_proveedor_id UUID
        REFERENCES public.comprobantes_proveedores(id) ON DELETE SET NULL;


-- 3. RLS: habilitar y agregar políticas (ajustar roles según tu configuración)
-- -----------------------------------------------------------------------------
ALTER TABLE public.comprobantes_proveedores ENABLE ROW LEVEL SECURITY;

-- Política permisiva para el service role (backend)
CREATE POLICY "service_role_all_comprobantes_proveedores"
    ON public.comprobantes_proveedores
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- Fin de migración HU-23
-- =============================================================================

