// =============================================================================
// comprobantesProveedorController.js — HU-23
// =============================================================================

const ComprobantesProveedorService = require('../services/comprobantesProveedorService');

// GET /api/comprobantes-proveedores
const listarComprobantes = async (req, res) => {
    try {
        const data = await ComprobantesProveedorService.listarComprobantes();
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/comprobantes-proveedores:', error);
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/comprobantes-proveedores/cxp-pendientes/:proveedorId
const listarCxpPendientesPorProveedor = async (req, res) => {
    try {
        const { proveedorId } = req.params;
        const data = await ComprobantesProveedorService.listarCxpPendientesPorProveedor(proveedorId);
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/comprobantes-proveedores/cxp-pendientes/:proveedorId:', error);
        return res.status(500).json({ error: error.message });
    }
};

// POST /api/comprobantes-proveedores
const registrarComprobante = async (req, res) => {
    try {
        const {
            proveedor_id,
            tipo_comprobante,
            numero_comprobante,
            monto_total,
            fecha_emision,
            fecha_vencimiento,
            id_cuenta_por_pagar,
            orden_compra_id,
            detalles,
        } = req.body;

        // Validaciones de campos obligatorios comunes
        if (!proveedor_id || !tipo_comprobante || !numero_comprobante || !monto_total || !fecha_emision) {
            return res.status(400).json({
                error: 'Faltan campos obligatorios: proveedor_id, tipo_comprobante, numero_comprobante, monto_total, fecha_emision.',
            });
        }
        //  2. NUEVO: Validar que vengan los detalles
        if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({ error: 'El comprobante debe tener al menos un artículo en el detalle.' });}

        const tiposValidos = [
    'Factura A', 
    'Factura B', 
    'Factura C', 
    'Nota de Crédito', 
    'Nota de Débito', 
    'Remito',
    'Factura' // Por si acaso quedó alguno viejo
];
        if (!tiposValidos.includes(tipo_comprobante)) {
            return res.status(400).json({ error: `tipo_comprobante inválido. Valores permitidos: ${tiposValidos.join(', ')}.` });
        }

        if (isNaN(Number(monto_total)) || Number(monto_total) <= 0) {
            return res.status(400).json({ error: 'El monto_total debe ser un número positivo.' });
        }

        const comprobante = await ComprobantesProveedorService.registrarComprobante({
            proveedor_id,
            tipo_comprobante,
            numero_comprobante: String(numero_comprobante).trim(),
            monto_total: Number(monto_total),
            fecha_emision,
            fecha_vencimiento: fecha_vencimiento || null,
            id_cuenta_por_pagar: id_cuenta_por_pagar || null,
            orden_compra_id: orden_compra_id || null,
            detalles,
        });

        return res.status(201).json({ data: comprobante });
    } catch (error) {
        console.error('[API] Error POST /api/comprobantes-proveedores:', error);

        if (error.message === 'COMPROBANTE_DUPLICADO') {
            return res.status(409).json({ error: 'COMPROBANTE_DUPLICADO' });
        }
        const status = error.status || 500;
        return res.status(status).json({ error: error.message });
    }
};

module.exports = {
    listarComprobantes,
    listarCxpPendientesPorProveedor,
    registrarComprobante,
};

