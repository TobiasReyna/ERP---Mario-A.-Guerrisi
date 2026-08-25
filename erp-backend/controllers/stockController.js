const StockService = require('../services/stockService');

// Usuario hardcodeado para Sprint 1
const TEST_USER_ID = "7ab3d65c-eecc-4f0b-98a1-2c53efce620e";

const transferir = async (req, res) => {
  try {
    const { articulo_id, deposito_origen_id, deposito_destino_id, cantidad } = req.body;

    // 1. Validaciones básicas del payload frontend
    if (!articulo_id || !deposito_origen_id || !deposito_destino_id || cantidad === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios en el request.' });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad a transferir debe ser mayor a 0.' });
    }

    if (deposito_origen_id === deposito_destino_id) {
      return res.status(400).json({ error: 'El depósito de origen y de destino no pueden ser el mismo.' });
    }

    // 2. Extraer IP del origen
    const ip_origen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // 3. Delegar al servicio (Inyectando el TEST_USER_ID transparente al Frontend)
    const transferencia = await StockService.transferirStock({
      articulo_id,
      deposito_origen_id,
      deposito_destino_id,
      cantidad,
      usuario_id: TEST_USER_ID,
      ip_origen
    });

    return res.status(201).json({
      message: 'Transferencia registrada con éxito.',
      data: transferencia
    });

  } catch (error) {
    console.error('[API] Error POST /api/stock/transfer:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno procesando la transferencia.' 
    });
  }
};

const ajustar = async (req, res) => {
  try {
    const { articulo_id, deposito_id, cantidad_anterior, cantidad_nueva, motivo_id } = req.body;

    if (!articulo_id || !deposito_id || cantidad_anterior === undefined || cantidad_nueva === undefined || !motivo_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios en el request.' });
    }

    if (cantidad_anterior === cantidad_nueva) {
      return res.status(400).json({ error: 'La cantidad nueva debe ser diferente a la cantidad anterior.' });
    }

    const ip_origen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const ajuste = await StockService.ajustarStock({
      articulo_id,
      deposito_id,
      cantidad_anterior,
      cantidad_nueva,
      motivo_id,
      usuario_id: TEST_USER_ID,
      ip_origen
    });

    return res.status(201).json({
      message: 'Ajuste registrado con éxito.',
      data: ajuste
    });

  } catch (error) {
    console.error('[API] Error POST /api/stock/adjust:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno procesando el ajuste.' 
    });
  }
};

const consultarDisponibilidad = async (req, res) => {
    try {
        const { articulo_id } = req.params;
        
        if (!articulo_id) {
            return res.status(400).json({ error: 'Falta el ID del artículo.' });
        }

        const disponibilidad = await StockService.obtenerDisponibilidad(articulo_id);

        return res.status(200).json({
            data: disponibilidad
        });
    } catch (error) {
        console.error('[API] Error GET /api/stock/:articulo_id:', error);
        return res.status(500).json({ 
            error: error.message || 'Error interno consultando disponibilidad.' 
        });
    }
};

const obtenerHistorial = async (req, res) => {
    try {
        const { articulo_id } = req.params;
        if (!articulo_id) {
            return res.status(400).json({ error: 'Falta el ID del artículo.' });
        }

        const historial = await StockService.obtenerHistorial(articulo_id);

        return res.status(200).json({
            data: historial
        });
    } catch (error) {
        console.error('[API] Error GET /api/stock/:articulo_id/history:', error);
        return res.status(500).json({ 
            error: error.message || 'Error interno consultando el historial.' 
        });
    }
};

const actualizarPoliticas = async (req, res) => {
    try {
        const { articulo_id } = req.params;
        const { deposito_id, stock_minimo, stock_maximo } = req.body;

        if (!deposito_id || stock_minimo === undefined || stock_maximo === undefined) {
            return res.status(400).json({ error: 'Faltan campos (deposito_id, stock_minimo, stock_maximo).' });
        }

        const politicas = await StockService.actualizarPoliticas(articulo_id, {
            deposito_id,
            stock_minimo,
            stock_maximo,
            usuario_id: TEST_USER_ID
        });

        return res.status(200).json({
            message: 'Políticas actualizadas correctamente.',
            data: politicas 
        });
    } catch (error) {
        console.error('[API] Error PUT /api/stock/policies/:articulo_id:', error);
        return res.status(500).json({ error: error.message || 'Error actualizando políticas.' });
    }
};

const obtenerAlertas = async (req, res) => {
    try {
        const alertas = await StockService.obtenerAlertas();
        return res.status(200).json({ data: alertas });
    } catch (error) {
        console.error('[API] Error GET /api/stock/alerts:', error);
        return res.status(500).json({ error: error.message || 'Error obteniendo alertas.' });
    }
};

module.exports = {
  transferir,
  ajustar,
  consultarDisponibilidad,
  obtenerHistorial,
  actualizarPoliticas,
  obtenerAlertas
};