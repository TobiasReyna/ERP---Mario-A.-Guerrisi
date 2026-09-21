const { supabaseAdmin } = require('../config/supabase');

class VentaService {
  /**
   * Listado de comprobantes de venta (solo Confirmada) para el
   * apartado unificado de Comprobantes — HU-15/23.
   */
  static async listarVentasConfirmadas() {
    const { data, error } = await supabaseAdmin
      .from('ventas')
      .select(`
        id, numero_comprobante, total, fecha_hora_registro,
        depositos ( nombre ),
        clientes ( razon_social, dni, cuit ),
        pagos_venta ( metodo )
      `)
      .eq('estado', 'Confirmada')
      .order('fecha_hora_registro', { ascending: false });

    if (error) throw new Error(`Error al listar ventas: ${error.message}`);

    return (data || []).map((v) => ({
      ventaId: v.id,
      numeroComprobante: v.numero_comprobante,
      total: Number(v.total),
      fechaHoraRegistro: v.fecha_hora_registro,
      deposito: v.depositos?.nombre || '—',
      cliente: v.clientes?.razon_social || 'Consumidor final',
      metodosPago: [...new Set((v.pagos_venta || []).map((p) => p.metodo))],
    }));
  }

  /**
   * Correlativo único global: último numero_comprobante + 1 (HU-15)
   */
  static async generarNumeroComprobante() {
    const { data, error } = await supabaseAdmin
      .from('ventas')
      .select('numero_comprobante')
      .not('numero_comprobante', 'is', null)
      .order('numero_comprobante', { ascending: false })
      .limit(1);

    if (error) throw new Error(`Error generando comprobante: ${error.message}`);

    if (!data || data.length === 0) {
      return 'VTA-00001';
    }

    const ultimoNumero = parseInt(data[0].numero_comprobante.split('-')[1], 10) || 0;
    const siguiente = String(ultimoNumero + 1).padStart(5, '0');
    return `VTA-${siguiente}`;
  }

  /**
   * Trae la venta + detalle + cliente, para armar cualquiera de
   * las dos respuestas del contrato (Parte 1 o Confirmación)
   */
  static async obtenerVentaCompleta(ventaId) {
    const { data: venta, error } = await supabaseAdmin
      .from('ventas')
      .select(`
        id, numero_comprobante, estado, total,
        fecha_hora_reserva, fecha_hora_expiracion, fecha_hora_registro,
        cliente_id, deposito_id,
        ventas_detalle ( id, articulo_id, cantidad, precio_unitario, importe_linea, articulos ( descripcion ) ),
        pagos_venta ( id, metodo, monto )
      `)
      .eq('id', ventaId)
      .single();

    if (error || !venta) throw new Error('La venta no existe.');

    let cliente = null;
    if (venta.cliente_id) {
      const { data: c } = await supabaseAdmin
        .from('clientes')
        .select('id, razon_social, dni, cuit, direccion')
        .eq('id', venta.cliente_id)
        .maybeSingle();
      if (c) {
        cliente = { id: c.id, razonSocial: c.razon_social, dni: c.dni, cuit: c.cuit, direccion: c.direccion };
      }
    }

    return {
      ventaId: venta.id,
      depositoId: venta.deposito_id,
      numeroComprobante: venta.numero_comprobante,
      estado: venta.estado,
      fechaHoraReserva: venta.fecha_hora_reserva,
      fechaHoraExpiracion: venta.fecha_hora_expiracion,
      fechaHoraRegistro: venta.fecha_hora_registro,
      cliente,
      items: (venta.ventas_detalle || []).map((d) => ({
        articuloId: d.articulo_id,
        descripcion: d.articulos?.descripcion || '',
        cantidad: d.cantidad,
        precioUnitario: Number(d.precio_unitario),
        importeLinea: Number(d.importe_linea),
      })),
      total: Number(venta.total),
      pagos: (venta.pagos_venta || []).map((p) => ({
        pagoId: p.id,
        metodo: p.metodo,
        monto: Number(p.monto),
      })),
    };
  }

