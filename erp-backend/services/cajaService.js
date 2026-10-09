const { supabaseAdmin } = require('../config/supabase');
const { LIMITE_RETIRO_CAJA, LIMITE_SEGURIDAD_EFECTIVO } = require('../config/tesoreria');

// Códigos de negocio que devuelve la función SQL abrir_caja() al inicio del mensaje.
const CODIGOS_NEGOCIO = [
  'MONTO_INVALIDO',
  'CAJA_INEXISTENTE',
  'USUARIO_CON_CAJA_ABIERTA',
  'SUCURSAL_SIN_CAJAS_LIBRES',
  'CAJA_OCUPADA',
  // HU-27
  'TIPO_INVALIDO',
  'CONCEPTO_INVALIDO',
  'SIN_CAJA_ABIERTA',
  'CONTRA_ASIENTO_INVALIDO',
  'YA_COMPENSADO',
  'SALDO_INSUFICIENTE',
  // HU-28
  'VENTAS_PENDIENTES',
];

const formatoARS = (n) => Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

class CajaService {
  /**
   * Las 2 cajas de una sucursal (depósito) con su estado y cajero activo.
   */
  static async listarCajasPorDeposito(depositoId) {
    if (!depositoId) throw new Error('Falta depositoId.');

    const { data, error } = await supabaseAdmin
      .from('cajas')
      .select('id, nombre, estado, deposito_id, usuario_id, usuarios ( nombre )')
      .eq('deposito_id', depositoId)
      .order('nombre', { ascending: true });

    if (error) throw new Error(`Error consultando cajas: ${error.message}`);

    return (data || []).map((c) => ({
      cajaId: c.id,
      nombre: c.nombre,
      estado: c.estado,
      depositoId: c.deposito_id,
      cajero: c.usuario_id ? { id: c.usuario_id, nombre: c.usuarios?.nombre || '' } : null,
    }));
  }

  /**
   * Sesión de caja activa del usuario (o null si su caja está cerrada).
   * Es lo que consulta el POS para decidir si lo deja entrar.
   */
  static async obtenerSesionActiva(usuarioId) {
    if (!usuarioId) throw new Error('Falta usuarioId.');

    const { data, error } = await supabaseAdmin
      .from('caja_sesiones')
      .select('id, caja_id, monto_inicial, fecha_hora_apertura, cajas ( nombre, deposito_id )')
      .eq('usuario_id', usuarioId)
      .is('fecha_hora_cierre', null)
      .maybeSingle();

    if (error) throw new Error(`Error consultando la sesión de caja: ${error.message}`);
    if (!data) return null;

    return {
      sesionId: data.id,
      cajaId: data.caja_id,
      cajaNombre: data.cajas?.nombre || '',
      depositoId: data.cajas?.deposito_id || null,
      montoInicial: Number(data.monto_inicial),
      fechaHoraApertura: data.fecha_hora_apertura,
    };
  }

  /**
   * Abre una sesión de caja. Toda la lógica crítica (límite de 2 cajas por sucursal,
   * una caja por usuario, una caja un solo usuario) vive en la función SQL abrir_caja()
   * para que sea atómica y valga aunque dos cajeros abran al mismo tiempo.
   */
  static async abrirCaja({ cajaId, usuarioId, montoInicial }) {
    if (!cajaId || !usuarioId) throw new Error('Faltan cajaId o usuarioId.');

    const monto = typeof montoInicial === 'string' ? montoInicial.trim().replace(',', '.') : montoInicial;
    const montoNum = Number(monto);
    if (monto === '' || monto === null || monto === undefined || !Number.isFinite(montoNum) || montoNum < 0) {
      const e = new Error('El monto inicial debe ser un número mayor o igual a 0.');
      e.codigo = 'MONTO_INVALIDO';
      throw e;
    }

    const { data, error } = await supabaseAdmin.rpc('abrir_caja', {
      p_caja_id: cajaId,
      p_usuario_id: usuarioId,
      p_monto_inicial: montoNum,
    });

    if (error) {
      const codigo = CODIGOS_NEGOCIO.find((c) => (error.message || '').startsWith(`${c}:`));
      const e = new Error(codigo ? error.message.slice(codigo.length + 1).trim() : `No se pudo abrir la caja: ${error.message}`);
      if (codigo) e.codigo = codigo;
      throw e;
    }

    return data;
  }

  // ───────────────────────── HU-27 · Movimientos manuales ─────────────────────────

