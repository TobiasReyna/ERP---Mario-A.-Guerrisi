const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');

// POST /api/quotes - Crear una cotización
router.post('/', quoteController.crearCotizacion);

// POST /api/quotes/detalle - Crear un detalle de cotización
router.post('/detalle', quoteController.crearCotizacion_detalle);

// POST /api/quotes/proveedor - Asociar un proveedor a una cotización
router.post('/proveedor', quoteController.crearCotizacion_proveedor);

// GET /api/quotes/recientes - Obtener las cotizaciones recientes (para sacar el último ID)
router.get('/recientes', quoteController.obtenerCotizaciones_recientes);

// GET /api/quotes/todas
router.get('/todas', quoteController.obtenerCotizaciones_todas);

// GET /api/quotes/enviadas
router.get('/enviadas', quoteController.obtenerCotizaciones_enviadas);

// GET /api/quotes/aprobadas
router.get('/aprobadas', quoteController.obtenerCotizaciones_aprobadas);

// GET /api/quotes/canceladas
router.get('/canceladas', quoteController.obtenerCotizaciones_canceladas);

// GET /api/quotes/:id/detalle
router.get('/:id/detalle', quoteController.obtenerCotizaciones_detalle);

// GET /api/quotes/:id/proveedores
router.get('/:id/proveedores', quoteController.obtenerCotizacion_proveedores);

// GET /api/quotes/proveedores-detalles/:id
router.get('/proveedores-detalles/:id', quoteController.obtenerCotizaciones_proveedores_detalles);

module.exports = router;
