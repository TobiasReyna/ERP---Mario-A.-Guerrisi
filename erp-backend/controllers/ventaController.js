const VentaService = require('../services/ventaService');

// GET /api/ventas — comprobantes de venta confirmados (apartado de Comprobantes)
// IMPORTANTE: debe ir antes que /:id en las rutas para que Express no confunda "ventas" con un id
const listarVentas = async (req, res) => {
  try {
    const data = await VentaService.listarVentasConfirmadas();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[API] Error GET /api/ventas:', error);
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/ventas — Parte 1 del contrato: captura ítems y reserva stock
const crearVentaPendiente = async (req, res) => {
  try {
    const ip_origen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const venta = await VentaService.crearVentaPendiente({ ...req.body, ipOrigen: ip_origen });
    return res.status(201).json({ success: true, data: venta });
  } catch (error) {
    console.error('[API] Error POST /api/ventas:', error);
    return res.status(400).json({ error: error.message });
  }
};

// POST /api/ventas/:id/pagos — Parte 2: agrega un método de pago a la vez
const agregarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await VentaService.agregarPago(id, req.body);
    return res.status(201).json({ success: true, data: pago });
  } catch (error) {
    console.error('[API] Error POST /api/ventas/:id/pagos:', error);
    return res.status(400).json({ error: error.message });
  }
};

// POST /api/ventas/:id/confirmar — genera el comprobante final
const confirmarVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const venta = await VentaService.confirmarVenta(id);
    return res.status(200).json({ success: true, message: 'Venta confirmada.', data: venta });
  } catch (error) {
    console.error('[API] Error POST /api/ventas/:id/confirmar:', error);
    return res.status(400).json({ error: error.message });
  }
};

// PATCH /api/ventas/:id/cancelar — cancelación manual antes de la expiración
const cancelarVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await VentaService.cancelarVenta(id);
    return res.status(200).json({ success: true, message: 'Venta cancelada.', data: resultado });
  } catch (error) {
    console.error('[API] Error PATCH /api/ventas/:id/cancelar:', error);
    return res.status(400).json({ error: error.message });
  }
};

// GET /api/ventas/:id — consulta de una venta puntual (útil para refrescar el ticket)
const obtenerVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const venta = await VentaService.obtenerVentaCompleta(id);
    return res.status(200).json({ success: true, data: venta });
  } catch (error) {
    console.error('[API] Error GET /api/ventas/:id:', error);
    return res.status(404).json({ error: error.message });
  }
};

// GET /api/ventas/buscar/:numero — buscar por número de comprobante
const buscarVentaPorComprobante = async (req, res) => {
  try {
    const { numero } = req.params;
    const venta = await VentaService.buscarVentaPorComprobante(numero);
    return res.status(200).json({ success: true, data: venta });
  } catch (error) {
    console.error('[API] Error GET /api/ventas/buscar/:numero:', error);
    return res.status(404).json({ error: error.message });
  }
};

module.exports = {
  listarVentas,
  crearVentaPendiente,
  agregarPago,
  confirmarVenta,
  cancelarVenta,
  obtenerVenta,
  buscarVentaPorComprobante,
};
