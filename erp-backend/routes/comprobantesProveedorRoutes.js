// =============================================================================
// comprobantesProveedorRoutes.js — HU-23
// =============================================================================

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/comprobantesProveedorController');

// GET    /api/comprobantes-proveedores
router.get('/', ctrl.listarComprobantes);

// GET    /api/comprobantes-proveedores/cxp-pendientes/:proveedorId
router.get('/cxp-pendientes/:proveedorId', ctrl.listarCxpPendientesPorProveedor);

// POST   /api/comprobantes-proveedores
router.post('/', ctrl.registrarComprobante);

module.exports = router;

