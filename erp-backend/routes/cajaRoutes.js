const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');

// HU-26 · Apertura de caja
router.get('/', cajaController.listarCajas);
router.get('/sesion-activa', cajaController.obtenerSesionActiva);
router.post('/abrir', cajaController.abrirCaja);

// HU-27 · Movimientos manuales y saldo de efectivo
router.get('/resumen', cajaController.obtenerResumen);
router.get('/conceptos', cajaController.listarConceptos);
router.get('/movimientos', cajaController.listarMovimientos);
router.post('/movimientos', cajaController.registrarMovimiento);

// HU-28 · Cierre y arqueo ciego
router.get('/arqueo/contexto', cajaController.obtenerContextoArqueo);
router.post('/cerrar', cajaController.cerrarCaja);
router.get('/sesiones/:sesionId/reporte-cierre', cajaController.descargarReporteCierre);

module.exports = router;