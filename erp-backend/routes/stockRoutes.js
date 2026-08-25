const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// POST /api/stock/transfer
router.post('/transfer', stockController.transferir);

// POST /api/stock/adjust
router.post('/adjust', stockController.ajustar);

// GET /api/stock/:articulo_id
router.get('/:articulo_id', stockController.consultarDisponibilidad);

module.exports = router;