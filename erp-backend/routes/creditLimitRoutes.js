const express = require('express');
const router = express.Router();
const creditLimitController = require('../controllers/creditLimitController');

router.get('/', creditLimitController.listar);
router.patch('/:id', creditLimitController.actualizar);

module.exports = router;