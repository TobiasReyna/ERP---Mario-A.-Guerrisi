const ArticleService = require('../services/articleService');

// Inyectando usuario para Sprint 1
const TEST_USER_ID = "TU_USER_ID";

const crearArticulo = async (req, res) => {
    try {
        const { 
            codigo_interno, 
            descripcion, 
            codigo_ean13, 
            categoria_id, 
            marca_id, 
            pais_origen, 
            precio_actual, 
            modelo 
        } = req.body;

        // 1. Validaciones básicas del payload frontend
        if (!codigo_interno || !descripcion || !codigo_ean13 || !categoria_id || !marca_id || !pais_origen || precio_actual === undefined) {
            return res.status(400).json({ error: 'Faltan campos obligatorios en el request.' });
        }

        if (precio_actual < 0) {
            return res.status(400).json({ error: 'El precio no puede ser negativo.' });
        }

        // 2. Delegar al servicio
        const nuevoArticulo = await ArticleService.crearArticulo({
            codigo_interno,
            descripcion,
            codigo_ean13,
            categoria_id,
            marca_id,
            pais_origen,
            precio_actual,
            modelo,
            usuario_id: TEST_USER_ID
        });

        return res.status(201).json({
            message: 'Artículo creado con éxito.',
            data: nuevoArticulo
        });

    } catch (error) {
        console.error('[API] Error POST /api/articles:', error);
        
        // Manejar errores de unique constraint de Supabase (ej. EAN o Código repetido)
        if (error.message.includes('unique constraint') || error.message.includes('duplicate key value')) {
            return res.status(409).json({ error: 'El código interno o EAN-13 ya existe en el sistema.' });
        }
        
        return res.status(500).json({ 
            error: error.message || 'Error interno creando el artículo.' 
        });
    }
};

const obtenerArticulosActivos = async (req, res) => {
    try {
        const articulos = await ArticleService.obtenerArticulosActivos();
        return res.status(200).json({ data: articulos });
    } catch (error) {
        console.error('[API] Error GET /api/articles:', error);
        return res.status(500).json({ error: error.message || 'Error interno al obtener artículos.' });
    }
};

const obtenerArticuloPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const articulo = await ArticleService.obtenerArticuloPorId(id);
        
        return res.status(200).json({ data: articulo });
    } catch (error) {
        console.error('[API] Error GET /api/articles/:id:', error);
        // Supabase .single() lanza error si no encuentra filas (PGRST116)
        if (error.message.includes('JSON object requested, multiple (or no) rows returned')) {
            return res.status(404).json({ error: 'Artículo no encontrado.' });
        }
        return res.status(500).json({ error: error.message || 'Error interno al obtener el artículo.' });
    }
};

const modificarArticulo = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            codigo_interno, 
            descripcion, 
            codigo_ean13, 
            categoria_id, 
            marca_id, 
            pais_origen, 
            precio_actual, 
            modelo 
        } = req.body;

        if (!codigo_interno || !descripcion || !codigo_ean13 || !categoria_id || !marca_id || !pais_origen || precio_actual === undefined) {
            return res.status(400).json({ error: 'Faltan campos obligatorios en el request.' });
        }

        if (precio_actual < 0) {
            return res.status(400).json({ error: 'El precio no puede ser negativo.' });
        }

        const articuloActualizado = await ArticleService.modificarArticulo(id, {
            codigo_interno,
            descripcion,
            codigo_ean13,
            categoria_id,
            marca_id,
            pais_origen,
            precio_actual,
            modelo
        });

        return res.status(200).json({
            message: 'Artículo actualizado con éxito.',
            data: articuloActualizado
        });

    } catch (error) {
        console.error('[API] Error PUT /api/articles/:id:', error);
        if (error.message.includes('unique constraint') || error.message.includes('duplicate key value')) {
            return res.status(409).json({ error: 'El código interno o EAN-13 ya existe en otro artículo.' });
        }
        return res.status(500).json({ error: error.message || 'Error interno al actualizar el artículo.' });
    }
};

const darBajaLogica = async (req, res) => {
    try {
        const { id } = req.params;
        const articuloBaja = await ArticleService.darBajaLogica(id);
        
        return res.status(200).json({
            message: 'Artículo dado de baja con éxito.',
            data: articuloBaja
        });
    } catch (error) {
        if (error.message.includes('Cannot coerce the result to a single JSON object') || error.message.includes('JSON object requested')) {
            return res.status(404).json({ error: 'El artículo que intenta dar de baja no existe.' });
            }
        console.error('[API] Error PATCH /api/articles/:id/status:', error);
        return res.status(500).json({ error: error.message || 'Error interno al dar de baja el artículo.' });
    }
};

module.exports = {
    crearArticulo,
    obtenerArticulosActivos,
    obtenerArticuloPorId,
    modificarArticulo,
    darBajaLogica
};
