const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// POST /api/stock/transfer
router.post('/transfer', stockController.transferir);

// POST /api/stock/adjust
router.post('/adjust', stockController.ajustar);

// GET /api/stock/alerts (IMPORTANTE: Debe ir antes que /:articulo_id para que Express no confunda "alerts" con un UUID)
router.get('/alerts', stockController.obtenerAlertas);

// GET /api/stock/inventory
router.get('/inventory', stockController.obtenerInventarioGeneral);

// PUT /api/stock/policies/:articulo_id
router.put('/policies/:articulo_id', stockController.actualizarPoliticas);

// GET /api/stock/:articulo_id/history
router.get('/:articulo_id/history', stockController.obtenerHistorial);

// GET /api/stock/:articulo_id
router.get('/:articulo_id', stockController.consultarDisponibilidad);

module.exports = router;