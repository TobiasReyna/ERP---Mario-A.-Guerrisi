const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/', clientController.listarClientes);
// IMPORTANTE: debe ir antes que /:id/credit-limit para que Express no confunda "search" con un id
router.get('/search', clientController.buscarClientes);
router.post('/', clientController.crearCliente);
router.patch('/:id/credit-limit', clientController.actualizarLimiteCredito);

module.exports = router;