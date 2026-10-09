-- ============================================================================
-- HU-28 · Cierre y Arqueo de Caja (arqueo ciego)
-- Requiere hu26_apertura_caja.sql y hu27_movimientos_caja.sql.
-- Ejecutar UNA vez en el SQL Editor de Supabase. Es repetible.
-- ============================================================================

-- 1. Datos del cierre (se congelan al cerrar y no se vuelven a calcular).
ALTER TABLE public.caja_sesiones
  ADD COLUMN IF NOT EXISTS monto_fisico       numeric(14,2),   -- lo que contó el cajero
  ADD COLUMN IF NOT EXISTS saldo_teorico      numeric(14,2),   -- lo que calculó el sistema
  ADD COLUMN IF NOT EXISTS diferencia_arqueo  numeric(14,2),   -- físico - teórico (<0 faltante, >0 sobrante)
  ADD COLUMN IF NOT EXISTS cierre_detalle     jsonb;           -- consolidado para el reporte

-- Una sesión o está abierta (sin datos de cierre) o está cerrada con TODOS sus datos.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caja_sesiones_cierre_coherente') THEN
    ALTER TABLE public.caja_sesiones ADD CONSTRAINT caja_sesiones_cierre_coherente CHECK (
      (fecha_hora_cierre IS NULL AND monto_fisico IS NULL AND saldo_teorico IS NULL
         AND diferencia_arqueo IS NULL AND cierre_detalle IS NULL)
      OR
      (fecha_hora_cierre IS NOT NULL AND monto_fisico IS NOT NULL AND saldo_teorico IS NOT NULL
         AND diferencia_arqueo IS NOT NULL AND cierre_detalle IS NOT NULL)
    ) NOT VALID;
    ALTER TABLE public.caja_sesiones VALIDATE CONSTRAINT caja_sesiones_cierre_coherente;
  END IF;
END $$;

-- 2. Una sesión cerrada es un registro de auditoría: no se modifica ni se borra.
CREATE OR REPLACE FUNCTION public.caja_sesiones_cerrada_inmutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Las sesiones de caja no se pueden eliminar.';
  END IF;
  IF OLD.fecha_hora_cierre IS NOT NULL THEN
    RAISE EXCEPTION 'La sesión de caja ya está cerrada y no se puede modificar.';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER trg_caja_sesiones_inmutable
  BEFORE UPDATE OR DELETE ON public.caja_sesiones
  FOR EACH ROW EXECUTE FUNCTION public.caja_sesiones_cerrada_inmutable();

-- 2b. Un cobro o movimiento solo puede entrar a una sesión ABIERTA. El FOR SHARE lo hace esperar
--     si justo se está cerrando (cerrar_caja toma la sesión FOR UPDATE), y lo rechaza si ya cerró:
--     así el total congelado en el cierre nunca queda desactualizado.
CREATE OR REPLACE FUNCTION public.exigir_sesion_abierta() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_sesion uuid := NEW.caja_sesion_id;
BEGIN
  IF v_sesion IS NULL THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.caja_sesiones WHERE id = v_sesion AND fecha_hora_cierre IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SIN_CAJA_ABIERTA: La sesión de caja ya está cerrada.';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER trg_pagos_venta_sesion_abierta
  BEFORE INSERT ON public.pagos_venta
  FOR EACH ROW EXECUTE FUNCTION public.exigir_sesion_abierta();
CREATE OR REPLACE TRIGGER trg_caja_movimientos_sesion_abierta
  BEFORE INSERT ON public.caja_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.exigir_sesion_abierta();

