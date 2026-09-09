const express = require('express');
const router = express.Router();
const creditNoteController = require('../controllers/creditNoteController');

router.get('/', creditNoteController.listarNotas);
router.get('/summary', creditNoteController.obtenerResumen);
router.get('/sales', creditNoteController.listarVentas);
router.get('/clients', creditNoteController.listarClientes);
router.post('/', creditNoteController.crearNota);
router.patch('/clients/:id/credit-limit', creditNoteController.actualizarLimiteCredito);

module.exports = router;