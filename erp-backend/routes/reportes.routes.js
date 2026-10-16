const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { verificarSesion, autorizarRoles, ROLES } = require('../middlewares/authMiddleware');

// HU-50 & HU-51: Reporte de Ingresos por Ventas (Caja y Ecommerce)
router.get(
  '/ingresos',
  verificarSesion,
  autorizarRoles([ROLES.ADMIN]),
  reportesController.getIngresos
);

// HU-52: Reporte de Egresos por Pagos a Proveedores (Criterio de Caja)
router.get(
  '/egresos',
  verificarSesion,
  autorizarRoles([ROLES.ADMIN, ROLES.TESORERO]),
  reportesController.getEgresos
);

// HU-53: Balance Consolidado de Ingresos y Egresos
router.get(
  '/balance',
  verificarSesion,
  autorizarRoles([ROLES.ADMIN]),
  reportesController.getBalance
);

// HU-54: Exportación a PDF en streaming ('ingresos' | 'egresos' | 'balance')
router.get(
  '/exportar-pdf',
  verificarSesion,
  autorizarRoles([ROLES.ADMIN, ROLES.TESORERO]),
  reportesController.exportarPdf
);

module.exports = router;
