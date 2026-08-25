const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

// POST /api/articles - Crear un artículo
router.post('/', articleController.crearArticulo);

module.exports = router;
