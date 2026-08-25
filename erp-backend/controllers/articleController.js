const ArticleService = require('../services/articleService');

// Inyectando usuario para Sprint 1
const TEST_USER_ID = "TU_UUID_REAL_AQUI";

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

module.exports = {
    crearArticulo
};
