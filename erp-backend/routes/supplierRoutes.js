const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

// POST /api/suppliers - Alta de proveedor
router.post('/', supplierController.crearProveedor);

// GET /api/suppliers - Listar proveedores activos
router.get('/', supplierController.obtenerProveedoresActivos);

// GET /api/suppliers/todos - Listar todos los proveedores (activos + baja)
router.get('/todos', supplierController.obtenerTodosProveedores);

// GET /api/suppliers/check-cuit - Verificación en vivo de CUIT duplicado
// (debe ir antes de /:id para que Express no lo confunda con un id)
router.get('/check-cuit', supplierController.buscarPorCuit);

// GET /api/suppliers/:id - Ficha de un proveedor
router.get('/:id', supplierController.obtenerProveedorPorId);

// GET /api/suppliers/:id/orders - Historial de órdenes de compra y montos operados
router.get('/:id/orders', supplierController.obtenerHistorialCompras);

// PUT /api/suppliers/:id - Modificar un proveedor
router.put('/:id', supplierController.modificarProveedor);

// PATCH /api/suppliers/:id/status - Baja lógica de un proveedor
router.patch('/:id/status', supplierController.darBajaLogica);

// PATCH /api/suppliers/:id/reactivate - Alta lógica de un proveedor
router.patch('/:id/reactivate', supplierController.darAltaLogica);

module.exports = router;
