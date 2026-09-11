const express = require('express');
const router = express.Router();
const accountPayableController = require('../controllers/accountPayableController');

// GET /api/accounts-payable
router.get('/', accountPayableController.getAllAccountsPayable);

// POST /api/accounts-payable/sync
router.post('/sync', accountPayableController.syncAccountsPayable);

// POST /api/accounts-payable/:id/pay
router.post('/:id/pay', accountPayableController.registerPayment);

module.exports = router;
