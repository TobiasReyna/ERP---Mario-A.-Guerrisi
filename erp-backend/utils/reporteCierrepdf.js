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

module.exports = { generarReporteCierre };