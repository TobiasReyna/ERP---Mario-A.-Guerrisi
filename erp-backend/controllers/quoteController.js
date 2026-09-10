const QuoteService = require('../services/quoteService');

// Inyectando usuario según requerimiento
const TEST_USER_ID = "7ab3d65c-eecc-4f0b-98a1-2c53efce620e";

const crearCotizacion = async (req, res) => {
    try {
        const payload = req.body || {};
        
        const nuevaCotizacion = await QuoteService.crearCotizacion({
            ...payload,
            usuario_id: TEST_USER_ID
        });

        return res.status(201).json({
            message: 'Cotización creada con éxito.',
            data: nuevaCotizacion
        });
    } catch (error) {
        console.error('[API] Error POST /api/quotes:', error);
        return res.status(500).json({ error: error.message || 'Error interno creando la cotización.' });
    }
};

const crearCotizacion_detalle = async (req, res) => {
    try {
        const { cotizacion_id, articulo_id, cantidad_solicitada } = req.body;
        
        if (!cotizacion_id || !articulo_id || cantidad_solicitada === undefined) {
            return res.status(400).json({ error: 'Faltan campos obligatorios en el request.' });
        }

        const nuevoDetalle = await QuoteService.crearCotizacion_detalle({
            cotizacion_id,
            articulo_id,
            cantidad_solicitada
        });

        return res.status(201).json({
            message: 'Detalle de cotización creado con éxito.',
            data: nuevoDetalle
        });
    } catch (error) {
        console.error('[API] Error POST /api/quotes/detalle:', error);
        return res.status(500).json({ error: error.message || 'Error interno creando el detalle de cotización.' });
    }
};

const crearCotizacion_proveedor = async (req, res) => {
    try {
        const { cotizacion_id, proveedor_id } = req.body;
        
        if (!cotizacion_id || !proveedor_id) {
            return res.status(400).json({ error: 'Faltan campos obligatorios en el request.' });
        }

        const nuevoProveedor = await QuoteService.crearCotizacion_proveedor({
            cotizacion_id,
            proveedor_id
        });

        return res.status(201).json({
            message: 'Proveedor de cotización asociado con éxito.',
            data: nuevoProveedor
        });
    } catch (error) {
        console.error('[API] Error POST /api/quotes/proveedor:', error);
        return res.status(500).json({ error: error.message || 'Error interno creando el proveedor de cotización.' });
    }
};

const obtenerCotizaciones_recientes = async (req, res) => {
    try {
        const recientes = await QuoteService.obtenerCotizaciones_recientes();
        return res.status(200).json({ data: recientes });
    } catch (error) {
        console.error('[API] Error GET /api/quotes/recientes:', error);
        return res.status(500).json({ error: error.message || 'Error interno obteniendo cotizaciones recientes.' });
    }
};

const obtenerCotizaciones_todas = async (req, res) => {
    try {
        const result = await QuoteService.obtenerCotizaciones_todas();
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const obtenerCotizaciones_enviadas = async (req, res) => {
    try {
        const result = await QuoteService.obtenerCotizaciones_enviadas();
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const obtenerCotizaciones_aprobadas = async (req, res) => {
    try {
        const result = await QuoteService.obtenerCotizaciones_aprobadas();
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const obtenerCotizaciones_canceladas = async (req, res) => {
    try {
        const result = await QuoteService.obtenerCotizaciones_canceladas();
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const obtenerCotizaciones_detalle = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await QuoteService.obtenerCotizaciones_detalle(id);
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const obtenerCotizacion_proveedores = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await QuoteService.obtenerCotizacion_proveedores(id);
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const obtenerCotizaciones_proveedores_detalles = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await QuoteService.obtenerCotizaciones_proveedores_detalles(id);
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const guardarPreciosProveedor = async (req, res) => {
    try {
        const { cotizacion_proveedor_id, precios } = req.body;
        if (!cotizacion_proveedor_id || !precios || !precios.length) {
            return res.status(400).json({ error: 'Faltan datos obligatorios.' });
        }
        
        const result = await QuoteService.guardarPreciosProveedor(cotizacion_proveedor_id, precios);
        return res.status(201).json({ message: 'Precios guardados con éxito', data: result });
    } catch (error) {
        console.error('[API] Error POST /api/quotes/precios:', error);
        return res.status(500).json({ error: error.message || 'Error guardando los precios.' });
    }
};

const cancelarCotizacion = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await QuoteService.cancelarCotizacion(id);
        return res.status(200).json({ message: 'Cotización cancelada', data: result });
    } catch (error) {
        console.error('[API] Error PUT /api/quotes/:id/cancelar:', error);
        return res.status(500).json({ error: error.message || 'Error al cancelar la cotización.' });
    }
};

const restaurarCotizacionAPendiente = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await QuoteService.restaurarCotizacionAPendiente(id);
        return res.status(200).json({ message: 'Cotización restaurada a pendiente', data: result });
    } catch (error) {
        console.error('[API] Error PUT /api/quotes/:id/pendiente:', error);
        return res.status(500).json({ error: error.message || 'Error al restaurar la cotización.' });
    }
};

module.exports = {
    crearCotizacion,
    crearCotizacion_detalle,
    crearCotizacion_proveedor,
    obtenerCotizaciones_recientes,
    obtenerCotizaciones_todas,
    obtenerCotizaciones_enviadas,
    obtenerCotizaciones_aprobadas,
    obtenerCotizaciones_canceladas,
    obtenerCotizaciones_detalle,
    obtenerCotizacion_proveedores,
    obtenerCotizaciones_proveedores_detalles,
    guardarPreciosProveedor,
    cancelarCotizacion,
    restaurarCotizacionAPendiente
};
