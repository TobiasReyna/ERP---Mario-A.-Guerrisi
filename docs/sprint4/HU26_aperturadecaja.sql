-- ============================================================================
-- HU-26 · Apertura de Caja y Asignación de Turno
-- Ejecutar UNA vez en el SQL Editor de Supabase.
-- Sucursal = depósito. Cada depósito tiene exactamente 2 cajas lógicas.
-- ============================================================================

-- 1. CAJAS: máximo 2 por depósito (solo "Caja 1" y "Caja 2", únicas por depósito).
CREATE TABLE IF NOT EXISTS public.cajas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposito_id  uuid NOT NULL REFERENCES public.depositos(id),
  nombre       text NOT NULL CHECK (nombre IN ('Caja 1', 'Caja 2')),
  estado       text NOT NULL DEFAULT 'Cerrada' CHECK (estado IN ('Abierta', 'Cerrada')),
  usuario_id   uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,  -- cajero activo
  CONSTRAINT cajas_deposito_nombre_unique UNIQUE (deposito_id, nombre),
  -- Coherencia: una caja Abierta siempre tiene cajero; una Cerrada no.
  CONSTRAINT cajas_estado_usuario_coherente CHECK (
    (estado = 'Abierta' AND usuario_id IS NOT NULL) OR (estado = 'Cerrada' AND usuario_id IS NULL)
  )
);

-- 2. SESIONES (turnos): una fila por apertura. El cierre (HU-28) completará los campos de cierre.
CREATE TABLE IF NOT EXISTS public.caja_sesiones (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id              uuid NOT NULL REFERENCES public.cajas(id),
  usuario_id           uuid NOT NULL REFERENCES public.usuarios(id),
  monto_inicial        numeric(14,2) NOT NULL CHECK (monto_inicial >= 0),
  fecha_hora_apertura  timestamptz NOT NULL DEFAULT now(),   -- timestamp del SERVIDOR
  fecha_hora_cierre    timestamptz                           -- NULL = sesión activa
);

-- 3. BLOQUEO DE CONCURRENCIA a nivel base de datos (vale aunque falle la app):
--    · una caja no puede tener dos sesiones activas
--    · un usuario no puede tener dos sesiones activas
CREATE UNIQUE INDEX IF NOT EXISTS caja_sesiones_una_activa_por_caja
  ON public.caja_sesiones (caja_id) WHERE fecha_hora_cierre IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS caja_sesiones_una_activa_por_usuario
  ON public.caja_sesiones (usuario_id) WHERE fecha_hora_cierre IS NULL;

-- 4. RLS: mismo criterio que el resto (solo el backend con service_role).
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cajas'
                 AND policyname = 'service_role_all_cajas') THEN
    CREATE POLICY service_role_all_cajas ON public.cajas
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'caja_sesiones'
                 AND policyname = 'service_role_all_caja_sesiones') THEN
    CREATE POLICY service_role_all_caja_sesiones ON public.caja_sesiones
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Cada depósito nuevo nace con sus 2 cajas.
CREATE OR REPLACE FUNCTION public.crear_cajas_deposito() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.cajas (deposito_id, nombre)
  VALUES (NEW.id, 'Caja 1'), (NEW.id, 'Caja 2')
  ON CONFLICT (deposito_id, nombre) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER trg_depositos_crear_cajas
  AFTER INSERT ON public.depositos
  FOR EACH ROW EXECUTE FUNCTION public.crear_cajas_deposito();

-- 6. Cajas para los depósitos que YA existen.
INSERT INTO public.cajas (deposito_id, nombre)
SELECT d.id, n.nombre
FROM public.depositos d
CROSS JOIN (VALUES ('Caja 1'), ('Caja 2')) AS n(nombre)
WHERE d.estado = true
ON CONFLICT (deposito_id, nombre) DO NOTHING;

-- 7. APERTURA ATÓMICA. Devuelve la sesión creada o falla con un código al inicio del
--    mensaje (MONTO_INVALIDO, CAJA_INEXISTENTE, USUARIO_CON_CAJA_ABIERTA,
--    SUCURSAL_SIN_CAJAS_LIBRES, CAJA_OCUPADA) que el backend traduce a HTTP 409.
CREATE OR REPLACE FUNCTION public.abrir_caja(
  p_caja_id        uuid,
  p_usuario_id     uuid,
  p_monto_inicial  numeric
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_deposito_id  uuid;
  v_caja         public.cajas%ROWTYPE;
  v_abiertas     int;
  v_sesion       public.caja_sesiones%ROWTYPE;
  v_constraint   text;
BEGIN
  IF p_monto_inicial IS NULL OR p_monto_inicial < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO: El monto inicial debe ser un número mayor o igual a 0.';
  END IF;

  SELECT deposito_id INTO v_deposito_id FROM public.cajas WHERE id = p_caja_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAJA_INEXISTENTE: La caja seleccionada no existe.';
  END IF;

  -- Serializa las aperturas de la sucursal (mismo orden de bloqueo = sin deadlocks).
  PERFORM 1 FROM public.cajas WHERE deposito_id = v_deposito_id ORDER BY id FOR UPDATE;
  SELECT * INTO v_caja FROM public.cajas WHERE id = p_caja_id;

  IF EXISTS (SELECT 1 FROM public.caja_sesiones
             WHERE usuario_id = p_usuario_id AND fecha_hora_cierre IS NULL) THEN
    RAISE EXCEPTION 'USUARIO_CON_CAJA_ABIERTA: Ya tenés una sesión de caja activa. Cerrala antes de abrir otra.';
  END IF;

  SELECT count(*) INTO v_abiertas
  FROM public.cajas WHERE deposito_id = v_deposito_id AND estado = 'Abierta';
  IF v_abiertas >= 2 THEN
    RAISE EXCEPTION 'SUCURSAL_SIN_CAJAS_LIBRES: La sucursal ya tiene 2 cajas abiertas.';
  END IF;

  IF v_caja.estado = 'Abierta' THEN
    RAISE EXCEPTION 'CAJA_OCUPADA: % ya está abierta por otro usuario.', v_caja.nombre;
  END IF;

  INSERT INTO public.caja_sesiones (caja_id, usuario_id, monto_inicial)
  VALUES (p_caja_id, p_usuario_id, round(p_monto_inicial, 2))
  RETURNING * INTO v_sesion;

  UPDATE public.cajas SET estado = 'Abierta', usuario_id = p_usuario_id WHERE id = p_caja_id;

  RETURN jsonb_build_object(
    'sesionId',           v_sesion.id,
    'cajaId',             v_caja.id,
    'cajaNombre',         v_caja.nombre,
    'depositoId',         v_caja.deposito_id,
    'montoInicial',       v_sesion.monto_inicial,
    'fechaHoraApertura',  v_sesion.fecha_hora_apertura
  );

EXCEPTION WHEN unique_violation THEN
  -- Carrera entre dos aperturas simultáneas: lo frena el índice único parcial.
  GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
  IF v_constraint = 'caja_sesiones_una_activa_por_usuario' THEN
    RAISE EXCEPTION 'USUARIO_CON_CAJA_ABIERTA: Ya tenés una sesión de caja activa. Cerrala antes de abrir otra.';
  END IF;
  RAISE EXCEPTION 'CAJA_OCUPADA: La caja ya fue abierta por otro usuario.';
END $$;