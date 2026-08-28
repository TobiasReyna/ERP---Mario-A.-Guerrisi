const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

// POST /api/articles - Crear un artículo
router.post('/', articleController.crearArticulo);

// GET /api/articles - Listar artículos activos
router.get('/', articleController.obtenerArticulosActivos);

// GET /api/articles/inactivos - Listar artículos inactivos
router.get('/inactivos', articleController.obtenerArticulosInactivos);

// GET /api/articles/todos - Listar todos los artículos
router.get('/todos', articleController.obtenerTodosArticulos);

// GET /api/articles/:id - Obtener detalle de un artículo
router.get('/:id', articleController.obtenerArticuloPorId);

// PUT /api/articles/:id - Modificar un artículo
router.put('/:id', articleController.modificarArticulo);

// PATCH /api/articles/:id/status - Baja lógica de un artículo
router.patch('/:id/status', articleController.darBajaLogica);

// PATCH /api/articles/:id/reactivate - Alta lógica de un artículo
router.patch('/:id/reactivate', articleController.darAltaLogica);

module.exports = router;
