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
    const { fecha, deposito_id } = req.query;
    if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria.' });

    const data = await tesoreriaService.obtenerDashboardGerencial({ fecha, deposito_id });
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