  /**
   * Parte 1 del contrato: captura los ítems y reserva stock.
   * La reserva de todos los ítems es atómica vía RPC (todo o nada).
   */
  static async crearVentaPendiente(payload) {
    const { depositoId, usuarioId, clienteId, items, ipOrigen } = payload;

    if (!depositoId || !usuarioId) {
      throw new Error('Faltan depositoId o usuarioId.');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('La venta necesita al menos un ítem.');
    }
    for (const it of items) {
      if (!it.articuloId || !it.cantidad || it.cantidad <= 0 || !it.precioUnitario || it.precioUnitario <= 0) {
        throw new Error('Cada ítem necesita articuloId, cantidad y precioUnitario válidos.');
      }
    }

    // 1. Reservar stock de forma atómica (todo o nada)
    const { error: errReserva } = await supabaseAdmin.rpc('reservar_stock_venta', {
      p_deposito_id: depositoId,
      p_items: items.map((it) => ({ articuloId: it.articuloId, cantidad: it.cantidad })),
    });
    if (errReserva) throw new Error(`No se pudo reservar el stock: ${errReserva.message}`);

    // 1.5. Generar número de comprobante temprano
    const numeroComprobante = await this.generarNumeroComprobante();

    // 2. Insertar cabecera en estado Pendiente
    const total = items.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0);

    const { data: venta, error: errVenta } = await supabaseAdmin
      .from('ventas')
      .insert([
        {
          deposito_id: depositoId,
          usuario_id: usuarioId,
          cliente_id: clienteId || null,
          estado: 'Pendiente',
          total,
          ip_origen: ipOrigen || '127.0.0.1',
          numero_comprobante: numeroComprobante,
        },
      ])
      .select()
      .single();

    if (errVenta) {
      // Si falla la cabecera, liberamos lo que ya se reservó arriba
      await supabaseAdmin
        .rpc('liberar_stock_items', {
          p_deposito_id: depositoId,
          p_items: items.map((it) => ({ articuloId: it.articuloId, cantidad: it.cantidad })),
        });
      throw new Error(`Error al registrar la cabecera de la venta: ${errVenta.message}`);
    }

    // 3. Insertar detalle
    const detalle = items.map((it) => ({
      venta_id: venta.id,
      articulo_id: it.articuloId,
      cantidad: it.cantidad,
      precio_unitario: it.precioUnitario,
      importe_linea: it.cantidad * it.precioUnitario,
    }));

    const { error: errDetalle } = await supabaseAdmin.from('ventas_detalle').insert(detalle);
    if (errDetalle) throw new Error(`Error al registrar el detalle: ${errDetalle.message}`);

