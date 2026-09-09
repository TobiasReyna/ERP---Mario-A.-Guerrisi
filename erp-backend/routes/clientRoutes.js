const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/', clientController.listarClientes);
router.patch('/:id/credit-limit', clientController.actualizarLimiteCredito);

module.exports = router;