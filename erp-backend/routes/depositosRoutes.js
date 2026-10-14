const express = require('express');
const router = express.Router();
const depositosController = require('../controllers/depositosController');

router.get('/', depositosController.getDepositos);

module.exports = router;