  /** Sesión activa (id) del usuario o null. */
  static async _sesionActivaId(usuarioId) {
    const { data, error } = await supabaseAdmin
      .from('caja_sesiones')
      .select('id')
      .eq('usuario_id', usuarioId)
      .is('fecha_hora_cierre', null)
      .maybeSingle();
    if (error) throw new Error(`Error consultando la sesión de caja: ${error.message}`);
    return data ? data.id : null;
  }

  static _normalizarResumen(r) {
    if (!r) return null;
    return {
      sesionId: r.sesionId,
      fondoInicial: Number(r.fondoInicial),
      ventasEfectivo: Number(r.ventasEfectivo),
      ingresos: Number(r.ingresos),
      egresos: Number(r.egresos),
      saldoEfectivo: Number(r.saldoEfectivo),
    };
  }

  /** Saldo teórico de efectivo del turno actual (null si no hay caja abierta). */
  static async obtenerResumen(usuarioId) {
    if (!usuarioId) throw new Error('Falta usuarioId.');
    const sesionId = await this._sesionActivaId(usuarioId);
    if (!sesionId) return null;
    const { data, error } = await supabaseAdmin.rpc('caja_resumen_efectivo', { p_sesion_id: sesionId });
    if (error) throw new Error(`Error calculando el saldo de caja: ${error.message}`);
    return this._normalizarResumen(data);
  }

  /** Conceptos predefinidos para el desplegable. */
  static async listarConceptos() {
    const { data, error } = await supabaseAdmin
      .from('caja_conceptos')
      .select('id, nombre, aplica_a, es_correccion')
      .eq('estado', true)
      .order('nombre', { ascending: true });
    if (error) throw new Error(`Error consultando conceptos: ${error.message}`);
    return (data || []).map((c) => ({ id: c.id, nombre: c.nombre, aplicaA: c.aplica_a, esCorreccion: c.es_correccion }));
  }

  /** Movimientos del turno actual, del más nuevo al más viejo. */
  static async listarMovimientos(usuarioId) {
    if (!usuarioId) throw new Error('Falta usuarioId.');
    const sesionId = await this._sesionActivaId(usuarioId);
    if (!sesionId) return [];

    const { data, error } = await supabaseAdmin
      .from('caja_movimientos')
      .select('id, tipo, monto, observacion, fecha_hora, contra_asiento_de, caja_conceptos ( nombre )')
      .eq('caja_sesion_id', sesionId)
      .order('fecha_hora', { ascending: false });
    if (error) throw new Error(`Error consultando movimientos: ${error.message}`);

    const compensados = new Set((data || []).filter((m) => m.contra_asiento_de).map((m) => m.contra_asiento_de));
    return (data || []).map((m) => ({
      movimientoId: m.id,
      tipo: m.tipo,
      monto: Number(m.monto),
      concepto: m.caja_conceptos?.nombre || '',
      observacion: m.observacion,
      fechaHora: m.fecha_hora,
      esContraAsiento: !!m.contra_asiento_de,
      compensado: compensados.has(m.id),
    }));
  }

  /**
   * Registra un ingreso/egreso manual. Las reglas (saldo, contra-asientos, solo inserción)
   * viven en la función SQL registrar_movimiento_caja() para que sean atómicas.
   */
  static async registrarMovimiento({ usuarioId, tipo, monto, conceptoId, observacion, contraAsientoDe }) {
    const fallo = (codigo, mensaje) => {
      const e = new Error(mensaje);
      e.codigo = codigo;
      return e;
    };

    if (!usuarioId) throw new Error('Falta usuarioId.');
    if (tipo !== 'Ingreso' && tipo !== 'Egreso') throw fallo('TIPO_INVALIDO', 'El tipo de movimiento debe ser Ingreso o Egreso.');

    const texto = typeof monto === 'string' ? monto.trim().replace(',', '.') : monto;
    const montoNum = Number(texto);
    if (texto === '' || texto === null || texto === undefined || !Number.isFinite(montoNum) || montoNum <= 0) {
      throw fallo('MONTO_INVALIDO', 'El monto debe ser un número mayor a 0.');
    }
    if (montoNum > 999999999999) throw fallo('MONTO_INVALIDO', 'El monto ingresado es demasiado grande.');
    if (!conceptoId) throw fallo('CONCEPTO_INVALIDO', 'El concepto es obligatorio.');

    const obs = typeof observacion === 'string' ? observacion.trim() : '';
    if (obs.length > 500) throw fallo('OBSERVACION_INVALIDA', 'La observación no puede superar los 500 caracteres.');

    // Egreso por encima del umbral: necesitaría el PIN de un Encargado (todavía no implementado).
    if (tipo === 'Egreso' && montoNum > LIMITE_RETIRO_CAJA) {
      const e = fallo(
        'REQUIERE_AUTORIZACION',
        `Un egreso mayor a $${formatoARS(LIMITE_RETIRO_CAJA)} requiere la autorización de un Encargado.`
      );
      e.limite = LIMITE_RETIRO_CAJA;
      throw e;
    }

    const { data, error } = await supabaseAdmin.rpc('registrar_movimiento_caja', {
      p_usuario_id: usuarioId,
      p_tipo: tipo,
      p_monto: montoNum,
      p_concepto_id: conceptoId,
      p_observacion: obs || null,
      p_contra_asiento_de: contraAsientoDe || null,
    });

    if (error) {
      const codigo = CODIGOS_NEGOCIO.find((c) => (error.message || '').startsWith(`${c}:`));
      let mensaje = codigo ? error.message.slice(codigo.length + 1).trim() : `No se pudo registrar el movimiento: ${error.message}`;
      if (codigo === 'SALDO_INSUFICIENTE') {
        mensaje = mensaje.replace(/\((-?\d+(?:\.\d+)?)\)/, (_, n) => `($${formatoARS(n)})`);
      }
      throw fallo(codigo || null, mensaje);
    }

    return { ...data, resumen: this._normalizarResumen(data.resumen) };
  }

