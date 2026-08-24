const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// POST /api/stock/transfer
router.post('/transfer', stockController.transferir);

module.exports = router;