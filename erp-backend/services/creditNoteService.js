const { supabaseAdmin } = require('../config/supabase');

class CreditNoteService {
  /**
   * Listar todas las notas emitidas con sus líneas de artículos devueltos
   */
  static async listarNotas() {
    const { data: notas, error } = await supabaseAdmin
      .from('notas_credito_debito')
      .select(`
        id,
        numero_comprobante,
        tipo,
        factura_origen_id,
        monto,
        fecha_hora_registro,
        usuario_id,
        motivo,
        afecta_inventario,
        notas_credito_debito_detalle (
          id,
          articulo_id,
          deposito_id,
          cantidad
        )
      `)
      .order('fecha_hora_registro', { ascending: false });

    if (error) throw new Error(`Error al listar notas: ${error.message}`);

    return (notas || []).map((n) => ({
      id: n.id,
      numeroComprobante: n.numero_comprobante,
      tipo: n.tipo,
      facturaOrigenId: n.factura_origen_id,
      monto: Number(n.monto),
      fechaRegistro: n.fecha_hora_registro,
      motivo: n.motivo,
      afectaInventario: Boolean(n.afecta_inventario),
      lineas: (n.notas_credito_debito_detalle || []).map((d) => ({
        id: d.id,
        articuloId: d.articulo_id,
        depositoId: d.deposito_id,
        cantidad: Number(d.cantidad),
      })),
    }));
  }

  /**
   * Resumen y KPIs de notas según período de fechas (HU-23 Criterio 3)
   */
  static async obtenerResumen(desde, hasta) {
    let query = supabaseAdmin
      .from('notas_credito_debito')
      .select('tipo, monto, fecha_hora_registro');

    if (desde) query = query.gte('fecha_hora_registro', `${desde}T00:00:00`);
    if (hasta) query = query.lte('fecha_hora_registro', `${hasta}T23:59:59`);

    const { data, error } = await query;
    if (error) throw new Error(`Error calculando resumen: ${error.message}`);

    let totalNC = 0;
    let totalND = 0;
    let cantidadNotas = data ? data.length : 0;

    (data || []).forEach((n) => {
      const monto = Number(n.monto) || 0;
      if (n.tipo === 'Nota de Crédito') totalNC += monto;
      if (n.tipo === 'Nota de Débito') totalND += monto;
    });

    return {
      cantidadNotas,
      totalNC,
      totalND,
      netoAjustes: totalND - totalNC,
    };
  }

  /**
   * Listar facturas de origen de ventas_mock_origen
   */
  static async listarVentasMock() {
    const { data, error } = await supabaseAdmin
      .from('ventas_mock_origen')
      .select('id, numero_comprobante, cliente_id, monto_total, estado')
      .order('numero_comprobante', { ascending: true });

    if (error) throw new Error(`Error al listar ventas: ${error.message}`);

    return (data || []).map((v) => ({
      id: v.id,
      numeroComprobante: v.numero_comprobante,
      clienteId: v.cliente_id,
      montoTotal: Number(v.monto_total),
      estado: v.estado,
    }));
  }

  /**
   * Listar clientes para selectores y gestión crediticia
   */
  static async listarClientes() {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, razon_social, cuit, limite_credito, saldo_actual, estado')
      .order('razon_social', { ascending: true });

    if (error) throw new Error(`Error al listar clientes: ${error.message}`);

    return (data || []).map((c) => ({
      id: c.id,
      razonSocial: c.razon_social,
      cuit: c.cuit,
      limiteCredito: Number(c.limite_credito) || 0,
      saldoActual: Number(c.saldo_actual) || 0,
      estado: Boolean(c.estado),
    }));
  }

  /**
   * Actualizar límite de crédito de un cliente (HU-24)
   */
  static async actualizarLimiteCredito(clienteId, nuevoLimite) {
    const limiteNumerico = Number(nuevoLimite);
    if (isNaN(limiteNumerico) || limiteNumerico < 0) {
      throw new Error('El límite de crédito debe ser un número mayor o igual a 0.');
    }

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .update({ limite_credito: limiteNumerico })
      .eq('id', clienteId)
      .select('id, razon_social, cuit, limite_credito, saldo_actual, estado')
      .single();

    if (error) throw new Error(`Error al actualizar límite: ${error.message}`);
    if (!data) throw new Error('Cliente no encontrado.');

    return {
      id: data.id,
      razonSocial: data.razon_social,
      cuit: data.cuit,
      limiteCredito: Number(data.limite_credito) || 0,
      saldoActual: Number(data.saldo_actual) || 0,
      estado: Boolean(data.estado),
    };
  }

  /**
   * Generar correlativo independiente por tipo (NC-0001, ND-0001)
   */
  static async generarNumeroComprobante(tipo) {
    const prefijo = tipo === 'Nota de Crédito' ? 'NC' : 'ND';

    const { data } = await supabaseAdmin
      .from('notas_credito_debito')
      .select('numero_comprobante')
      .ilike('numero_comprobante', `${prefijo}-%`)
      .order('fecha_hora_registro', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return `${prefijo}-0001`;
    }

    const ultimoNumero = parseInt(data[0].numero_comprobante.split('-')[1], 10) || 0;
    const siguiente = String(ultimoNumero + 1).padStart(4, '0');
    return `${prefijo}-${siguiente}`;
  }

