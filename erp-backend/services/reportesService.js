const { supabaseAdmin } = require('../config/supabase');

const TZ_ARGENTINA = 'America/Argentina/Buenos_Aires';

const ETIQUETAS_METODO_PAGO = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Tarjeta de Débito',
  tarjeta_credito: 'Tarjeta de Crédito',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago',
};

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Obtiene la fecha actual (YYYY-MM-DD) en America/Argentina/Buenos_Aires.
 */
function obtenerHoyArgentina() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_ARGENTINA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Normaliza un timestamp proveniente de PostgreSQL (timestamp without time zone o timestamptz)
 * y obtiene su fecha YYYY-MM-DD y hora HH:mm en America/Argentina/Buenos_Aires.
 */
function parsearFechaHoraArgentina(rawTs) {
  if (!rawTs) return null;
  const str = String(rawTs).trim();
  // Si el timestamp no trae sufijo de zona horaria, se interpreta en horario local de Argentina (-03:00)
  const tieneZona = /Z$|[+-]\d{2}:?\d{2}$/.test(str);
  const normalizado = tieneZona ? str : `${str.replace(' ', 'T')}-03:00`;
  const dateObj = new Date(normalizado);
  if (Number.isNaN(dateObj.getTime())) return null;

  const fecha = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_ARGENTINA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);

  const hora = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ_ARGENTINA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj);

  return { dateObj, fecha, hora, iso: dateObj.toISOString() };
}

/**
 * Valida que el rango de fechas sea coherente y no supere los 12 meses (HU-51).
 */
function validarYNormalizarRango(desdeParam, hastaParam) {
  const hoy = obtenerHoyArgentina();
  const desde = desdeParam || hoy;
  const hasta = hastaParam || hoy;

  const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexFecha.test(desde) || !regexFecha.test(hasta)) {
    const err = new Error('Formato de fecha inválido. Utilice YYYY-MM-DD.');
    err.statusCode = 400;
    throw err;
  }

  const dDesde = new Date(`${desde}T00:00:00-03:00`);
  const dHasta = new Date(`${hasta}T23:59:59.999-03:00`);

  if (Number.isNaN(dDesde.getTime()) || Number.isNaN(dHasta.getTime())) {
    const err = new Error('Las fechas ingresadas no son válidas.');
    err.statusCode = 400;
    throw err;
  }

  if (dHasta < dDesde) {
    const err = new Error('La fecha final no puede ser anterior a la fecha inicial.');
    err.statusCode = 400;
    throw err;
  }

  // Máximo 12 meses (366 días)
  const diffDias = Math.floor((dHasta.getTime() - dDesde.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias > 366) {
    const err = new Error('El rango de fechas no puede superar el máximo de 12 meses.');
    err.statusCode = 400;
    throw err;
  }

  return {
    desde,
    hasta,
    inicioFiltro: `${desde}T00:00:00`,
    finFiltro: `${hasta}T23:59:59.999`,
    diasInclusivos: diffDias + 1,
  };
}

/**
 * Calcula el período equivalente inmediatamente anterior a [desde, hasta].
 */