  // ───────────────────────── HU-28 · Cierre y arqueo ciego ─────────────────────────

  /**
   * Contexto de la pantalla de arqueo. NO contiene ningún importe: el saldo teórico
   * no debe llegar al navegador mientras el cajero cuenta el efectivo.
   */
  static async obtenerContextoArqueo(usuarioId) {
    if (!usuarioId) throw new Error('Falta usuarioId.');
    const { data, error } = await supabaseAdmin.rpc('caja_contexto_arqueo', { p_usuario_id: usuarioId });
    if (error) throw new Error(`Error consultando la caja: ${error.message}`);
    return data || null; // null = no hay caja abierta
  }

  /**
   * Cierra la caja. El servidor calcula físico - teórico y congela el resultado.
   * La respuesta incluye solo el resultado del arqueo, nunca el saldo teórico.
   */
  static async cerrarCaja({ usuarioId, montoFisico }) {
    const fallo = (codigo, mensaje) => {
      const e = new Error(mensaje);
      e.codigo = codigo;
      return e;
    };
    if (!usuarioId) throw new Error('Falta usuarioId.');

    const texto = typeof montoFisico === 'string' ? montoFisico.trim().replace(',', '.') : montoFisico;
    const monto = Number(texto);
    if (texto === '' || texto === null || texto === undefined || !Number.isFinite(monto) || monto < 0 || monto > 999999999999) {
      throw fallo('MONTO_INVALIDO', 'El total de efectivo físico debe ser un número mayor o igual a 0.');
    }

    const { data, error } = await supabaseAdmin.rpc('cerrar_caja', {
      p_usuario_id: usuarioId,
      p_monto_fisico: monto,
    });

    if (error) {
      const codigo = CODIGOS_NEGOCIO.find((c) => (error.message || '').startsWith(`${c}:`));
      throw fallo(codigo || null, codigo ? error.message.slice(codigo.length + 1).trim() : `No se pudo cerrar la caja: ${error.message}`);
    }
    return data;
  }

  /**
   * Datos del Reporte de Cierre de una sesión ya cerrada.
   * Por ahora cada cajero solo accede a sus propios cierres (HU-29 sumará al Encargado).
   */
  static async obtenerDatosReporte(sesionId, usuarioId) {
    const fallo = (codigo, mensaje) => {
      const e = new Error(mensaje);
      e.codigo = codigo;
      return e;
    };
    if (!sesionId || !usuarioId) throw new Error('Faltan sesionId o usuarioId.');

    const { data, error } = await supabaseAdmin.rpc('caja_reporte_cierre', { p_sesion_id: sesionId });
    if (error) throw new Error(`Error generando el reporte: ${error.message}`);
    if (!data) throw fallo('REPORTE_NO_ENCONTRADO', 'La sesión no existe o todavía no fue cerrada.');
    if (data.sesion.usuarioId !== usuarioId) throw fallo('SIN_PERMISO', 'No tenés permiso para ver este reporte.');
    return data;
  }
  