  /**
   * Alta transaccional de Nota de Crédito / Débito (HU-23)
   */
  static async crearNota(payload) {
    const { tipo, facturaOrigenId, motivo, lineas, afectaInventario, montoManual } = payload;
    const monto = Number(montoManual);

    if (!tipo || !facturaOrigenId || !motivo || !monto || monto <= 0) {
      throw new Error('Datos incompletos o monto inválido.');
    }

    // 1. Verificar factura de origen
    const { data: factura, error: errFactura } = await supabaseAdmin
      .from('ventas_mock_origen')
      .select('id, numero_comprobante, cliente_id, monto_total, estado')
      .eq('id', facturaOrigenId)
      .single();

    if (errFactura || !factura) {
      throw new Error('La factura de venta seleccionada no existe.');
    }

    if (factura.estado === 'Anulada') {
      throw new Error('La factura seleccionada no admite más notas de crédito.');
    }

    // 2. Control de tope acumulado para Notas de Crédito
    if (tipo === 'Nota de Crédito') {
      const { data: notasPrevias } = await supabaseAdmin
        .from('notas_credito_debito')
        .select('monto')
        .eq('factura_origen_id', facturaOrigenId)
        .eq('tipo', 'Nota de Crédito');

      const totalPrevio = (notasPrevias || []).reduce((acc, n) => acc + Number(n.monto), 0);

      if (totalPrevio >= Number(factura.monto_total)) {
        throw new Error('La factura seleccionada no admite más notas de crédito.');
      }

      if (totalPrevio + monto > Number(factura.monto_total)) {
        const disponible = Number(factura.monto_total) - totalPrevio;
        throw new Error(
          `El monto supera el tope de la factura. Monto máximo acreditable restante: $${disponible.toLocaleString('es-AR')}`
        );
      }
    }

    // 3. Usuario de auditoría
    const { data: usuarios } = await supabaseAdmin.from('usuarios').select('id').limit(1);
    const usuarioId = usuarios && usuarios.length > 0 ? usuarios[0].id : null;

    // 4. Correlativo e inserción de la cabecera
    const numeroComprobante = await this.generarNumeroComprobante(tipo);

    const { data: nuevaNota, error: errNota } = await supabaseAdmin
      .from('notas_credito_debito')
      .insert([
        {
          numero_comprobante: numeroComprobante,
          tipo,
          factura_origen_id: facturaOrigenId,
          monto,
          fecha_hora_registro: new Date().toISOString(),
          usuario_id: usuarioId,
          motivo: motivo.trim(),
          afecta_inventario: Boolean(afectaInventario),
        },
      ])
      .select()
      .single();

    if (errNota) throw new Error(`Error al registrar la nota: ${errNota.message}`);

    // 5. Devolución a stock si corresponde
    if (tipo === 'Nota de Crédito' && afectaInventario && Array.isArray(lineas) && lineas.length > 0) {
      for (const linea of lineas) {
        await supabaseAdmin.from('notas_credito_debito_detalle').insert([
          {
            nota_id: nuevaNota.id,
            articulo_id: linea.articuloId,
            deposito_id: linea.depositoId,
            cantidad: linea.cantidad,
          },
        ]);

        const { data: stockExistente } = await supabaseAdmin
          .from('existencias')
          .select('id_art_x_dep, cantidad')
          .eq('articulo_id', linea.articuloId)
          .eq('deposito_id', linea.depositoId)
          .maybeSingle();

        if (stockExistente) {
          await supabaseAdmin
            .from('existencias')
            .update({
              cantidad: stockExistente.cantidad + Number(linea.cantidad),
              fecha_hora_actualizacion: new Date().toISOString(),
            })
            .eq('id_art_x_dep', stockExistente.id_art_x_dep);
        } else {
          await supabaseAdmin.from('existencias').insert([
            {
              articulo_id: linea.articuloId,
              deposito_id: linea.depositoId,
              cantidad: Number(linea.cantidad),
              fecha_hora_actualizacion: new Date().toISOString(),
            },
          ]);
        }
      }
    }

    // 6. Impacto en cuenta corriente del cliente
    if (factura.cliente_id) {
      const { data: cliente } = await supabaseAdmin
        .from('clientes')
        .select('id, saldo_actual')
        .eq('id', factura.cliente_id)
        .single();

      if (cliente) {
        const saldoActual = Number(cliente.saldo_actual) || 0;
        const nuevoSaldo = tipo === 'Nota de Crédito' ? saldoActual - monto : saldoActual + monto;

        await supabaseAdmin
          .from('clientes')
          .update({ saldo_actual: Math.max(0, nuevoSaldo) })
          .eq('id', cliente.id);
      }
    }

    // 7. Si la NC cubrió la factura al 100%, anular factura de origen
    if (tipo === 'Nota de Crédito') {
      const { data: todasNC } = await supabaseAdmin
        .from('notas_credito_debito')
        .select('monto')
        .eq('factura_origen_id', facturaOrigenId)
        .eq('tipo', 'Nota de Crédito');

      const acumuladoFinal = (todasNC || []).reduce((acc, n) => acc + Number(n.monto), 0);
      if (acumuladoFinal >= Number(factura.monto_total)) {
        await supabaseAdmin
          .from('ventas_mock_origen')
          .update({ estado: 'Anulada' })
          .eq('id', facturaOrigenId);
      }
    }

    return {
      id: nuevaNota.id,
      numeroComprobante: nuevaNota.numero_comprobante,
      tipo: nuevaNota.tipo,
      afectaInventario: nuevaNota.afecta_inventario,
      lineas: lineas || [],
    };
  }
}

module.exports = CreditNoteService;