const ClientService = require('../services/clientService');

const listarClientes = async (req, res) => {
  try {
    const data = await ClientService.listarClientes();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[API] Error GET /api/clients:', error);
    return res.status(500).json({ error: error.message });
  }
};

const actualizarLimiteCredito = async (req, res) => {
  try {
    const { id } = req.params;
    const { limiteCredito } = req.body;
    const cliente = await ClientService.actualizarLimiteCredito(id, limiteCredito);
    return res.status(200).json({ success: true, data: cliente });
  } catch (error) {
    console.error('[API] Error PATCH /api/clients/:id/credit-limit:', error);
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  listarClientes,
  actualizarLimiteCredito,
};