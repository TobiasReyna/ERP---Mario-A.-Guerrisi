-- ============================================================================
-- HU-27 · Movimientos manuales de caja (ingresos / egresos de efectivo)
-- Requiere haber ejecutado antes hu26_apertura_caja.sql.
-- Ejecutar UNA vez en el SQL Editor de Supabase. Es repetible.
-- ============================================================================

-- 1. Cada pago de una venta queda atado a la sesión de caja que lo cobró.
--    (Es lo que permite calcular las ventas en efectivo de un turno.)
ALTER TABLE public.pagos_venta
  ADD COLUMN IF NOT EXISTS caja_sesion_id uuid REFERENCES public.caja_sesiones(id);
CREATE INDEX IF NOT EXISTS pagos_venta_caja_sesion_idx ON public.pagos_venta (caja_sesion_id);

-- 1b. Pagos que ya se hicieron durante un turno abierto: se asignan a esa sesión.
UPDATE public.pagos_venta p
SET caja_sesion_id = s.id
FROM public.ventas v
JOIN public.caja_sesiones s
  ON s.usuario_id = v.usuario_id AND s.fecha_hora_cierre IS NULL
WHERE p.venta_id = v.id
  AND p.caja_sesion_id IS NULL
  AND p.fecha_hora_registro >= s.fecha_hora_apertura;

-- 2. Conceptos predefinidos (menú desplegable).
CREATE TABLE IF NOT EXISTS public.caja_conceptos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         text NOT NULL UNIQUE,
  aplica_a       text NOT NULL CHECK (aplica_a IN ('Ingreso', 'Egreso', 'Ambos')),
  es_correccion  boolean NOT NULL DEFAULT false,   -- concepto exclusivo de contra-asientos
  estado         boolean NOT NULL DEFAULT true
);

INSERT INTO public.caja_conceptos (nombre, aplica_a, es_correccion) VALUES
  ('Reposición de cambio',                  'Ingreso', false),
  ('Otros ingresos',                        'Ingreso', false),
  ('Pago a proveedor',                      'Egreso',  false),
  ('Gastos de librería / insumos',          'Egreso',  false),
  ('Retiro de valores (seguridad)',         'Egreso',  false),
  ('Adelanto / viáticos',                   'Egreso',  false),
  ('Devolución a cliente',                  'Egreso',  false),
  ('Otros egresos',                         'Egreso',  false),
  ('Corrección de error (contra-asiento)',  'Ambos',   true)
ON CONFLICT (nombre) DO NOTHING;

-- 3. Movimientos. APPEND-ONLY: no se editan ni se borran, se compensan.
CREATE TABLE IF NOT EXISTS public.caja_movimientos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_sesion_id      uuid NOT NULL REFERENCES public.caja_sesiones(id),
  tipo                text NOT NULL CHECK (tipo IN ('Ingreso', 'Egreso')),
  monto               numeric(14,2) NOT NULL CHECK (monto > 0),
  concepto_id         uuid NOT NULL REFERENCES public.caja_conceptos(id),
  observacion         text CHECK (observacion IS NULL OR char_length(observacion) <= 500),
  usuario_id          uuid NOT NULL REFERENCES public.usuarios(id),
  fecha_hora          timestamptz NOT NULL DEFAULT now(),        -- hora del SERVIDOR
  contra_asiento_de   uuid REFERENCES public.caja_movimientos(id)
);
CREATE INDEX IF NOT EXISTS caja_movimientos_sesion_idx ON public.caja_movimientos (caja_sesion_id, fecha_hora DESC);
-- Un movimiento solo puede compensarse una vez.
CREATE UNIQUE INDEX IF NOT EXISTS caja_movimientos_un_contra_asiento
  ON public.caja_movimientos (contra_asiento_de) WHERE contra_asiento_de IS NOT NULL;

CREATE OR REPLACE FUNCTION public.caja_movimientos_solo_insercion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'caja_movimientos es de solo inserción (%). Para corregir un error registrá un movimiento compensatorio.', TG_OP;
  RETURN NULL;
END $$;

CREATE OR REPLACE TRIGGER trg_caja_mov_no_update_delete
  BEFORE UPDATE OR DELETE ON public.caja_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.caja_movimientos_solo_insercion();
CREATE OR REPLACE TRIGGER trg_caja_mov_no_truncate
  BEFORE TRUNCATE ON public.caja_movimientos
  FOR EACH STATEMENT EXECUTE FUNCTION public.caja_movimientos_solo_insercion();

-- 4. RLS: solo el backend (service_role).
ALTER TABLE public.caja_conceptos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='caja_conceptos' AND policyname='service_role_all_caja_conceptos') THEN
    CREATE POLICY service_role_all_caja_conceptos ON public.caja_conceptos FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='caja_movimientos' AND policyname='service_role_all_caja_movimientos') THEN
    CREATE POLICY service_role_all_caja_movimientos ON public.caja_movimientos FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Saldo teórico de EFECTIVO de una sesión:
