const PurchaseOrderService = require('../services/purchaseOrderService');

const createPurchaseOrder = async (req, res) => {
    try {
        const { cotizacion_id, proveedor_id } = req.body;
        const usuario_id = "7ab3d65c-eecc-4f0b-98a1-2c53efce620e"; // Hardcoded from previous instructions
        
        if (!cotizacion_id || !proveedor_id) {
            return res.status(400).json({ error: 'Faltan datos obligatorios (cotizacion_id, proveedor_id).' });
        }
        
        const result = await PurchaseOrderService.createPurchaseOrder(cotizacion_id, proveedor_id, usuario_id);
        return res.status(201).json({ data: result });
    } catch (error) {
        console.error('[API] Error POST /api/purchase-orders:', error);
        return res.status(500).json({ error: error.message });
    }
};

const getRecentPurchaseOrder = async (req, res) => {
    try {
        const result = await PurchaseOrderService.getRecentPurchaseOrder();
        return res.status(200).json({ data: result });
    } catch (error) {
        console.error('[API] Error GET /api/purchase-orders/recent:', error);
        return res.status(500).json({ error: error.message });
    }
};

const createPurchaseOrderDetail = async (req, res) => {
    try {
        const { orden_compra_id, articulo_id, cantidad_solicitada, precio_unitario } = req.body;
        
        if (!orden_compra_id || !articulo_id || !cantidad_solicitada || !precio_unitario) {
            return res.status(400).json({ error: 'Faltan datos obligatorios para el detalle.' });
        }
        
        const result = await PurchaseOrderService.createPurchaseOrderDetail(orden_compra_id, articulo_id, cantidad_solicitada, precio_unitario);
        return res.status(201).json({ data: result });
    } catch (error) {
        console.error('[API] Error POST /api/purchase-orders/detail:', error);
        return res.status(500).json({ error: error.message });
    }
};

const getAllPurchaseOrders = async (req, res) => {
    try {
        const result = await PurchaseOrderService.getAllPurchaseOrders();
        return res.status(200).json({ data: result });
    } catch (error) {
        console.error('[API] Error GET /api/purchase-orders:', error);
        return res.status(500).json({ error: error.message });
    }
};

const receivePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { detalles } = req.body; // [{ id_detalle, cant_a_sumar }]
        
        if (!detalles || !Array.isArray(detalles)) {
            return res.status(400).json({ error: 'Formato de detalles inválido.' });
        }
        
        const result = await PurchaseOrderService.receivePurchaseOrder(id, detalles);
        return res.status(200).json({ data: result });
    } catch (error) {
        console.error(`[API] Error PUT /api/purchase-orders/${req.params.id}/receive:`, error);
        return res.status(500).json({ error: error.message });
    }
};

const cancelPurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await PurchaseOrderService.cancelPurchaseOrder(id);
        return res.status(200).json({ data: result });
    } catch (error) {
        console.error(`[API] Error PUT /api/purchase-orders/${req.params.id}/cancel:`, error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createPurchaseOrder,
    getRecentPurchaseOrder,
    createPurchaseOrderDetail,
    getAllPurchaseOrders,
    receivePurchaseOrder,
    cancelPurchaseOrder
};