  // HU-29: Estado actual de las cajas para supervisión.
  static async obtenerDashboardSupervision() {
    const { data: cajas, error } = await supabaseAdmin
      .from('cajas')
      .select(`
        id,
        nombre,
        estado,
        deposito_id,
        usuario_id,
        usuarios ( id, nombre ),
        depositos ( id, nombre )
      `)
      .order('deposito_id', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron consultar las cajas: ${error.message}`);
    }

    const { data: sesiones, error: errorSesiones } = await supabaseAdmin
      .from('caja_sesiones')
      .select(`
        id,
        caja_id,
        usuario_id,
        monto_inicial,
        fecha_hora_apertura,
        usuarios ( id, nombre )
      `)
      .is('fecha_hora_cierre', null);

    if (errorSesiones) {
      throw new Error(`No se pudieron consultar los turnos: ${errorSesiones.message}`);
    }

    const sesionPorCaja = new Map(
      (sesiones || []).map((sesion) => [sesion.caja_id, sesion])
    );

    const resultado = await Promise.all(
      (cajas || []).map(async (caja) => {
        const sesion = sesionPorCaja.get(caja.id);
        let saldoEfectivo = 0;

        if (caja.estado === 'Abierta' && sesion) {
          const { data: resumen, error: errorResumen } = await supabaseAdmin
            .rpc('caja_resumen_efectivo', {
              p_sesion_id: sesion.id,
            });

          if (errorResumen) {
            throw new Error(
              `No se pudo calcular el saldo de ${caja.nombre}: ${errorResumen.message}`
            );
          }

          saldoEfectivo = Number(resumen?.saldoEfectivo ?? 0);
        }

        return {
          cajaId: caja.id,
          nombre: caja.nombre,
          estado: caja.estado,
          depositoId: caja.deposito_id,
          depositoNombre: caja.depositos?.nombre || 'Sucursal',
          cajeroActivo: sesion?.usuarios?.nombre || '',
          sesionId: sesion?.id || null,
          fechaHoraApertura: sesion?.fecha_hora_apertura || null,
          saldoEfectivo,
          limiteSeguridad: LIMITE_SEGURIDAD_EFECTIVO,
          requiereRetiro:
            caja.estado === 'Abierta' &&
            saldoEfectivo > LIMITE_SEGURIDAD_EFECTIVO,
        };
      })
    );

    return resultado;
  }

  // HU-29: Historial de cierres con filtros opcionales.
  static async listarHistorialSupervision({ cajeroId, desde, hasta } = {}) {
    let query = supabaseAdmin
      .from('caja_sesiones')
      .select(`
        id,
        caja_id,
        usuario_id,
        fecha_hora_apertura,
        fecha_hora_cierre,
        monto_inicial,
        monto_fisico,
        saldo_teorico,
        diferencia_arqueo,
        cajas!inner (
          id,
          nombre,
          deposito_id,
          depositos ( nombre )
        ),
        usuarios!inner (
          id,
          nombre
        )
      `)
      .not('fecha_hora_cierre', 'is', null)
      .order('fecha_hora_cierre', { ascending: false });

    if (cajeroId) {
      query = query.eq('usuario_id', cajeroId);
    }

    if (desde) {
      query = query.gte('fecha_hora_cierre', desde);
    }

    if (hasta) {
      query = query.lte('fecha_hora_cierre', hasta);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`No se pudo consultar el historial: ${error.message}`);
    }

    return (data || []).map((sesion) => ({
      sesionId: sesion.id,
      cajaId: sesion.caja_id,
      cajaNombre: sesion.cajas?.nombre || '',
      depositoId: sesion.cajas?.deposito_id || null,
      depositoNombre: sesion.cajas?.depositos?.nombre || 'Sucursal',
      cajeroId: sesion.usuario_id,
      cajeroNombre: sesion.usuarios?.nombre || 'Sin nombre',
      apertura: sesion.fecha_hora_apertura,
      cierre: sesion.fecha_hora_cierre,
      montoInicial: Number(sesion.monto_inicial || 0),
      montoFisico: Number(sesion.monto_fisico || 0),
      saldoTeorico: Number(sesion.saldo_teorico || 0),
      diferenciaArqueo: Number(sesion.diferencia_arqueo || 0),
    }));
  }

  // HU-29: Detalle completo de un cierre ya realizado.
  static async obtenerDetalleCierreSupervision(sesionId) {
    if (!sesionId) {
      const error = new Error('Falta el identificador del turno.');
      error.codigo = 'REPORTE_NO_ENCONTRADO';
      throw error;
    }

    const { data, error } = await supabaseAdmin.rpc(
      'caja_reporte_cierre',
      { p_sesion_id: sesionId }
    );

    if (error) {
      throw new Error(`No se pudo consultar el cierre: ${error.message}`);
    }

    if (!data) {
      const err = new Error('El cierre no existe o todavía no fue cerrado.');
      err.codigo = 'REPORTE_NO_ENCONTRADO';
      throw err;
    }

    return data;
  }
}

module.exports = CajaService;