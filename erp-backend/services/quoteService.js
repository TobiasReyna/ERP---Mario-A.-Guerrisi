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

    static async obtenerCotizaciones_recientes() {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones')
            .select('id, fecha_hora_registro')
            .order('fecha_hora_registro', { ascending: false });

        if (error) {
            throw new Error(`Error en base de datos al obtener cotizaciones: ${error.message}`);
        }
        return data;
    }
    static async obtenerCotizaciones_todas() {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones')
            .select('*')
            .order('fecha_hora_registro', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    static async obtenerCotizaciones_enviadas() {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones')
            .select('*')
            .eq('estado', 'Pendiente')
            .order('fecha_hora_registro', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    static async obtenerCotizaciones_aprobadas() {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones')
            .select('*')
            .eq('estado', 'Aprobada')
            .order('fecha_hora_registro', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    static async obtenerCotizaciones_canceladas() {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones')
            .select('*')
            .eq('estado', 'Cancelada')
            .order('fecha_hora_registro', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    static async obtenerCotizaciones_detalle(cotizacion_id) {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones_detalle')
            .select('*')
            .eq('cotizacion_id', cotizacion_id);
        if (error) throw new Error(error.message);
        return data;
    }

    static async obtenerCotizacion_proveedores(cotizacion_id) {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones_proveedores')
            .select('*')
            .eq('cotizacion_id', cotizacion_id);
        if (error) throw new Error(error.message);
        return data;
    }

    static async obtenerCotizaciones_proveedores_detalles(cotizacion_proveedor_id) {
        const { data, error } = await supabaseAdmin
            .from('cotizaciones_proveedores_detalle')
            .select('*')
            .eq('cotizacion_proveedor_id', cotizacion_proveedor_id);
        if (error) throw new Error(error.message);
        return data;
    }

    static async guardarPreciosProveedor(cotizacion_proveedor_id, precios) {
        // precios = [{ articulo_id, precio_unitario_ofertado }]
        const inserts = precios.map(p => ({
            cotizacion_proveedor_id,
            articulo_id: p.articulo_id,
            precio_unitario_ofertado: p.precio_unitario_ofertado
        }));
        
        const { data, error } = await supabaseAdmin
            .from('cotizaciones_proveedores_detalle')
            .insert(inserts)
            .select();
            
        if (error) throw new Error(error.message);
        
        // Al guardar precios, actualizamos el estado de la cabecera cotizaciones_proveedores
        await supabaseAdmin
            .from('cotizaciones_proveedores')
            .update({ estado_respuesta: 'Respondida' })
            .eq('id', cotizacion_proveedor_id);
            
        return data;
    }
}

module.exports = QuoteService;
