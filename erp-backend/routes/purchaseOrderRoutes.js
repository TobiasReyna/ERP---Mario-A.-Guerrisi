const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');

// GET /api/purchase-orders
router.get('/', purchaseOrderController.getAllPurchaseOrders);

// POST /api/purchase-orders
router.post('/', purchaseOrderController.createPurchaseOrder);

// GET /api/purchase-orders/recent
router.get('/recent', purchaseOrderController.getRecentPurchaseOrder);

// POST /api/purchase-orders/detail
router.post('/detail', purchaseOrderController.createPurchaseOrderDetail);

// PUT /api/purchase-orders/:id/receive
router.put('/:id/receive', purchaseOrderController.receivePurchaseOrder);

// PUT /api/purchase-orders/:id/cancel
router.put('/:id/cancel', purchaseOrderController.cancelPurchaseOrder);

module.exports = router;
