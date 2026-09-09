const SupplierService = require('../services/supplierService');

// Algoritmo de validación de CUIT (Módulo 11) para blindar la API
const PREFIJOS_VALIDOS = ['20', '23', '24', '27', '30', '33', '34'];
const MULTIPLICADORES = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function limpiarCuit(valor) {
    return String(valor || '').replace(/\D/g, '');
}

function esCuitValido(cuitCrudo) {
    const digits = limpiarCuit(cuitCrudo);
    if (digits.length !== 11) return false;
    if (!PREFIJOS_VALIDOS.includes(digits.slice(0, 2))) return false;

    const nums = digits.split('').map(Number);
    const suma = MULTIPLICADORES.reduce((acc, m, i) => acc + m * nums[i], 0);
    let dv = 11 - (suma % 11);
    if (dv === 11) dv = 0;

    return dv !== 10 && dv === nums[10];
}

const camposObligatorios = ['razon_social', 'cuit', 'telefono', 'email', 'condicion_pago'];

function validarPayload(body) {
    const faltantes = camposObligatorios.filter((campo) => !body[campo] || !String(body[campo]).trim());
    if (faltantes.length > 0) {
        return `Faltan campos obligatorios: ${faltantes.join(', ')}.`;
    }
    if (!esCuitValido(body.cuit)) {
        return 'El CUIT ingresado no es válido (formato o dígito verificador incorrecto).';
    }
    return null;
}

// POST /api/suppliers — Alta de nuevo proveedor
const crearProveedor = async (req, res) => {
    try {
        const errorValidacion = validarPayload(req.body);
        if (errorValidacion) {
            return res.status(400).json({ error: errorValidacion });
        }

        const nuevoProveedor = await SupplierService.crearProveedor({
            ...req.body,
            cuit: limpiarCuit(req.body.cuit)
        });

        return res.status(201).json({
            message: 'Proveedor dado de alta con éxito.',
            data: nuevoProveedor
        });
    } catch (error) {
        console.error('[API] Error POST /api/suppliers:', error);
        if (error.code === 'CUIT_DUPLICADO') {
            return res.status(409).json({
                error: error.message,
                proveedorExistente: error.proveedorExistente
            });
        }
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/suppliers/check-cuit?cuit=...&excludeId=... — Verificación en vivo
const buscarPorCuit = async (req, res) => {
    try {
        const { cuit, excludeId } = req.query;
        if (!cuit || !String(cuit).trim()) {
            return res.status(400).json({ error: 'Falta el parámetro cuit.' });
        }
        const data = await SupplierService.buscarPorCuit(limpiarCuit(cuit), excludeId || null);
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/suppliers/check-cuit:', error);
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/suppliers — Solo proveedores activos (ideal para selects/combos en OC)
const obtenerProveedoresActivos = async (req, res) => {
    try {
        const data = await SupplierService.obtenerProveedoresActivos();
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/suppliers:', error);
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/suppliers/todos — Grilla principal con filtros y cálculo de métricas para los 3 cards
const obtenerTodosProveedores = async (req, res) => {
    try {
        const listaCompleta = await SupplierService.obtenerTodosProveedores();

        // 1. Métricas para las tarjetas KPI superiores
        const metrics = {
            total: listaCompleta.length,
            activos: listaCompleta.filter((p) => p.estado === true).length,
            dados_de_baja: listaCompleta.filter((p) => p.estado === false).length
        };

        // 2. Filtros dinámicos recibidos por query params
        let data = [...listaCompleta];
        const { search, estado, condicion_pago } = req.query;

        // Filtro de Estado: 'Activos', 'Dados de baja', 'Todos'
        if (estado && estado !== 'Todos') {
            const estadoBool = estado === 'Activos' || estado === 'true' || estado === true;
            data = data.filter((p) => p.estado === estadoBool);
        }

        // Filtro por Condición de Pago
        if (condicion_pago && condicion_pago !== 'Todas') {
            data = data.filter((p) => p.condicion_pago === condicion_pago);
        }

        // Buscador por texto en razón social, CUIT, contacto o email
        if (search && search.trim() !== '') {
            const term = search.trim().toLowerCase();
            data = data.filter((p) =>
                (p.razon_social && p.razon_social.toLowerCase().includes(term)) ||
                (p.cuit && p.cuit.toLowerCase().includes(term)) ||
                (p.nombre_contacto && p.nombre_contacto.toLowerCase().includes(term)) ||
                (p.email && p.email.toLowerCase().includes(term))
            );
        }

        return res.status(200).json({
            data,
            metrics
        });
    } catch (error) {
        console.error('[API] Error GET /api/suppliers/todos:', error);
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/suppliers/:id — Detalle individual de proveedor
const obtenerProveedorPorId = async (req, res) => {
    try {
        const data = await SupplierService.obtenerProveedorPorId(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Proveedor no encontrado.' });
        }
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/suppliers/:id:', error);
        return res.status(500).json({ error: error.message });
    }
};

// PUT /api/suppliers/:id — Actualización de datos
const modificarProveedor = async (req, res) => {
    try {
        const errorValidacion = validarPayload(req.body);
        if (errorValidacion) {
            return res.status(400).json({ error: errorValidacion });
        }

        const actualizado = await SupplierService.modificarProveedor(req.params.id, {
            ...req.body,
            cuit: limpiarCuit(req.body.cuit)
        });

        return res.status(200).json({
            message: 'Proveedor actualizado con éxito.',
            data: actualizado
        });
    } catch (error) {
        console.error('[API] Error PUT /api/suppliers/:id:', error);
        if (error.code === 'CUIT_DUPLICADO') {
            return res.status(409).json({
                error: error.message,
                proveedorExistente: error.proveedorExistente
            });
        }
        return res.status(500).json({ error: error.message });
    }
};

// PATCH /api/suppliers/:id/status — Baja lógica (desactivar)
const darBajaLogica = async (req, res) => {
    try {
        const data = await SupplierService.cambiarEstado(req.params.id, false);
        return res.status(200).json({ message: 'Proveedor dado de baja.', data });
    } catch (error) {
        console.error('[API] Error PATCH /api/suppliers/:id/status:', error);
        return res.status(500).json({ error: error.message });
    }
};

// PATCH /api/suppliers/:id/reactivate — Alta lógica (reactivar)
const darAltaLogica = async (req, res) => {
    try {
        const data = await SupplierService.cambiarEstado(req.params.id, true);
        return res.status(200).json({ message: 'Proveedor reactivado.', data });
    } catch (error) {
        console.error('[API] Error PATCH /api/suppliers/:id/reactivate:', error);
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/suppliers/:id/orders — Historial de compras con total calculado
const obtenerHistorialCompras = async (req, res) => {
    try {
        const data = await SupplierService.obtenerHistorialCompras(req.params.id);
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/suppliers/:id/orders:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    crearProveedor,
    buscarPorCuit,
    obtenerProveedoresActivos,
    obtenerTodosProveedores,
    obtenerProveedorPorId,
    modificarProveedor,
    darBajaLogica,
    darAltaLogica,
    obtenerHistorialCompras
};