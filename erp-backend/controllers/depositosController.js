const depositosService = require('../services/depositosService');

const getDepositos = async (req, res) => {
  try {
    const data = await depositosService.obtenerDepositosActivos();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener depósitos:', error);
    res.status(500).json({ error: 'Error interno al obtener las sucursales.' });
  }
};

module.exports = { getDepositos };