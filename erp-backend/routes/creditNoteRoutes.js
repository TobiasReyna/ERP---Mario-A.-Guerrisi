const express = require('express');
const router = express.Router();
const creditNoteController = require('../controllers/creditNoteController');

router.get('/', creditNoteController.listarNotas);
router.get('/summary', creditNoteController.obtenerResumen);
router.get('/sales', creditNoteController.listarVentas);
router.post('/', creditNoteController.crearNota);

module.exports = router;