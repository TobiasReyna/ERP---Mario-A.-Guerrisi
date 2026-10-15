// src/controllers/tesoreriaController.js
const PDFDocument = require('pdfkit');
const tesoreriaService = require('../services/tesoreriaService');
const { supabaseAdmin } = require('../config/supabase');

const getLibroDiario = async (req, res) => {
  try {
    const { fecha, deposito_id, caja_id, cajero_id, tipo_evento, medio_pago, page = 1 } = req.query;

    if (!fecha || !deposito_id) {
      return res.status(400).json({ error: 'La fecha y la sucursal (deposito_id) son obligatorias.' });
    }

    const limit = 500;
    const offset = (page - 1) * limit;

    const data = await tesoreriaService.obtenerLibroDiario({
      fecha, deposito_id, caja_id, cajero_id, tipo_evento, medio_pago, limit, offset
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Error en getLibroDiario:', error);
    res.status(500).json({ error: 'Error interno al obtener el libro diario.' });
  }
};

const getDetalleEvento = async (req, res) => {
  try {
    const { tipo_evento, referencia_id } = req.query;

    if (!tipo_evento || !referencia_id) {
      return res.status(400).json({ error: 'Faltan parámetros: tipo_evento y referencia_id son obligatorios.' });
    }

    const data = await tesoreriaService.obtenerDetalleEvento({ tipo_evento, referencia_id });
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en getDetalleEvento:', error);
    res.status(500).json({ error: 'Error interno al obtener el detalle del evento.' });
  }
};

const getResumenCajas = async (req, res) => {
  try {
    const { fecha, deposito_id } = req.query;

    if (!fecha || !deposito_id) {
      return res.status(400).json({ error: 'La fecha y la sucursal son obligatorias.' });
    }

    const data = await tesoreriaService.obtenerResumenCajas({ fecha, deposito_id });
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en getResumenCajas:', error);
    res.status(500).json({ error: 'Error interno al obtener el resumen de cajas.' });
  }
};

const getDashboardGerencial = async (req, res) => {
  try {
    const { fecha, deposito_id, periodo = 'dia' } = req.query;
    if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria.' });

    // Calculamos el inicio y fin del periodo (Día, Semana o Mes) basándonos en la fecha elegida
    const ref = new Date(fecha + 'T12:00:00Z'); 
    let desde, hasta, pDesde, pHasta;

    if (periodo === 'dia') {
      desde = ref; hasta = ref;
      pDesde = new Date(ref); pDesde.setDate(ref.getDate() - 7); // Compara contra el mismo día de la semana pasada
      pHasta = pDesde;
    } else if (periodo === 'semana') {
      const day = ref.getDay() || 7; // Lunes a Domingo
      desde = new Date(ref); desde.setDate(ref.getDate() - day + 1);
      hasta = new Date(desde); hasta.setDate(desde.getDate() + 6);
      pDesde = new Date(desde); pDesde.setDate(desde.getDate() - 7);
      pHasta = new Date(hasta); pHasta.setDate(hasta.getDate() - 7);
    } else if (periodo === 'mes') {
      desde = new Date(ref.getFullYear(), ref.getMonth(), 1, 12);
      hasta = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 12);
      pDesde = new Date(ref.getFullYear(), ref.getMonth() - 1, 1, 12);
      pHasta = new Date(ref.getFullYear(), ref.getMonth(), 0, 12);
    }

    const fmt = (d) => d.toISOString().split('T')[0];

    const data = await tesoreriaService.obtenerDashboardGerencial({
      fechaDesde: fmt(desde),
      fechaHasta: fmt(hasta),
      fechaDesdePrev: fmt(pDesde),
      fechaHastaPrev: fmt(pHasta),
      deposito_id
    });
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en getDashboardGerencial:', error);
    res.status(500).json({ error: 'Error interno al obtener el dashboard.' });
  }
};

const generarContenidoPdf = (doc, data) => {
  const { fecha, sucursalNombre, resumen, movimientos, generador } = data;
  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(val || 0));
  
  // Totales
  const totalFondo = resumen.reduce((a, c) => a + Number(c.fondo_inicial), 0);
  const totalEfectivo = resumen.reduce((a, c) => a + Number(c.ventas_efectivo), 0);
  const totalElectronico = resumen.reduce((a, c) => a + Number(c.ventas_debito + c.ventas_credito + c.ventas_transferencia), 0);
  const totalDiferencia = resumen.reduce((a, c) => a + Number(c.diferencia || 0), 0);

  // Encabezado
  doc.fontSize(16).font('Helvetica-Bold').text('Reporte Diario de Movimientos de Caja', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(10).font('Helvetica');
  doc.text(`Sucursal: ${sucursalNombre.replace(/-/g, ' ')}`, { continued: true }).text(`Fecha del Movimiento: ${fecha}`, { align: 'right' });
  doc.text(`Generado por: ${generador}`, { continued: true }).text(`Fecha de Impresión: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`, { align: 'right' });
  doc.moveTo(40, doc.y + 10).lineTo(550, doc.y + 10).stroke('#cccccc');
  doc.moveDown(2);

  // Sección 1: Indicadores y Medios de Pago
  doc.fontSize(12).font('Helvetica-Bold').text('Resumen General del Día');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Total Fondo Inicial: ${formatMoney(totalFondo)}`);
  doc.text(`Total Ventas Efectivo: ${formatMoney(totalEfectivo)}`);
  doc.text(`Total Ventas Medios Electrónicos: ${formatMoney(totalElectronico)}`);
  doc.text(`Diferencia de Arqueo Consolidada: ${formatMoney(totalDiferencia)}`);
  doc.moveDown(2);

  // Sección 2: Resumen por Caja (Tabla)
  doc.fontSize(12).font('Helvetica-Bold').text('Arqueos por Turno y Caja');
  doc.moveDown(0.5);
  
  const drawRow = (y, c1, c2, c3, c4, c5, isBold = false) => {
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    doc.text(c1, 40, y, { width: 100 });
    doc.text(c2, 140, y, { width: 100 });
    doc.text(c3, 240, y, { width: 100 });
    doc.text(c4, 340, y, { width: 100, align: 'right' });
    doc.text(c5, 450, y, { width: 100, align: 'right' });
  };

  let currentY = doc.y;
  drawRow(currentY, 'CAJA', 'CAJERO', 'ESTADO', 'S. TEÓRICO', 'DIFERENCIA', true);
  currentY += 15;
  doc.moveTo(40, currentY).lineTo(550, currentY).stroke('#eeeeee');
  currentY += 5;

  resumen.forEach(c => {
    drawRow(currentY, c.caja_nombre, c.cajero_nombre, c.estado, formatMoney(c.saldo_teorico), formatMoney(c.diferencia));
    currentY += 15;
  });
  doc.y = currentY + 20;

  // Sección 3: Detalle Cronológico (Controlando salto de página)
  doc.fontSize(12).font('Helvetica-Bold').text('Detalle Cronológico de Movimientos');
  doc.moveDown(0.5);

  const drawMovRow = (y, m1, m2, m3, m4, m5, isBold = false) => {
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
    doc.text(m1, 40, y, { width: 50 }); // Hora
    doc.text(m2, 90, y, { width: 60 }); // Tipo
    doc.text(m3, 150, y, { width: 100 }); // Caja
    doc.text(m4, 250, y, { width: 200 }); // Detalle
    doc.text(m5, 460, y, { width: 90, align: 'right' }); // Monto
  };

  currentY = doc.y;
  drawMovRow(currentY, 'HORA', 'TIPO', 'CAJA/CAJERO', 'DETALLE', 'MONTO', true);
  currentY += 15;
  doc.moveTo(40, currentY).lineTo(550, currentY).stroke('#eeeeee');
  currentY += 5;

  (movimientos || []).forEach(mov => {
    // Paginación dinámica: si pasamos el margen inferior (ej. 750), creamos nueva página
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
      drawMovRow(currentY, 'HORA', 'TIPO', 'CAJA/CAJERO', 'DETALLE', 'MONTO', true);
      currentY += 15;
      doc.moveTo(40, currentY).lineTo(550, currentY).stroke('#eeeeee');
      currentY += 5;
    }

    const hora = new Date(mov.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const cajaCajero = `${mov.caja_nombre} (${mov.cajero_nombre})`;
    const signo = (mov.tipo_evento === 'Egreso') ? '-' : (mov.tipo_evento === 'Venta' || mov.tipo_evento === 'Ingreso') ? '+' : '';
    
    drawMovRow(currentY, hora, mov.tipo_evento.toUpperCase(), cajaCajero, mov.detalle, `${signo}${formatMoney(mov.monto)}`);
    currentY += 15;
  });

  // Paginación "Página X de Y" (Ejecutado al final sobre el buffer de páginas)
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').text(
      `Página ${i + 1} de ${range.count}`,
      0,
      doc.page.height - 30,
      { align: 'center' }
    );
  }
};

const descargarReportePdf = async (req, res) => {
  try {
    const { fecha, deposito_id } = req.query;
    
    // Validar fecha futura
    const fechaConsulta = new Date(fecha + 'T12:00:00Z');
    const hoy = new Date();
    if (fechaConsulta > hoy) {
      return res.status(400).json({ error: 'No se puede generar un reporte de una fecha futura.' });
    }

    // Obtener nombre de la sucursal
    let sucursalNombre = 'Todas-las-Sucursales';
    if (deposito_id) {
      const { data: sucursal } = await supabaseAdmin.from('depositos').select('nombre').eq('id', deposito_id).single();
      if (sucursal) sucursalNombre = sucursal.nombre.replace(/\s+/g, '-');
    }

    // 1. Obtener datos (Resumen de cajas y movimientos cronológicos)
    const resumen = await tesoreriaService.obtenerResumenCajas({ fecha, deposito_id });
    
    // Reutilizamos la lógica del Libro Diario para los movimientos
    const { data: movimientos } = await supabaseAdmin.rpc('obtener_libro_diario', {
      p_fecha: fecha,
      p_deposito_id: deposito_id || null,
      p_tipo_evento: null
    });

    // 2. Registrar en Auditoría (Requisito de la HU)
    await supabaseAdmin.from('auditoria_logs').insert([{
      usuario_id: req.user?.id ||null, // Asumiendo que el middleware de auth inyecta req.user
      accion: 'GENERAR_REPORTE_CAJA_PDF',
      entidad: 'Tesoreria',
      detalles: { fecha_reporte: fecha, deposito_id },
      ip: req.ip
    }]);

    // 3. Generar el PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    
    const filename = `movimiento-caja-${sucursalNombre}-${fecha}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // También protegemos el nombre del generador
    const nombreGenerador = req.user?.nombre || 'Usuario de Prueba';

    generarContenidoPdf(doc, { 
      fecha, 
      sucursalNombre, 
      resumen, 
      movimientos, 
      generador: nombreGenerador 
    });
    
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ error: 'Error interno al generar el reporte PDF.' });
  }
};

module.exports = {
  getLibroDiario,
  getDetalleEvento,
  getResumenCajas,
  getDashboardGerencial,
  descargarReportePdf
};