function calcularPeriodoAnterior(desde, hasta) {
  const dDesde = new Date(`${desde}T12:00:00-03:00`);
  const dHasta = new Date(`${hasta}T12:00:00-03:00`);
  const dias = Math.round((dHasta.getTime() - dDesde.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const dHastaPrev = new Date(dDesde);
  dHastaPrev.setDate(dHastaPrev.getDate() - 1);

  const dDesdePrev = new Date(dHastaPrev);
  dDesdePrev.setDate(dDesdePrev.getDate() - (dias - 1));

  const fmt = (d) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ_ARGENTINA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

  return {
    desdePrev: fmt(dDesdePrev),
    hastaPrev: fmt(dHastaPrev),
    dias,
  };
}

/**
 * Obtiene la clave de ordenamiento y la etiqueta legible para la serie temporal
 * según la agrupación ('dia' | 'semana' | 'mes').
 */
function obtenerClaveAgrupacion(fechaYYYYMMDD, agrupacion = 'dia') {
  const [anio, mes, dia] = fechaYYYYMMDD.split('-').map(Number);

  if (agrupacion === 'mes') {
    const clave = `${anio}-${String(mes).padStart(2, '0')}`;
    const etiqueta = `${String(mes).padStart(2, '0')}/${anio}`;
    return { clave, etiqueta };
  }

  if (agrupacion === 'semana') {
    const d = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
    const dayOfWeek = d.getUTCDay() || 7; // Lunes = 1 ... Domingo = 7
    d.setUTCDate(d.getUTCDate() - dayOfWeek + 1);
    const lAnio = d.getUTCFullYear();
    const lMes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const lDia = String(d.getUTCDate()).padStart(2, '0');
    const clave = `${lAnio}-${lMes}-${lDia}`;
    const etiqueta = `Sem. ${lDia}/${lMes}`;
    return { clave, etiqueta };
  }

  // Por defecto: 'dia'
  return {
    clave: fechaYYYYMMDD,
    etiqueta: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`,
  };
}

function formatearMetodoPago(metodo) {
  if (!metodo) return 'Sin especificar';
  const limpio = String(metodo).trim().toLowerCase();
  return ETIQUETAS_METODO_PAGO[limpio] || metodo;
}

class ReportesService {
  /**
   * HU-50 y HU-51: Reporte de Ingresos por Ventas
   * Consulta public.ventas (estado = 'Confirmada') cruzando con public.pagos_venta y public.depositos.
   * Excluye ventas canceladas/pendientes y movimientos manuales de caja.
   */
  static async obtenerReporteIngresos({
    desde,
    hasta,
    canal_venta,
    deposito_id,
    medio_pago,
    agrupacion = 'dia',
  }) {
    const rango = validarYNormalizarRango(desde, hasta);
    const agr = ['dia', 'semana', 'mes'].includes(agrupacion) ? agrupacion : 'dia';

    let query = supabaseAdmin
      .from('ventas')
      .select(`
        id,
        numero_comprobante,
        deposito_id,
        usuario_id,
        cliente_id,
        estado,
        total,
        canal_venta,
        fecha_hora_registro,
        fecha_hora_reserva,
        lista_precio_id,
        depositos ( id, nombre ),
        clientes ( id, razon_social, dni, cuit ),
        usuarios ( id, nombre ),
        listas_precios ( id, nombre, porcentaje ),
        pagos_venta ( id, metodo, monto, fecha_hora_registro ),
        ventas_detalle (
          id,
          articulo_id,
          cantidad,
          precio_unitario,
          importe_linea,
          articulos ( id, codigo_interno, descripcion )
        )
      `)
      .eq('estado', 'Confirmada')
      .gte('fecha_hora_registro', rango.inicioFiltro)
      .lte('fecha_hora_registro', rango.finFiltro)
      .order('fecha_hora_registro', { ascending: false });

    if (canal_venta && canal_venta !== 'Todos' && ['Caja', 'Ecommerce'].includes(canal_venta)) {
      query = query.eq('canal_venta', canal_venta);
    }

    if (deposito_id) {
      query = query.eq('deposito_id', deposito_id);
    }

    const { data: ventasRaw, error } = await query;
    if (error) {
      throw new Error(`Error al consultar ingresos por ventas: ${error.message}`);
    }

    const filtroMedio = medio_pago && medio_pago !== 'Todos' ? String(medio_pago).trim().toLowerCase() : null;

    let totalIngresos = 0;
    let cantidadTransacciones = 0;

    const canalesMap = {
      Caja: { canal: 'Caja', etiqueta: 'Presencial (Caja)', monto: 0, cantidad: 0 },
      Ecommerce: { canal: 'Ecommerce', etiqueta: 'E-commerce', monto: 0, cantidad: 0 },
    };

    const mediosPagoMap = new Map();
    const sucursalesMap = new Map();
    const serieMap = new Map();
    const ventasProcesadas = [];

    for (const v of ventasRaw || []) {
      const parsedFecha = parsearFechaHoraArgentina(v.fecha_hora_registro || v.fecha_hora_reserva);
      if (!parsedFecha) continue;

      // Verificar corte en America/Argentina/Buenos_Aires
      if (parsedFecha.fecha < rango.desde || parsedFecha.fecha > rango.hasta) {
        continue;
      }

      const pagos = Array.isArray(v.pagos_venta) ? v.pagos_venta : [];

      // Si hay filtro de medio de pago activo, verificamos que la venta tenga pagos en ese medio
      let pagosConsiderados = pagos;
      if (filtroMedio) {
        pagosConsiderados = pagos.filter(
          (p) => String(p.metodo || '').trim().toLowerCase() === filtroMedio
        );
        if (pagosConsiderados.length === 0) {
          continue;
        }
      }

      // Importe computado de la venta (repartido por medio de pago si se filtra por medio)
      const sumaPagos = pagosConsiderados.reduce((acc, p) => acc + Number(p.monto || 0), 0);
      const montoVenta = round2(pagosConsiderados.length > 0 ? sumaPagos : Number(v.total || 0));

      const canal = v.canal_venta === 'Ecommerce' ? 'Ecommerce' : 'Caja';
      const sucursalNombre = v.depositos?.nombre || 'Sucursal Principal';
      const sucursalId = v.deposito_id;

      totalIngresos = round2(totalIngresos + montoVenta);
      cantidadTransacciones += 1;

      // 1. Desglose por canal
      if (!canalesMap[canal]) {
        canalesMap[canal] = { canal, etiqueta: canal, monto: 0, cantidad: 0 };
      }
      canalesMap[canal].monto = round2(canalesMap[canal].monto + montoVenta);
      canalesMap[canal].cantidad += 1;

      // 2. Distribución por medio de pago
      if (pagosConsiderados.length > 0) {
        const metodosVistosEnVenta = new Set();
        for (const p of pagosConsiderados) {
          const metodoKey = String(p.metodo || 'otros').trim().toLowerCase();
          const mMonto = round2(Number(p.monto || 0));
          if (!mediosPagoMap.has(metodoKey)) {
            mediosPagoMap.set(metodoKey, {
              metodo: metodoKey,
              etiqueta: formatearMetodoPago(metodoKey),
              monto: 0,
              cantidad: 0,
            });
          }
          const entry = mediosPagoMap.get(metodoKey);
          entry.monto = round2(entry.monto + mMonto);
          if (!metodosVistosEnVenta.has(metodoKey)) {
            entry.cantidad += 1;
            metodosVistosEnVenta.add(metodoKey);
          }
        }
      } else {
        const metodoKey = canal === 'Ecommerce' ? 'pasarela_ecommerce' : 'sin_especificar';
        if (!mediosPagoMap.has(metodoKey)) {
          mediosPagoMap.set(metodoKey, {
            metodo: metodoKey,
            etiqueta: canal === 'Ecommerce' ? 'Pasarela Online' : 'Sin especificar',
            monto: 0,
            cantidad: 0,
          });
        }
        const entry = mediosPagoMap.get(metodoKey);
        entry.monto = round2(entry.monto + montoVenta);
        entry.cantidad += 1;
      }

      // 3. Ventas por sucursal
      if (!sucursalesMap.has(sucursalId)) {
        sucursalesMap.set(sucursalId, {
          deposito_id: sucursalId,
          sucursal: sucursalNombre,
          monto: 0,
          cantidad: 0,
        });
      }
      const sucEntry = sucursalesMap.get(sucursalId);
      sucEntry.monto = round2(sucEntry.monto + montoVenta);
      sucEntry.cantidad += 1;

      // 4. Serie temporal
      const { clave, etiqueta } = obtenerClaveAgrupacion(parsedFecha.fecha, agr);
      if (!serieMap.has(clave)) {
        serieMap.set(clave, {
          periodo: clave,
          etiqueta,
          total: 0,
          caja: 0,
          ecommerce: 0,
          cantidad: 0,
        });
      }
      const serieEntry = serieMap.get(clave);
      serieEntry.total = round2(serieEntry.total + montoVenta);
      if (canal === 'Ecommerce') {
        serieEntry.ecommerce = round2(serieEntry.ecommerce + montoVenta);
      } else {
        serieEntry.caja = round2(serieEntry.caja + montoVenta);
      }
      serieEntry.cantidad += 1;

      // 5. Detalle de la venta para tabla y modal (HU-51 Criterio 3)
      const pagosDetalle = pagos.map((p) => ({
        id: p.id,
        metodo: p.metodo,
        etiqueta: formatearMetodoPago(p.metodo),
        monto: round2(Number(p.monto || 0)),
      }));

      const itemsDetalle = (v.ventas_detalle || []).map((det) => ({
        id: det.id,
        articulo_id: det.articulo_id,
        codigo_interno: det.articulos?.codigo_interno || '—',
        descripcion: det.articulos?.descripcion || 'Artículo',
        cantidad: Number(det.cantidad || 0),
        precio_unitario: round2(Number(det.precio_unitario || 0)),
        importe_linea: round2(Number(det.importe_linea || 0)),
      }));

      ventasProcesadas.push({
        id: v.id,
        numero_comprobante: v.numero_comprobante || `PED-${String(v.id).slice(0, 8).toUpperCase()}`,
        fecha_hora: v.fecha_hora_registro || v.fecha_hora_reserva,
        fecha: parsedFecha.fecha,
        hora: parsedFecha.hora,
        canal_venta: canal,
        deposito_id: sucursalId,
        sucursal: sucursalNombre,
        cliente: v.clientes?.razon_social || 'Consumidor Final',
        cliente_documento: v.clientes?.cuit || v.clientes?.dni || '—',
        vendedor: v.usuarios?.nombre || 'Sistema',
        lista_precio: v.listas_precios?.nombre || 'Precio Base',
        lista_precio_porcentaje: v.listas_precios?.porcentaje ?? 0,
        medios_pago: pagosDetalle,
        medio_pago_resumen:
          pagosDetalle.length > 0
            ? pagosDetalle.map((p) => `${p.etiqueta} ($${p.monto.toLocaleString('es-AR')})`).join(' + ')
            : canal === 'Ecommerce'
            ? 'Pasarela Online'
            : '—',
        monto: montoVenta,
        total_venta: round2(Number(v.total || 0)),
        items: itemsDetalle,
      });
    }

    const ticketPromedio =
      cantidadTransacciones > 0 ? round2(totalIngresos / cantidadTransacciones) : 0;

    const desgloseCanal = Object.values(canalesMap).map((c) => ({
      ...c,
      porcentaje: totalIngresos > 0 ? round2((c.monto / totalIngresos) * 100) : 0,
    }));

    const distribucionMedioPago = Array.from(mediosPagoMap.values())
      .map((m) => ({
        ...m,
        porcentaje: totalIngresos > 0 ? round2((m.monto / totalIngresos) * 100) : 0,
      }))
      .sort((a, b) => b.monto - a.monto);

    const ventasPorSucursal = Array.from(sucursalesMap.values())
      .map((s) => ({
        ...s,
        porcentaje: totalIngresos > 0 ? round2((s.monto / totalIngresos) * 100) : 0,
      }))
      .sort((a, b) => b.monto - a.monto);

    const serieTemporal = Array.from(serieMap.values()).sort((a, b) =>
      a.periodo.localeCompare(b.periodo)
    );

    return {
      filtros: {
        desde: rango.desde,
        hasta: rango.hasta,
        canal_venta: canal_venta || 'Todos',
        deposito_id: deposito_id || '',
        medio_pago: medio_pago || '',
        agrupacion: agr,
      },
      kpis: {
        totalIngresos,
        cantidadTransacciones,
        ticketPromedio,
        porCanal: {
          Caja: desgloseCanal.find((c) => c.canal === 'Caja') || {
            canal: 'Caja',
            monto: 0,
            cantidad: 0,
            porcentaje: 0,
          },
          Ecommerce: desgloseCanal.find((c) => c.canal === 'Ecommerce') || {
            canal: 'Ecommerce',
            monto: 0,
            cantidad: 0,
            porcentaje: 0,
          },
        },
      },
      desgloseCanal,
      distribucionMedioPago,
      ventasPorSucursal,
      serieTemporal,
      ventas: ventasProcesadas,
    };
  }

  /**
   * HU-52: Reporte de Egresos por Pagos a Proveedores
   * Criterio de caja sobre public.pagos_cxp filtrando por fecha_pago,
   * cruzando con public.cuentas_por_pagar y public.proveedores.
   * Agrupa por razon_social ordenado de mayor a menor monto.
   */
  static async obtenerReporteEgresos({
    desde,
    hasta,
    proveedor_id,
    agrupacion = 'dia',
  }) {
    const rango = validarYNormalizarRango(desde, hasta);
    const agr = ['dia', 'semana', 'mes'].includes(agrupacion) ? agrupacion : 'dia';

    const { data: pagosRaw, error } = await supabaseAdmin
      .from('pagos_cxp')
      .select(`
        id,
        cuenta_por_pagar_id,
        monto_pagado,
        fecha_pago,
        usuario_id,
        usuarios ( id, nombre ),
        cuentas_por_pagar (
          id,
          proveedor_id,
          orden_compra_id,
          comprobante_proveedor_id,
          monto_total,
          saldo_pendiente,
          fecha_vencimiento,
          estado,
          proveedores ( id, razon_social, cuit ),
          ordenes_compra ( id, numero_orden ),
          comprobantes_proveedores ( id, numero_comprobante, tipo_comprobante, fecha_emision )
        )
      `)
      .gte('fecha_pago', rango.inicioFiltro)
      .lte('fecha_pago', rango.finFiltro)
      .order('fecha_pago', { ascending: false });

    if (error) {
      throw new Error(`Error al consultar egresos por pagos a proveedores: ${error.message}`);
    }

    let totalPagado = 0;
    let cantidadPagos = 0;

    const proveedoresMap = new Map();
    const serieMap = new Map();
    const pagosProcesados = [];

    for (const p of pagosRaw || []) {
      const parsedFecha = parsearFechaHoraArgentina(p.fecha_pago);
      if (!parsedFecha) continue;

      if (parsedFecha.fecha < rango.desde || parsedFecha.fecha > rango.hasta) {
        continue;
      }

      const cxp = p.cuentas_por_pagar;
      const provId = cxp?.proveedor_id || cxp?.proveedores?.id || 'sin-proveedor';
      if (proveedor_id && provId !== proveedor_id) {
        continue;
      }

      const razonSocial = cxp?.proveedores?.razon_social || 'Proveedor sin especificar';
      const cuit = cxp?.proveedores?.cuit || '—';
      const monto = round2(Number(p.monto_pagado || 0));

      const comp = cxp?.comprobantes_proveedores;
      const oc = cxp?.ordenes_compra;

      let referenciaComprobante = `CxP #${String(p.cuenta_por_pagar_id).slice(0, 8).toUpperCase()}`;
      if (comp?.numero_comprobante) {
        referenciaComprobante = `${comp.tipo_comprobante || 'Comprobante'} ${comp.numero_comprobante}`;
      } else if (oc?.numero_orden) {
        referenciaComprobante = `Orden de Compra #${oc.numero_orden}`;
      }

      const usuarioNombre = p.usuarios?.nombre || 'Tesorero / Admin';

      totalPagado = round2(totalPagado + monto);
      cantidadPagos += 1;

      const detallePago = {
        id: p.id,
        fecha_pago: p.fecha_pago,
        fecha: parsedFecha.fecha,
        hora: parsedFecha.hora,
        monto_pagado: monto,
        cuenta_por_pagar_id: p.cuenta_por_pagar_id,
        proveedor_id: provId,
        razon_social: razonSocial,
        cuit,
        comprobante: referenciaComprobante,
        orden_compra: oc?.numero_orden ? `OC #${oc.numero_orden}` : '—',
        estado_cxp: cxp?.estado || '—',
        usuario_nombre: usuarioNombre,
      };

      pagosProcesados.push(detallePago);

      // Agrupar por razon_social (HU-52)
      const provKey = `${razonSocial}__${provId}`;
      if (!proveedoresMap.has(provKey)) {
        proveedoresMap.set(provKey, {
          proveedor_id: provId,
          razon_social: razonSocial,
          cuit,
          monto: 0,
          cantidad_pagos: 0,
          pagos: [],
        });
      }
      const provEntry = proveedoresMap.get(provKey);
      provEntry.monto = round2(provEntry.monto + monto);
      provEntry.cantidad_pagos += 1;
      provEntry.pagos.push(detallePago);

      // Serie temporal
      const { clave, etiqueta } = obtenerClaveAgrupacion(parsedFecha.fecha, agr);
      if (!serieMap.has(clave)) {
        serieMap.set(clave, {
          periodo: clave,
          etiqueta,
          total: 0,
          cantidad: 0,
        });
      }
      const serieEntry = serieMap.get(clave);
      serieEntry.total = round2(serieEntry.total + monto);
      serieEntry.cantidad += 1;
    }

    const rankingProveedores = Array.from(proveedoresMap.values())
      .map((prov) => ({
        ...prov,
        porcentaje: totalPagado > 0 ? round2((prov.monto / totalPagado) * 100) : 0,
      }))
      .sort((a, b) => b.monto - a.monto);

    const serieTemporal = Array.from(serieMap.values()).sort((a, b) =>
      a.periodo.localeCompare(b.periodo)
    );

    const pagoPromedio = cantidadPagos > 0 ? round2(totalPagado / cantidadPagos) : 0;

    return {
      filtros: {
        desde: rango.desde,
        hasta: rango.hasta,
        proveedor_id: proveedor_id || '',
        agrupacion: agr,
      },
      kpis: {
        totalPagado,
        cantidadPagos,
        pagoPromedio,
        cantidadProveedores: rankingProveedores.length,
        proveedorPrincipal: rankingProveedores[0]
          ? {
              razon_social: rankingProveedores[0].razon_social,
              monto: rankingProveedores[0].monto,
              porcentaje: rankingProveedores[0].porcentaje,
            }
          : null,
      },
      rankingProveedores,
      serieTemporal,
      pagos: pagosProcesados,
    };
  }

  /**
   * HU-53: Balance de Ingresos y Egresos
   * Consolidación en servidor: Resultado Neto = Ingresos - Egresos.
   * Incluye comparativa absoluta y porcentual respecto al período equivalente anterior.
   */
  static async obtenerReporteBalance({
    desde,
    hasta,
    deposito_id,
    agrupacion = 'dia',
  }) {
    const rango = validarYNormalizarRango(desde, hasta);
    const agr = ['dia', 'semana', 'mes'].includes(agrupacion) ? agrupacion : 'dia';
    const { desdePrev, hastaPrev } = calcularPeriodoAnterior(rango.desde, rango.hasta);

    // Ejecutar consultas del período actual y del período equivalente anterior en paralelo
    const [ingresosActual, egresosActual, ingresosPrev, egresosPrev] = await Promise.all([
      this.obtenerReporteIngresos({
        desde: rango.desde,
        hasta: rango.hasta,
        deposito_id,
        agrupacion: agr,
      }),
      this.obtenerReporteEgresos({
        desde: rango.desde,
        hasta: rango.hasta,
        agrupacion: agr,
      }),
      this.obtenerReporteIngresos({
        desde: desdePrev,
        hasta: hastaPrev,
        deposito_id,
        agrupacion: agr,
      }),
      this.obtenerReporteEgresos({
        desde: desdePrev,
        hasta: hastaPrev,
        agrupacion: agr,
      }),
    ]);

    const totalIngresos = round2(ingresosActual.kpis.totalIngresos);
    const totalEgresos = round2(egresosActual.kpis.totalPagado);
    const resultadoNeto = round2(totalIngresos - totalEgresos);

    const prevIngresos = round2(ingresosPrev.kpis.totalIngresos);
    const prevEgresos = round2(egresosPrev.kpis.totalPagado);
    const prevNeto = round2(prevIngresos - prevEgresos);

    const calcVariacion = (actual, anterior) => {
      const variacionAbsoluta = round2(actual - anterior);
      let variacionPorcentual = null;
      if (anterior !== 0) {
        variacionPorcentual = round2(((actual - anterior) / Math.abs(anterior)) * 100);
      } else if (actual > 0) {
        variacionPorcentual = 100;
      } else if (actual < 0) {
        variacionPorcentual = -100;
      } else {
        variacionPorcentual = 0;
      }
      return {
        actual,
        anterior,
        variacionAbsoluta,
        variacionPorcentual,
      };
    };

    // Unificar serie temporal para gráfico comparativo y tabla con neto acumulado (HU-53 Criterio 2)
    const intervalosMap = new Map();

    for (const item of ingresosActual.serieTemporal) {
      intervalosMap.set(item.periodo, {
        periodo: item.periodo,
        etiqueta: item.etiqueta,
        ingresos: item.total,
        egresos: 0,
        cantidadVentas: item.cantidad,
        cantidadPagos: 0,
      });
    }

    for (const item of egresosActual.serieTemporal) {
      if (!intervalosMap.has(item.periodo)) {
        intervalosMap.set(item.periodo, {
          periodo: item.periodo,
          etiqueta: item.etiqueta,
          ingresos: 0,
          egresos: item.total,
          cantidadVentas: 0,
          cantidadPagos: item.cantidad,
        });
      } else {
        const entry = intervalosMap.get(item.periodo);
        entry.egresos = item.total;
        entry.cantidadPagos = item.cantidad;
      }
    }

    const intervalosOrdenados = Array.from(intervalosMap.values()).sort((a, b) =>
      a.periodo.localeCompare(b.periodo)
    );

    let acumulado = 0;
    const serieComparativa = intervalosOrdenados.map((intv) => {
      const neto = round2(intv.ingresos - intv.egresos);
      acumulado = round2(acumulado + neto);
      return {
        ...intv,
        neto,
        netoAcumulado: acumulado,
      };
    });

    // Desglose de proveedores: los 10 mayores y el resto agrupado (HU-53 Criterio 3)
    const rankingCompleto = egresosActual.rankingProveedores || [];
    const top10 = rankingCompleto.slice(0, 10).map((p) => ({
      proveedor_id: p.proveedor_id,
      razon_social: p.razon_social,
      cuit: p.cuit,
      monto: p.monto,
      cantidad_pagos: p.cantidad_pagos,
      porcentaje: p.porcentaje,
    }));

    if (rankingCompleto.length > 10) {
      const resto = rankingCompleto.slice(10);
      const montoResto = round2(resto.reduce((acc, r) => acc + r.monto, 0));
      const pagosResto = resto.reduce((acc, r) => acc + r.cantidad_pagos, 0);
      top10.push({
        proveedor_id: 'otros',
        razon_social: `Otros proveedores (${resto.length})`,
        cuit: '—',
        monto: montoResto,
        cantidad_pagos: pagosResto,
        porcentaje: totalEgresos > 0 ? round2((montoResto / totalEgresos) * 100) : 0,
      });
    }

    return {
      filtros: {
        desde: rango.desde,
        hasta: rango.hasta,
        deposito_id: deposito_id || '',
        agrupacion: agr,
      },
      kpis: {
        totalIngresos,
        totalEgresos,
        resultadoNeto,
        esNegativo: resultadoNeto < 0,
        cantidadVentas: ingresosActual.kpis.cantidadTransacciones,
        cantidadPagos: egresosActual.kpis.cantidadPagos,
        margenSobreIngresos:
          totalIngresos > 0 ? round2((resultadoNeto / totalIngresos) * 100) : 0,
      },
      comparativa: {
        periodoAnterior: {
          desde: desdePrev,
          hasta: hastaPrev,
        },
        ingresos: calcVariacion(totalIngresos, prevIngresos),
        egresos: calcVariacion(totalEgresos, prevEgresos),
        neto: calcVariacion(resultadoNeto, prevNeto),
      },
      serieComparativa,
      desglose: {
        ingresosPorCanal: ingresosActual.desgloseCanal,
        egresosPorProveedor: top10,
      },
      leyenda:
        'Flujo de caja simplificado: contempla únicamente los ingresos por ventas confirmadas (Presencial y E-commerce) menos los pagos efectivos registrados a proveedores (Cuentas por Pagar). No incluye otros gastos operativos (sueldos, alquileres, impuestos, egresos manuales de caja) ni el costo de la mercadería.',
    };
  }
}

module.exports = ReportesService;