--    Fondo inicial + Ventas cobradas en efectivo + Ingresos manuales - Egresos manuales
--    (las ventas Canceladas no suman: se asume que se devolvió el dinero).
CREATE OR REPLACE FUNCTION public.caja_resumen_efectivo(p_sesion_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_fondo    numeric;
  v_ventas   numeric;
  v_ingresos numeric;
  v_egresos  numeric;
BEGIN
  SELECT monto_inicial INTO v_fondo FROM public.caja_sesiones WHERE id = p_sesion_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(sum(p.monto), 0) INTO v_ventas
  FROM public.pagos_venta p JOIN public.ventas v ON v.id = p.venta_id
  WHERE p.caja_sesion_id = p_sesion_id AND p.metodo = 'efectivo' AND v.estado IN ('Pendiente', 'Confirmada');

  SELECT COALESCE(sum(monto) FILTER (WHERE tipo = 'Ingreso'), 0),
         COALESCE(sum(monto) FILTER (WHERE tipo = 'Egreso'),  0)
    INTO v_ingresos, v_egresos
  FROM public.caja_movimientos WHERE caja_sesion_id = p_sesion_id;

  RETURN jsonb_build_object(
    'sesionId',       p_sesion_id,
    'fondoInicial',   v_fondo,
    'ventasEfectivo', v_ventas,
    'ingresos',       v_ingresos,
    'egresos',        v_egresos,
    'saldoEfectivo',  v_fondo + v_ventas + v_ingresos - v_egresos
  );
END $$;

-- 6. Registro ATÓMICO de un movimiento. Códigos de error al inicio del mensaje:
--    TIPO_INVALIDO, MONTO_INVALIDO, CONCEPTO_INVALIDO, SIN_CAJA_ABIERTA,
--    CONTRA_ASIENTO_INVALIDO, YA_COMPENSADO, SALDO_INSUFICIENTE.
CREATE OR REPLACE FUNCTION public.registrar_movimiento_caja(
  p_usuario_id         uuid,
  p_tipo               text,
  p_monto              numeric,
  p_concepto_id        uuid,
  p_observacion        text,
  p_contra_asiento_de  uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_ses      public.caja_sesiones%ROWTYPE;
  v_caja     text;
  v_conc     public.caja_conceptos%ROWTYPE;
  v_orig     public.caja_movimientos%ROWTYPE;
  v_saldo    numeric;
  v_mov      public.caja_movimientos%ROWTYPE;
  v_obs      text := NULLIF(btrim(COALESCE(p_observacion, '')), '');
BEGIN
  IF p_tipo IS NULL OR p_tipo NOT IN ('Ingreso', 'Egreso') THEN
    RAISE EXCEPTION 'TIPO_INVALIDO: El tipo de movimiento debe ser Ingreso o Egreso.';
  END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO: El monto debe ser mayor a 0.';
  END IF;

  SELECT * INTO v_conc FROM public.caja_conceptos WHERE id = p_concepto_id AND estado = true;
  IF NOT FOUND OR (v_conc.aplica_a <> 'Ambos' AND v_conc.aplica_a <> p_tipo) THEN
    RAISE EXCEPTION 'CONCEPTO_INVALIDO: Seleccioná un concepto válido para un %.', lower(p_tipo);
  END IF;

  -- Bloquea la sesión: los movimientos de un mismo turno se procesan de a uno.
  SELECT * INTO v_ses FROM public.caja_sesiones
  WHERE usuario_id = p_usuario_id AND fecha_hora_cierre IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SIN_CAJA_ABIERTA: No tenés una caja abierta para registrar movimientos.';
  END IF;

  IF p_contra_asiento_de IS NOT NULL THEN
    SELECT * INTO v_orig FROM public.caja_movimientos
    WHERE id = p_contra_asiento_de AND caja_sesion_id = v_ses.id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CONTRA_ASIENTO_INVALIDO: Solo se pueden compensar movimientos de tu sesión actual.';
    END IF;
    IF v_orig.tipo = p_tipo OR v_orig.monto <> round(p_monto, 2) OR NOT v_conc.es_correccion THEN
      RAISE EXCEPTION 'CONTRA_ASIENTO_INVALIDO: El contra-asiento debe ser del tipo opuesto, por el mismo monto y con el concepto de corrección.';
    END IF;
  ELSIF v_conc.es_correccion THEN
    RAISE EXCEPTION 'CONCEPTO_INVALIDO: El concepto de corrección solo se usa para compensar un movimiento.';
  END IF;

  IF p_tipo = 'Egreso' THEN
    v_saldo := (public.caja_resumen_efectivo(v_ses.id) ->> 'saldoEfectivo')::numeric;
    IF round(p_monto, 2) > v_saldo THEN
      RAISE EXCEPTION 'SALDO_INSUFICIENTE: El egreso supera el efectivo disponible en caja (%).', round(v_saldo, 2);
    END IF;
  END IF;

  INSERT INTO public.caja_movimientos
    (caja_sesion_id, tipo, monto, concepto_id, observacion, usuario_id, contra_asiento_de)
  VALUES
    (v_ses.id, p_tipo, round(p_monto, 2), p_concepto_id, v_obs, p_usuario_id, p_contra_asiento_de)
  RETURNING * INTO v_mov;

  SELECT nombre INTO v_caja FROM public.cajas WHERE id = v_ses.caja_id;

  RETURN jsonb_build_object(
    'movimientoId',  v_mov.id,
    'tipo',          v_mov.tipo,
    'monto',         v_mov.monto,
    'concepto',      v_conc.nombre,
    'observacion',   v_mov.observacion,
    'fechaHora',     v_mov.fecha_hora,
    'cajaNombre',    v_caja,
    'resumen',       public.caja_resumen_efectivo(v_ses.id)
  );

EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'YA_COMPENSADO: Ese movimiento ya fue compensado.';
END $$;