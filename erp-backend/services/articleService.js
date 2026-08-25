const { supabaseAdmin } = require('../config/supabase');

class ArticleService {
    static async crearArticulo(payload) {
        const {
            codigo_interno,
            descripcion,
            codigo_ean13,
            categoria_id,
            marca_id,
            pais_origen,
            precio_actual,
            modelo,
            usuario_id // Inyectado desde el controlador
        } = payload;

        // El backend solo hace la inserción limpia en articulos.
        // Si hay triggers (como el historial de precios), actuarán solos en PostgreSQL.
        const { data, error } = await supabaseAdmin
            .from('articulos')
            .insert([
                {
                    codigo_interno,
                    descripcion,
                    codigo_ean13,
                    categoria_id,
                    marca_id,
                    pais_origen,
                    precio_actual,
                    modelo: modelo || 'Sin especificar'
                }
            ])
            .select()
            .single();

        if (error) {
            throw new Error(`Error en base de datos: ${error.message}`);
        }

        return data;
    }
}

module.exports = ArticleService;
