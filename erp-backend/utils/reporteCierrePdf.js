const PDFDocument = require('pdfkit');

const TZ = 'America/Argentina/Buenos_Aires';
const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
const money = (n) => ARS.format(Number(n || 0)).replace(/\u00a0/g, ' ');
const fechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }) : '-');

const METODOS = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'T. débito',
  tarjeta_credito: 'T. crédito',
  transferencia: 'Transferencia',
};

const MARGEN = 40;
const ANCHO = 595.28 - MARGEN * 2; // A4

/**
 * Reporte de Cierre de Caja (PDF). Recibe lo que devuelve la función SQL caja_reporte_cierre().
 * Devuelve el documento de pdfkit: el llamador lo conecta a la respuesta HTTP y llama a .end().
 */
function generarReporteCierre(datos) {
  const { sesion, detalle, movimientos = [], ventas = [] } = datos;
  const doc = new PDFDocument({ size: 'A4', margin: MARGEN, bufferPages: true, info: { Title: 'Reporte de Cierre de Caja' } });

  const asegurarEspacio = (alto) => {
    if (doc.y + alto > doc.page.height - MARGEN - 30) doc.addPage();
  };

  const titulo = (texto) => {
    asegurarEspacio(60);
    doc.x = MARGEN;
    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(texto, MARGEN, doc.y, { width: ANCHO });
    doc.moveTo(MARGEN, doc.y + 2).lineTo(MARGEN + ANCHO, doc.y + 2).strokeColor('#d1d5db').stroke();
    doc.moveDown(0.5).font('Helvetica').fontSize(10).fillColor('#111827');
  };

  // Fila "etiqueta ........ valor"
  const fila = (etiqueta, valor, opts = {}) => {
    asegurarEspacio(18);
    const y = doc.y;
    doc.font(opts.negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.tam || 10).fillColor(opts.color || '#111827');
    doc.text(etiqueta, MARGEN, y, { width: ANCHO * 0.6 });
    doc.text(valor, MARGEN + ANCHO * 0.6, y, { width: ANCHO * 0.4, align: 'right' });
    doc.y = y + (opts.tam || 10) + 5;
  };

  // ── Encabezado ──
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text('Reporte de Cierre de Caja', MARGEN, MARGEN, { width: ANCHO });
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('Documento interno - no válido como factura', MARGEN, doc.y, { width: ANCHO });
  doc.moveDown(0.6).fillColor('#111827').fontSize(10);
  fila('Sucursal', sesion.depositoNombre);
  fila('Caja', sesion.cajaNombre);
  fila('Cajero', sesion.cajero || '-');
  fila('Apertura', fechaHora(sesion.apertura));
  fila('Cierre', fechaHora(sesion.cierre));

  // ── Arqueo ──
  titulo('Arqueo de efectivo');
  fila('Fondo de caja inicial', money(detalle.fondoInicial));
  fila('+ Ventas cobradas en efectivo', money(detalle.ventasEfectivo));
  fila('+ Ingresos manuales', money(detalle.ingresos));
  fila('- Egresos manuales', money(detalle.egresos));
  fila('Saldo teórico (sistema)', money(sesion.saldoTeorico), { negrita: true });
  fila('Efectivo físico contado', money(sesion.montoFisico), { negrita: true });
  const dif = Number(sesion.diferenciaArqueo);
  const etiquetaDif = dif < 0 ? 'FALTANTE' : dif > 0 ? 'SOBRANTE' : 'SIN DIFERENCIA';
  fila(`Diferencia (${etiquetaDif})`, `${dif > 0 ? '+' : ''}${money(dif)}`, {
    negrita: true,
    tam: 12,
    color: dif < 0 ? '#b91c1c' : dif > 0 ? '#b45309' : '#047857',
  });

  // ── Medios de pago ──
  titulo('Ventas cobradas por medio de pago (conciliación)');
  fila('Efectivo', money(detalle.ventasEfectivo));
  fila('Tarjeta de débito', money(detalle.ventasTarjetaDebito));
  fila('Tarjeta de crédito', money(detalle.ventasTarjetaCredito));
  fila('Transferencia', money(detalle.ventasTransferencia));
  fila(`Total cobrado (${detalle.cantidadVentas} venta${Number(detalle.cantidadVentas) === 1 ? '' : 's'})`, money(detalle.totalCobrado), { negrita: true });

  // ── Movimientos manuales ──
  titulo('Ingresos y egresos manuales');
  if (movimientos.length === 0) {
    doc.fillColor('#6b7280').text('Sin movimientos manuales en este turno.', MARGEN, doc.y, { width: ANCHO }).fillColor('#111827');
  } else {
    movimientos.forEach((m) => {
      asegurarEspacio(30);
      const y = doc.y;
      const signo = m.tipo === 'Egreso' ? '-' : '+';
      doc.font('Helvetica').fontSize(9).fillColor('#111827');
      doc.text(hora(m.fechaHora), MARGEN, y, { width: 40 });
      doc.text(m.tipo, MARGEN + 42, y, { width: 48 });
      const detalleTxt = `${m.concepto}${m.esContraAsiento ? ' (corrección)' : ''}${m.observacion ? ` - ${m.observacion}` : ''}`;
      doc.text(detalleTxt, MARGEN + 95, y, { width: ANCHO - 95 - 90 });
      const yFin = doc.y;
      doc.font('Helvetica-Bold').fillColor(m.tipo === 'Egreso' ? '#b91c1c' : '#047857');
      doc.text(`${signo}${money(m.monto)}`, MARGEN + ANCHO - 90, y, { width: 90, align: 'right' });
      doc.y = Math.max(yFin, y + 12) + 3;
      doc.fillColor('#111827');
    });
  }

  // ── Ventas del turno ──
  titulo('Ventas del turno');
  if (ventas.length === 0) {
    doc.fillColor('#6b7280').text('Sin ventas confirmadas en este turno.', MARGEN, doc.y, { width: ANCHO }).fillColor('#111827');
  } else {
    ventas.forEach((v) => {
      asegurarEspacio(18);
      const y = doc.y;
      const medios = (v.pagos || []).map((p) => `${METODOS[p.metodo] || p.metodo} ${money(p.monto)}`).join(' | ');
      const cobrado = (v.pagos || []).reduce((a, p) => a + Number(p.monto), 0);
      doc.font('Helvetica').fontSize(9).fillColor('#111827');
      doc.text(v.numeroComprobante || '-', MARGEN, y, { width: 80 });
      doc.text(hora(v.fechaHora), MARGEN + 82, y, { width: 38 });
      doc.text(medios, MARGEN + 125, y, { width: ANCHO - 125 - 90 });
      const yFin = doc.y;
      doc.font('Helvetica-Bold').text(money(cobrado), MARGEN + ANCHO - 90, y, { width: 90, align: 'right' });
      doc.y = Math.max(yFin, y + 12) + 3;
    });
  }

  // ── Pie con numeración en todas las páginas ──
  const rango = doc.bufferedPageRange();
  for (let i = rango.start; i < rango.start + rango.count; i += 1) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor('#9ca3af');
    doc.text(
      `Generado el ${fechaHora(new Date().toISOString())}  |  Página ${i - rango.start + 1} de ${rango.count}`,
      MARGEN,
      doc.page.height - MARGEN - 14,
      { width: ANCHO, align: 'center', lineBreak: false }
    );
  }

  return doc;
}