    return this.obtenerVentaCompleta(venta.id);
  }

  /**
   * Parte 2 del contrato: agrega un método de pago a la vez (HU-16)
   */
  static async agregarPago(ventaId, pago) {
    const { metodo, monto } = pago;

    const { data: venta, error: errVenta } = await supabaseAdmin
      .from('ventas')
      .select('id, estado, total')
      .eq('id', ventaId)
      .single();

    if (errVenta || !venta) throw new Error('La venta no existe.');
    if (venta.estado !== 'Pendiente') {
      throw new Error('Solo se pueden agregar pagos a una venta en estado Pendiente.');
    }
    if (!monto || monto <= 0) {
      throw new Error('El monto del pago debe ser mayor a 0.');
    }

    const { data: pagosPrevios } = await supabaseAdmin
      .from('pagos_venta')
      .select('monto')
      .eq('venta_id', ventaId);

    const totalPagadoPrevio = (pagosPrevios || []).reduce((acc, p) => acc + Number(p.monto), 0);
    const saldoPendientePrevio = Number(venta.total) - totalPagadoPrevio;

    if (monto > saldoPendientePrevio + 0.01) {
      throw new Error(`El monto supera el saldo pendiente ($${saldoPendientePrevio.toFixed(2)}).`);
    }

    const { data: nuevoPago, error: errPago } = await supabaseAdmin
      .from('pagos_venta')
      .insert([{ venta_id: ventaId, metodo, monto }])
      .select()
      .single();

    if (errPago) throw new Error(`Error al registrar el pago: ${errPago.message}`);

    const totalPagado = totalPagadoPrevio + monto;

    return {
      pagoId: nuevoPago.id,
      metodo: nuevoPago.metodo,
      monto: Number(nuevoPago.monto),
      totalPagado,
      saldoPendiente: Number(venta.total) - totalPagado,
    };
  }

  /**
   * Confirmación: valida pago exacto, descuenta stock real y
   * genera el número de comprobante (el "contrato entregado").
   */
  static async confirmarVenta(ventaId) {
    const { data: venta, error: errVenta } = await supabaseAdmin
      .from('ventas')
      .select('id, estado, total')
      .eq('id', ventaId)
      .single();

    if (errVenta || !venta) throw new Error('La venta no existe.');
    if (venta.estado !== 'Pendiente') {
      throw new Error('Solo se puede confirmar una venta en estado Pendiente.');
    }

    const { data: pagos } = await supabaseAdmin.from('pagos_venta').select('monto').eq('venta_id', ventaId);
    const totalPagado = (pagos || []).reduce((acc, p) => acc + Number(p.monto), 0);

    if (Math.abs(totalPagado - Number(venta.total)) > 0.01) {
      throw new Error(`El total pagado ($${totalPagado.toFixed(2)}) no coincide con el total de la venta ($${Number(venta.total).toFixed(2)}).`);
    }

    // El trigger en la base de datos se encarga de confirmar el stock al pasar a 'Confirmada'
    const { error: errUpdate } = await supabaseAdmin
      .from('ventas')
      .update({
        estado: 'Confirmada',
        fecha_hora_registro: new Date().toISOString(),
      })
      .eq('id', ventaId);

    if (errUpdate) throw new Error(`Error al confirmar la venta: ${errUpdate.message}`);

    return this.obtenerVentaCompleta(ventaId);
  }

  /**
   * Cancelación manual antes de las 2 horas (el job de pg_cron
   * cubre el vencimiento automático)
   */
  static async cancelarVenta(ventaId) {
    const { data: venta, error: errVenta } = await supabaseAdmin
      .from('ventas')
      .select('id, estado')
      .eq('id', ventaId)
      .single();

    if (errVenta || !venta) throw new Error('La venta no existe.');
    if (venta.estado !== 'Pendiente') {
      throw new Error('Solo se puede cancelar una venta en estado Pendiente.');
    }

    // El trigger en la BD se encarga de liberar la reserva de stock al pasar a 'Cancelada'

    const { error: errUpdate } = await supabaseAdmin
      .from('ventas')
      .update({ estado: 'Cancelada', motivo_cancelacion: 'Cancelada por cajero' })
      .eq('id', ventaId);

    if (errUpdate) throw new Error(`Error al cancelar la venta: ${errUpdate.message}`);

    return { ventaId, estado: 'Cancelada' };
  }

  static async buscarVentaPorComprobante(numeroComprobante) {
    const { data: venta, error } = await supabaseAdmin
      .from('ventas')
      .select('id, estado')
      .eq('numero_comprobante', numeroComprobante)
      .single();

    if (error || !venta) throw new Error('No se encontró una venta asociada con el número de comprobante ingresado');
    if (venta.estado !== 'Pendiente') throw new Error(`La venta se encuentra en estado ${venta.estado} y no puede ser cobrada.`);
    
    return this.obtenerVentaCompleta(venta.id);
  }
}

module.exports = VentaService;
