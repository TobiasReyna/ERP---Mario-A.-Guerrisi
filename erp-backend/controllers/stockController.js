const StockService = require('../services/stockService');

const transferir = async (req, res) => {
  try {
    const { articulo_id, deposito_origen_id, deposito_destino_id, cantidad, usuario_id } = req.body;

    // 1. Validaciones básicas del payload frontend
    if (!articulo_id || !deposito_origen_id || !deposito_destino_id || cantidad === undefined || !usuario_id) {
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

    // 3. Validación estricta: Stock insuficiente
    const disponibilidad = await StockService.obtenerDisponibilidad(articulo_id);
    const desgloseOrigen = disponibilidad.desglose.find(d => d.deposito_id === deposito_origen_id);
    const stockActual = desgloseOrigen ? desgloseOrigen.cantidad : 0;

    if (stockActual - cantidad < 0) {
      return res.status(400).json({ error: 'Stock insuficiente en el depósito de origen' });
    }

    // 4. Delegar al servicio
    const transferencia = await StockService.transferirStock({
      articulo_id,
      deposito_origen_id,
      deposito_destino_id,
      cantidad,
      usuario_id,
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
    const { articulo_id, deposito_id, cantidad_anterior, cantidad_nueva, motivo_id, usuario_id } = req.body;

    if (!articulo_id || !deposito_id || cantidad_anterior === undefined || cantidad_nueva === undefined || !motivo_id || !usuario_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios en el request.' });
    }

    if (cantidad_anterior === cantidad_nueva) {
      return res.status(400).json({ error: 'La cantidad nueva debe ser diferente a la cantidad anterior.' });
    }

    if (cantidad_nueva < 0) {
      return res.status(400).json({ error: 'Stock insuficiente en el depósito de origen' });
    }

    const ip_origen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const ajuste = await StockService.ajustarStock({
      articulo_id,
      deposito_id,
      cantidad_anterior,
      cantidad_nueva,
      motivo_id,
      usuario_id,
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
    const { deposito_id, stock_minimo, stock_maximo, usuario_id } = req.body;

    // Se valida únicamente que los umbrales numéricos estén presentes
    if (stock_minimo === undefined || stock_maximo === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (stock_minimo, stock_maximo).' });
    }

    if (Number(stock_minimo) > Number(stock_maximo)) {
      return res.status(400).json({ error: 'El stock mínimo no puede ser mayor al stock máximo.' });
    }

    const politicas = await StockService.actualizarPoliticas(articulo_id, {
      deposito_id: (deposito_id === 'TODOS' || !deposito_id) ? null : deposito_id,
      stock_minimo: Number(stock_minimo),
      stock_maximo: Number(stock_maximo),
      usuario_id: usuario_id || null
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

const obtenerInventarioGeneral = async (req, res) => {
    try {
        const inventario = await StockService.obtenerInventarioGeneral();
        return res.status(200).json({ data: inventario });
    } catch (error) {
        console.error('[API] Error GET /api/stock/inventory:', error);
        return res.status(500).json({ error: error.message || 'Error obteniendo inventario general.' });
    }
};

module.exports = {
  transferir,
  ajustar,
  consultarDisponibilidad,
  obtenerHistorial,
  actualizarPoliticas,
  obtenerAlertas,
  obtenerInventarioGeneral
};