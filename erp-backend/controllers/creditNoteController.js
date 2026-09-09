const CreditNoteService = require('../services/creditNoteService');

const listarNotas = async (req, res) => {
  try {
    const notas = await CreditNoteService.listarNotas();
    return res.status(200).json({ success: true, data: notas });
  } catch (error) {
    console.error('[API] Error GET /api/credit-notes:', error);
    return res.status(500).json({ error: error.message });
  }
};

const obtenerResumen = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const resumen = await CreditNoteService.obtenerResumen(desde, hasta);
    return res.status(200).json({ success: true, data: resumen });
  } catch (error) {
    console.error('[API] Error GET /api/credit-notes/summary:', error);
    return res.status(500).json({ error: error.message });
  }
};

const listarVentas = async (req, res) => {
  try {
    const ventas = await CreditNoteService.listarVentasMock();
    return res.status(200).json({ success: true, data: ventas });
  } catch (error) {
    console.error('[API] Error GET /api/credit-notes/sales:', error);
    return res.status(500).json({ error: error.message });
  }
};

const listarClientes = async (req, res) => {
  try {
    const clientes = await CreditNoteService.listarClientes();
    return res.status(200).json({ success: true, data: clientes });
  } catch (error) {
    console.error('[API] Error GET /api/credit-notes/clients:', error);
    return res.status(500).json({ error: error.message });
  }
};

const crearNota = async (req, res) => {
  try {
    const nueva = await CreditNoteService.crearNota(req.body);
    return res.status(201).json({
      success: true,
      message: 'Comprobante emitido con éxito.',
      data: nueva,
    });
  } catch (error) {
    console.error('[API] Error POST /api/credit-notes:', error);
    return res.status(400).json({ error: error.message });
  }
};

const actualizarLimiteCredito = async (req, res) => {
  try {
    const { id } = req.params;
    const { limiteCredito } = req.body;
    const cliente = await CreditNoteService.actualizarLimiteCredito(id, limiteCredito);
    return res.status(200).json({
      success: true,
      message: 'Límite de crédito actualizado correctamente.',
      data: cliente,
    });
  } catch (error) {
    console.error('[API] Error PATCH /api/credit-notes/clients/:id/credit-limit:', error);
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  listarNotas,
  obtenerResumen,
  listarVentas,
  listarClientes,
  crearNota,
  actualizarLimiteCredito,
};