/**
 * HU-54: Generador de Reportes Gerenciales en PDF (Ingresos, Egresos y Balance).
 * Reutiliza las convenciones de pdfkit, formato ARS y zona horaria America/Argentina/Buenos_Aires.
 */
function generarReporteGerencialPdf({ tipo, reporte, metadatos = {} }) {
  const titulosMap = {
    ingresos: 'Reporte Gerencial de Ingresos por Ventas',
    egresos: 'Reporte Gerencial de Egresos a Proveedores',
    balance: 'Balance Financiero de Ingresos y Egresos',
  };

  const tituloPrincipal = titulosMap[tipo] || 'Reporte Gerencial';
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGEN,
    bufferPages: true,
    info: { Title: tituloPrincipal, Author: 'ERP Mario A. Guerrisi' },
  });

  const LIMITE_Y = doc.page.height - MARGEN - 35;

  const asegurarEspacio = (altoRequerido, onNewPage) => {
    if (doc.y + altoRequerido > LIMITE_Y) {
      doc.addPage();
      doc.y = MARGEN;
      if (typeof onNewPage === 'function') {
        onNewPage();
      }
    }
  };

  const seccionTitulo = (texto) => {
    asegurarEspacio(45);
    doc.x = MARGEN;
    doc.moveDown(0.7);
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#111827').text(texto, MARGEN, doc.y, { width: ANCHO });
    doc.moveTo(MARGEN, doc.y + 2).lineTo(MARGEN + ANCHO, doc.y + 2).strokeColor('#e11d48').lineWidth(1).stroke();
    doc.lineWidth(0.5);
    doc.moveDown(0.5).font('Helvetica').fontSize(9.5).fillColor('#111827');
  };

  const filaResumen = (etiqueta, valor, opts = {}) => {
    asegurarEspacio(16);
    const y = doc.y;
    doc
      .font(opts.negrita ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(opts.tam || 9.5)
      .fillColor(opts.color || '#111827');
    doc.text(etiqueta, MARGEN, y, { width: ANCHO * 0.62 });
    doc.text(String(valor ?? '-'), MARGEN + ANCHO * 0.62, y, { width: ANCHO * 0.38, align: 'right' });
    doc.y = y + (opts.tam || 9.5) + 5;
  };

  const dibujarEncabezadoTabla = (columnas) => {
    const y = doc.y;
    doc.rect(MARGEN, y - 2, ANCHO, 18).fill('#f3f4f6');
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8.5);
    let x = MARGEN + 4;
    columnas.forEach((col) => {
      doc.text(col.titulo, x, y + 2, {
        width: col.ancho - 8,
        align: col.align || 'left',
        lineBreak: false,
      });
      x += col.ancho;
    });
    doc.y = y + 19;
  };

  const dibujarFilaTabla = (columnas, valores, opts = {}) => {
    asegurarEspacio(20, () => dibujarEncabezadoTabla(columnas));
    const y = doc.y;
    if (opts.fondo) {
      doc.rect(MARGEN, y - 2, ANCHO, 16).fill(opts.fondo);
    }
    doc
      .font(opts.negrita ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8.5)
      .fillColor(opts.color || '#1f2937');

    let x = MARGEN + 4;
    columnas.forEach((col, idx) => {
      const val = String(valores[idx] ?? '—');
      const colorCelda = col.colorFn ? col.colorFn(valores[idx]) : opts.color || '#1f2937';
      doc.fillColor(colorCelda).text(val, x, y + 1, {
        width: col.ancho - 8,
        align: col.align || 'left',
        ellipsis: true,
        lineBreak: false,
      });
      x += col.ancho;
    });

    doc.moveTo(MARGEN, y + 14).lineTo(MARGEN + ANCHO, y + 14).strokeColor('#e5e7eb').stroke();
    doc.y = y + 16;
  };

  // ── Membrete Formal ──
  doc.rect(MARGEN, MARGEN, ANCHO, 54).fill('#111827');
  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .fillColor('#ffffff')
    .text('MARIO A. GUERRISI — INSTRUMENTOS MUSICALES', MARGEN + 14, MARGEN + 11, { width: ANCHO - 28 });
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor('#f43f5e')
    .text(tituloPrincipal.toUpperCase(), MARGEN + 14, MARGEN + 31, { width: ANCHO - 28 });

  doc.y = MARGEN + 64;
  doc
    .font('Helvetica-Oblique')
    .fontSize(8.5)
    .fillColor('#6b7280')
    .text('Documento interno de gestión gerencial — No válido como factura', MARGEN, doc.y, { width: ANCHO });
  doc.moveDown(0.5);

  // ── Metadatos y Filtros Aplicados ──
  const f = reporte.filtros || {};
  const periodoStr = `${f.desde || '-'} al ${f.hasta || '-'}`;
  const usuarioStr = metadatos.usuarioNombre || 'Administrador';
  const rolStr = metadatos.usuarioRol || 'Administrador';
  const fechaGenStr = fechaHora(new Date().toISOString());

  filaResumen('Período consultado', periodoStr, { negrita: true });
  filaResumen('Agrupación temporal', String(f.agrupacion || 'dia').toUpperCase());
  if (metadatos.filtrosDescripcion) {
    filaResumen('Filtros activos', metadatos.filtrosDescripcion);
  }
  filaResumen('Generado por', `${usuarioStr} (${rolStr})`);
  filaResumen('Fecha y hora de generación (AR)', fechaGenStr);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. REPORTE DE INGRESOS (HU-51 / HU-54)
  // ═══════════════════════════════════════════════════════════════════════════
  if (tipo === 'ingresos') {
    const kpis = reporte.kpis || {};
    seccionTitulo('Indicadores Clave del Período (KPIs)');
    filaResumen('Total de Ingresos por Ventas', money(kpis.totalIngresos), {
      negrita: true,
      tam: 11,
      color: '#047857',
    });
    filaResumen('Cantidad de Transacciones Confirmadas', String(kpis.cantidadTransacciones || 0), {
      negrita: true,
    });
    filaResumen('Ticket Promedio', money(kpis.ticketPromedio));

    seccionTitulo('Desglose por Canal de Venta (HU-50)');
    (reporte.desgloseCanal || []).forEach((c) => {
      filaResumen(
        `${c.etiqueta} (${c.cantidad} venta${c.cantidad === 1 ? '' : 's'} — ${c.porcentaje}%)`,
        money(c.monto)
      );
    });

    seccionTitulo('Distribución por Medio de Pago');
    if (!reporte.distribucionMedioPago || reporte.distribucionMedioPago.length === 0) {
      doc.fillColor('#6b7280').text('Sin cobros registrados en el período.', MARGEN, doc.y);
    } else {
      reporte.distribucionMedioPago.forEach((m) => {
        filaResumen(`${m.etiqueta} (${m.porcentaje}%)`, money(m.monto));
      });
    }

    seccionTitulo('Ventas por Sucursal');
    if (!reporte.ventasPorSucursal || reporte.ventasPorSucursal.length === 0) {
      doc.fillColor('#6b7280').text('Sin ventas por sucursal en el período.', MARGEN, doc.y);
    } else {
      reporte.ventasPorSucursal.forEach((s) => {
        filaResumen(`${s.sucursal} (${s.cantidad} op. — ${s.porcentaje}%)`, money(s.monto));
      });
    }

    seccionTitulo('Detalle de Ventas Confirmadas');
    const colsVentas = [
      { titulo: 'FECHA / HORA', ancho: 78 },
      { titulo: 'COMPROBANTE', ancho: 78 },
      { titulo: 'CANAL', ancho: 56 },
      { titulo: 'SUCURSAL', ancho: 85 },
      { titulo: 'CLIENTE', ancho: 95 },
      { titulo: 'MEDIO PAGO', ancho: 58 },
      { titulo: 'IMPORTE', ancho: 65, align: 'right' },
    ];

    const listaVentas = reporte.ventas || [];
    if (listaVentas.length === 0) {
      doc.fillColor('#6b7280').text('Sin ingresos en el período seleccionado.', MARGEN, doc.y);
    } else {
      dibujarEncabezadoTabla(colsVentas);
      listaVentas.forEach((v, idx) => {
        const fechaTxt = `${v.fecha ? v.fecha.split('-').reverse().join('/') : ''} ${v.hora || ''}`.trim();
        const mediosCorto =
          (v.medios_pago || []).length > 1
            ? 'Mixto'
            : (v.medios_pago || [])[0]?.etiqueta || (v.canal_venta === 'Ecommerce' ? 'Online' : '—');
        dibujarFilaTabla(
          colsVentas,
          [
            fechaTxt,
            v.numero_comprobante,
            v.canal_venta,
            v.sucursal,
            v.cliente,
            mediosCorto,
            money(v.monto),
          ],
          { fondo: idx % 2 === 1 ? '#f9fafb' : null }
        );
      });
      dibujarFilaTabla(
        colsVentas,
        ['TOTAL', `${listaVentas.length} ventas`, '', '', '', '', money(kpis.totalIngresos)],
        { negrita: true, fondo: '#f3f4f6' }
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REPORTE DE EGRESOS A PROVEEDORES (HU-52 / HU-54)
  // ═══════════════════════════════════════════════════════════════════════════
  if (tipo === 'egresos') {
    const kpis = reporte.kpis || {};
    seccionTitulo('Indicadores de Egresos a Proveedores (Criterio de Caja)');
    filaResumen('Total Pagado a Proveedores', money(kpis.totalPagado), {
      negrita: true,
      tam: 11,
      color: '#b91c1c',
    });
    filaResumen('Cantidad de Pagos Registrados', String(kpis.cantidadPagos || 0), { negrita: true });
    filaResumen('Pago Promedio', money(kpis.pagoPromedio));
    filaResumen('Proveedores con Pagos en el Período', String(kpis.cantidadProveedores || 0));

    seccionTitulo('Ranking de Proveedores (Ordenado de Mayor a Menor Monto)');
    const colsRanking = [
      { titulo: '#', ancho: 28 },
      { titulo: 'RAZÓN SOCIAL', ancho: 215 },
      { titulo: 'CUIT', ancho: 85 },
      { titulo: 'PAGOS', ancho: 52, align: 'right' },
      { titulo: '% PART.', ancho: 55, align: 'right' },
      { titulo: 'MONTO PAGADO', ancho: 80, align: 'right' },
    ];

    const ranking = reporte.rankingProveedores || [];
    if (ranking.length === 0) {
      doc.fillColor('#6b7280').text('Sin pagos a proveedores en el período seleccionado.', MARGEN, doc.y);
    } else {
      dibujarEncabezadoTabla(colsRanking);
      ranking.forEach((r, idx) => {
        dibujarFilaTabla(
          colsRanking,
          [
            String(idx + 1),
            r.razon_social,
            r.cuit || '—',
            String(r.cantidad_pagos),
            `${r.porcentaje}%`,
            money(r.monto),
          ],
          { fondo: idx % 2 === 1 ? '#f9fafb' : null }
        );
      });
    }

    seccionTitulo('Detalle Cronológico de Pagos Imputados');
    const colsPagos = [
      { titulo: 'FECHA / HORA', ancho: 82 },
      { titulo: 'PROVEEDOR', ancho: 145 },
      { titulo: 'COMPROBANTE / CXP', ancho: 125 },
      { titulo: 'REGISTRADO POR', ancho: 83 },
      { titulo: 'MONTO PAGADO', ancho: 80, align: 'right' },
    ];

    const pagos = reporte.pagos || [];
    if (pagos.length === 0) {
      doc.fillColor('#6b7280').text('Sin pagos registrados en el período.', MARGEN, doc.y);
    } else {
      dibujarEncabezadoTabla(colsPagos);
      pagos.forEach((p, idx) => {
        const fechaTxt = `${p.fecha ? p.fecha.split('-').reverse().join('/') : ''} ${p.hora || ''}`.trim();
        dibujarFilaTabla(
          colsPagos,
          [
            fechaTxt,
            p.razon_social,
            p.comprobante,
            p.usuario_nombre,
            money(p.monto_pagado),
          ],
          { fondo: idx % 2 === 1 ? '#f9fafb' : null }
        );
      });
      dibujarFilaTabla(
        colsPagos,
        ['TOTAL', `${pagos.length} pagos`, '', '', money(kpis.totalPagado)],
        { negrita: true, fondo: '#f3f4f6' }
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. BALANCE FINANCIERO DE INGRESOS Y EGRESOS (HU-53 / HU-54)
  // ═══════════════════════════════════════════════════════════════════════════
  if (tipo === 'balance') {
    const kpis = reporte.kpis || {};
    const comp = reporte.comparativa || {};

    seccionTitulo('Resultado Consolidado del Período');
    filaResumen('Total de Ingresos por Ventas (Confirmadas)', money(kpis.totalIngresos), {
      negrita: true,
      color: '#047857',
    });
    filaResumen('Total de Egresos por Pagos a Proveedores', money(kpis.totalEgresos), {
      negrita: true,
      color: '#b91c1c',
    });
    filaResumen(
      `Resultado Neto (${kpis.esNegativo ? 'SALDO NEGATIVO' : 'SALDO POSITIVO'})`,
      money(kpis.resultadoNeto),
      {
        negrita: true,
        tam: 12,
        color: kpis.esNegativo ? '#dc2626' : '#047857',
      }
    );

    if (comp.periodoAnterior) {
      seccionTitulo(
        `Comparativa vs. Período Equivalente Anterior (${comp.periodoAnterior.desde} al ${comp.periodoAnterior.hasta})`
      );
      const fmtVar = (item) => {
        if (!item) return '-';
        const signo = item.variacionAbsoluta > 0 ? '+' : '';
        const pct = item.variacionPorcentual !== null ? `${signo}${item.variacionPorcentual}%` : 'N/A';
        return `Anterior: ${money(item.anterior)}  |  Var: ${signo}${money(item.variacionAbsoluta)} (${pct})`;
      };
      filaResumen('Ingresos', fmtVar(comp.ingresos));
      filaResumen('Egresos', fmtVar(comp.egresos));
      filaResumen('Resultado Neto', fmtVar(comp.neto), {
        negrita: true,
        color: (comp.neto?.variacionAbsoluta || 0) < 0 ? '#dc2626' : '#047857',
      });
    }

    seccionTitulo('Desglose de Ingresos por Canal');
    (reporte.desglose?.ingresosPorCanal || []).forEach((c) => {
      filaResumen(`${c.etiqueta} (${c.cantidad} ventas — ${c.porcentaje}%)`, money(c.monto));
    });

    seccionTitulo('Desglose de Egresos por Proveedor (Top 10 y Resto)');
    const topProv = reporte.desglose?.egresosPorProveedor || [];
    if (topProv.length === 0) {
      doc.fillColor('#6b7280').text('Sin egresos registrados en el período.', MARGEN, doc.y);
    } else {
      topProv.forEach((p) => {
        filaResumen(`${p.razon_social} (${p.cantidad_pagos} pagos — ${p.porcentaje}%)`, money(p.monto));
      });
    }

    seccionTitulo('Evolución Temporal y Saldo Neto Acumulado');
    const colsBalance = [
      { titulo: 'PERÍODO', ancho: 95 },
      { titulo: 'INGRESOS', ancho: 105, align: 'right' },
      { titulo: 'EGRESOS', ancho: 105, align: 'right' },
      { titulo: 'RESULTADO NETO', ancho: 105, align: 'right' },
      { titulo: 'NETO ACUMULADO', ancho: 105, align: 'right' },
    ];

    const serie = reporte.serieComparativa || [];
    if (serie.length === 0) {
      doc.fillColor('#6b7280').text('Sin movimientos en el período seleccionado.', MARGEN, doc.y);
    } else {
      dibujarEncabezadoTabla(colsBalance);
      serie.forEach((filaSerie, idx) => {
        dibujarFilaTabla(
          colsBalance,
          [
            filaSerie.etiqueta,
            money(filaSerie.ingresos),
            money(filaSerie.egresos),
            money(filaSerie.neto),
            money(filaSerie.netoAcumulado),
          ],
          {
            fondo: idx % 2 === 1 ? '#f9fafb' : null,
            color: filaSerie.neto < 0 ? '#b91c1c' : '#1f2937',
          }
        );
      });
      dibujarFilaTabla(
        colsBalance,
        [
          'TOTAL PERÍODO',
          money(kpis.totalIngresos),
          money(kpis.totalEgresos),
          money(kpis.resultadoNeto),
          money(kpis.resultadoNeto),
        ],
        {
          negrita: true,
          fondo: '#f3f4f6',
          color: kpis.esNegativo ? '#dc2626' : '#111827',
        }
      );
    }

    if (reporte.leyenda) {
      asegurarEspacio(40);
      doc.moveDown(0.8);
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#4b5563')
        .text(`Nota metodológica: ${reporte.leyenda}`, MARGEN, doc.y, { width: ANCHO });
    }
  }

  // ── Pie con numeración "Página X de Y" en todas las páginas ──
  const rango = doc.bufferedPageRange();
  for (let i = rango.start; i < rango.start + rango.count; i += 1) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
    doc.text(
      `Mario A. Guerrisi ERP  |  Generado el ${fechaGenStr}  |  Página ${i - rango.start + 1} de ${rango.count}`,
      MARGEN,
      doc.page.height - MARGEN - 14,
      { width: ANCHO, align: 'center', lineBreak: false }
    );
  }

  return doc;
}

module.exports = { generarReporteCierre, generarReporteGerencialPdf };