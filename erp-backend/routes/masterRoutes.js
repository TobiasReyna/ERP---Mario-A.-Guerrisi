const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// Rutas agrupadas para las tablas maestras. 
// Este router se montará directamente sobre '/api'
router.get('/categories', masterController.getCategorias);
router.get('/brands', masterController.getMarcas);
router.get('/countries', masterController.getPaises);
router.get('/deposits', masterController.getDepositosActivos);
router.get('/adjustment-reasons', masterController.getMotivosAjuste);

module.exports = router;
