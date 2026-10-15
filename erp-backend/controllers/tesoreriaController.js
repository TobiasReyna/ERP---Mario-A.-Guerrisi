// src/controllers/tesoreriaController.js
const tesoreriaService = require('../services/tesoreriaService');

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

module.exports = {
  getLibroDiario,
  getDetalleEvento,
  getResumenCajas,
  getDashboardGerencial
};