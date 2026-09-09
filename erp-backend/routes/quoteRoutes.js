const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');

// POST /api/quotes - Crear una cotización
router.post('/', quoteController.crearCotizacion);

// POST /api/quotes/detalle - Crear un detalle de cotización
router.post('/detalle', quoteController.crearCotizacion_detalle);

// POST /api/quotes/proveedor - Asociar un proveedor a una cotización
router.post('/proveedor', quoteController.crearCotizacion_proveedor);

module.exports = router;
