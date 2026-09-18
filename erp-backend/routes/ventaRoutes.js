const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');

router.post('/', ventaController.crearVentaPendiente);
router.get('/:id', ventaController.obtenerVenta);
router.post('/:id/pagos', ventaController.agregarPago);
router.post('/:id/confirmar', ventaController.confirmarVenta);
router.patch('/:id/cancelar', ventaController.cancelarVenta);

module.exports = router;
