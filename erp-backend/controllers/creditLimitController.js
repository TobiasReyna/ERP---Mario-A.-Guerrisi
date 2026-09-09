const CreditLimitService = require('../services/creditLimitService');

const listar = async (req, res) => {
  try {
    const data = await CreditLimitService.listarClientesConCredito();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[API] Error GET /api/credit-limits:', error);
    return res.status(500).json({ error: error.message });
  }
};

const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { limiteCredito } = req.body;
    const cliente = await CreditLimitService.actualizarLimite(id, limiteCredito);
    return res.status(200).json({
      success: true,
      message: 'Límite de crédito actualizado correctamente.',
      data: cliente,
    });
  } catch (error) {
    console.error('[API] Error PATCH /api/credit-limits/:id:', error);
    return res.status(400).json({ error: error.message });
  }
};

module.exports = { listar, actualizar };