const { supabaseAdmin } = require('../config/supabase');

class QuoteService {
    static async crearCotizacion(payload) {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones')
            .insert([payload])
            .select()
            .single();

        if (error) {
            throw new Error(`Error en base de datos al crear cotización: ${error.message}`);
        }
        return data;
    }

    static async crearCotizacion_detalle(payload) {
        const { cotizacion_id, articulo_id, cantidad_solicitada } = payload;
        
        const { data, error } = await supabaseAdmin
            .from('cotizaciones_detalle')
            .insert([
                {
                    cotizacion_id,
                    articulo_id,
                    cantidad_solicitada
                }
            ])
            .select()
            .single();

        if (error) {
            throw new Error(`Error en base de datos al crear detalle de cotización: ${error.message}`);
        }
        return data;
    }

    static async crearCotizacion_proveedor(payload) {
        const { cotizacion_id, proveedor_id } = payload;
        
        const { data, error } = await supabaseAdmin
            .from('cotizaciones_proveedores')
            .insert([
                {
                    cotizacion_id,
                    proveedor_id
                }
            ])
            .select()
            .single();

        if (error) {
            throw new Error(`Error en base de datos al asociar proveedor a cotización: ${error.message}`);
        }
        return data;
    }
}

module.exports = QuoteService;