-- 3. CONTEXTO DE LA PANTALLA DE ARQUEO. Deliberadamente SIN ningún importe:
--    el saldo teórico no debe viajar al navegador mientras el cajero cuenta.
CREATE OR REPLACE FUNCTION public.caja_contexto_arqueo(p_usuario_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_ses        public.caja_sesiones%ROWTYPE;
  v_caja       text;
  v_deposito   text;
  v_pendientes int;
BEGIN
  SELECT * INTO v_ses FROM public.caja_sesiones
  WHERE usuario_id = p_usuario_id AND fecha_hora_cierre IS NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT c.nombre, d.nombre INTO v_caja, v_deposito
  FROM public.cajas c JOIN public.depositos d ON d.id = c.deposito_id WHERE c.id = v_ses.caja_id;

  SELECT count(DISTINCT v.id) INTO v_pendientes
  FROM public.pagos_venta p JOIN public.ventas v ON v.id = p.venta_id
  WHERE p.caja_sesion_id = v_ses.id AND v.estado = 'Pendiente';

  RETURN jsonb_build_object(
    'sesionId',                  v_ses.id,
    'cajaNombre',                v_caja,
    'depositoNombre',            v_deposito,
    'fechaHoraApertura',         v_ses.fecha_hora_apertura,
    'ventasPendientesConCobros', v_pendientes
  );
END $$;

-- 4. CIERRE ATÓMICO. Códigos de error: MONTO_INVALIDO, SIN_CAJA_ABIERTA, VENTAS_PENDIENTES.
CREATE OR REPLACE FUNCTION public.cerrar_caja(p_usuario_id uuid, p_monto_fisico numeric)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_ses        public.caja_sesiones%ROWTYPE;
  v_caja       text;
  v_pendientes int;
  v_res        jsonb;
  v_fisico     numeric;
  v_teorico    numeric;
  v_dif        numeric;
  v_detalle    jsonb;
  v_cierre     timestamptz := now();   -- hora del SERVIDOR
BEGIN
  IF p_monto_fisico IS NULL OR p_monto_fisico < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO: El total de efectivo físico debe ser un número mayor o igual a 0.';
  END IF;
  v_fisico := round(p_monto_fisico, 2);

  -- Bloquea la sesión: ningún movimiento ni cobro se cuela mientras se cierra.
  SELECT * INTO v_ses FROM public.caja_sesiones
  WHERE usuario_id = p_usuario_id AND fecha_hora_cierre IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SIN_CAJA_ABIERTA: No tenés una caja abierta para cerrar.';
  END IF;

  SELECT count(DISTINCT v.id) INTO v_pendientes
  FROM public.pagos_venta p JOIN public.ventas v ON v.id = p.venta_id
  WHERE p.caja_sesion_id = v_ses.id AND v.estado = 'Pendiente';
  IF v_pendientes > 0 THEN
    RAISE EXCEPTION 'VENTAS_PENDIENTES: Hay % venta(s) con cobros parciales sin confirmar ni cancelar. Resolvelas antes de cerrar la caja.', v_pendientes;
  END IF;

  -- Saldo teórico = Fondo + Ventas en efectivo + Ingresos - Egresos (misma fórmula que el POS)
  v_res     := public.caja_resumen_efectivo(v_ses.id);
  v_teorico := (v_res ->> 'saldoEfectivo')::numeric;
  v_dif     := v_fisico - v_teorico;

  -- Consolidado para conciliación bancaria y reporte
  v_detalle := v_res || (
    SELECT jsonb_build_object(
      'ventasTarjetaDebito',  COALESCE(sum(p.monto) FILTER (WHERE p.metodo = 'tarjeta_debito'),  0),
      'ventasTarjetaCredito', COALESCE(sum(p.monto) FILTER (WHERE p.metodo = 'tarjeta_credito'), 0),
      'ventasTransferencia',  COALESCE(sum(p.monto) FILTER (WHERE p.metodo = 'transferencia'),   0),
      'totalCobrado',         COALESCE(sum(p.monto), 0),
      'cantidadVentas',       count(DISTINCT v.id)
    )
    FROM public.pagos_venta p JOIN public.ventas v ON v.id = p.venta_id
    WHERE p.caja_sesion_id = v_ses.id AND v.estado = 'Confirmada'
  );

  UPDATE public.caja_sesiones
  SET fecha_hora_cierre = v_cierre,
      monto_fisico      = v_fisico,
      saldo_teorico     = v_teorico,
      diferencia_arqueo = v_dif,
      cierre_detalle    = v_detalle
  WHERE id = v_ses.id;

  UPDATE public.cajas SET estado = 'Cerrada', usuario_id = NULL WHERE id = v_ses.caja_id;
  SELECT nombre INTO v_caja FROM public.cajas WHERE id = v_ses.caja_id;

  -- La respuesta NO incluye el saldo teórico (solo el resultado del arqueo).
  RETURN jsonb_build_object(
    'sesionId',          v_ses.id,
    'cajaNombre',        v_caja,
    'fechaHoraCierre',   v_cierre,
    'montoFisico',       v_fisico,
    'diferenciaArqueo',  v_dif,
    'resultado',         CASE WHEN v_dif < 0 THEN 'Faltante' WHEN v_dif > 0 THEN 'Sobrante' ELSE 'Sin diferencia' END
  );
END $$;

-- 5. Datos completos de una sesión CERRADA para el Reporte de Cierre (PDF).
CREATE OR REPLACE FUNCTION public.caja_reporte_cierre(p_sesion_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_ses  public.caja_sesiones%ROWTYPE;
BEGIN
  SELECT * INTO v_ses FROM public.caja_sesiones WHERE id = p_sesion_id AND fecha_hora_cierre IS NOT NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'sesion', (
      SELECT jsonb_build_object(
        'sesionId', v_ses.id, 'usuarioId', v_ses.usuario_id,
        'cajaNombre', c.nombre, 'depositoNombre', d.nombre, 'cajero', COALESCE(u.nombre, ''),
        'apertura', v_ses.fecha_hora_apertura, 'cierre', v_ses.fecha_hora_cierre,
        'montoInicial', v_ses.monto_inicial, 'montoFisico', v_ses.monto_fisico,
        'saldoTeorico', v_ses.saldo_teorico, 'diferenciaArqueo', v_ses.diferencia_arqueo)
      FROM public.cajas c
      JOIN public.depositos d ON d.id = c.deposito_id
      LEFT JOIN public.usuarios u ON u.id = v_ses.usuario_id
      WHERE c.id = v_ses.caja_id),
    'detalle', v_ses.cierre_detalle,
    'movimientos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'fechaHora', m.fecha_hora, 'tipo', m.tipo, 'monto', m.monto, 'concepto', k.nombre,
               'observacion', m.observacion, 'esContraAsiento', m.contra_asiento_de IS NOT NULL)
             ORDER BY m.fecha_hora)
      FROM public.caja_movimientos m JOIN public.caja_conceptos k ON k.id = m.concepto_id
      WHERE m.caja_sesion_id = v_ses.id), '[]'::jsonb),
    'ventas', COALESCE((
      SELECT jsonb_agg(x.fila ORDER BY x.orden) FROM (
        SELECT v.fecha_hora_registro AS orden,
               jsonb_build_object('numeroComprobante', v.numero_comprobante, 'fechaHora', v.fecha_hora_registro,
                 'total', v.total,
                 'pagos', (SELECT jsonb_agg(jsonb_build_object('metodo', p2.metodo, 'monto', p2.monto))
                           FROM public.pagos_venta p2 WHERE p2.venta_id = v.id AND p2.caja_sesion_id = v_ses.id)) AS fila
        FROM public.ventas v
        WHERE v.estado = 'Confirmada'
          AND EXISTS (SELECT 1 FROM public.pagos_venta p WHERE p.venta_id = v.id AND p.caja_sesion_id = v_ses.id)
      ) x), '[]'::jsonb)
  );
END $$;