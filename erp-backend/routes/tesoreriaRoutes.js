// src/routes/tesoreriaRoutes.js
const express = require('express');
const router = express.Router();
const tesoreriaController = require('../controllers/tesoreriaController');

// Opcional: Aquí deberías inyectar tu middleware de validación de roles (Gerente/Admin) 
// y validación de token JWT si lo manejas a nivel de rutas en Node.js.
// Ejemplo: router.use(verificarToken, verificarRolGerente);

router.get('/libro-diario', tesoreriaController.getLibroDiario);
router.get('/libro-diario/detalle', tesoreriaController.getDetalleEvento);
router.get('/resumen-diario', tesoreriaController.getResumenCajas);
router.get('/dashboard',tesoreriaController.getDashboardGerencial);
router.get('/reporte-pdf', tesoreriaController.descargarReportePdf);

module.exports = router;