const { supabaseAdmin } = require('../config/supabase');

class StockService {
    static async transferirStock(payload) {
        const { articulo_id, deposito_origen_id, deposito_destino_id, cantidad, usuario_id, ip_origen } = payload;

    const { data, error } = await supabaseAdmin
        .from('transferencias_stock')
        .insert([
        {
            articulo_id,
            deposito_origen_id,
            deposito_destino_id,
            cantidad,
            usuario_id,
            ip_origen: ip_origen || '127.0.0.1'
        }
    ])
        .select()
        .single();

        if (error) {
            throw new Error(`Error en base de datos: ${error.message}`);
        }

        return data;
    }

    static async ajustarStock(payload) {
        const { articulo_id, deposito_id, cantidad_anterior, cantidad_nueva, motivo_id, usuario_id, ip_origen } = payload;

        const { data, error } = await supabaseAdmin
            .from('ajustes_stock')
            .insert([
                {
                    articulo_id,
                    deposito_id,
                    cantidad_anterior,
                    cantidad_nueva,
                    motivo_id,
                    usuario_id,
                    ip_origen: ip_origen || '127.0.0.1'
                }
            ])
            .select()
            .single();

        if (error) {
            throw new Error(`Error en base de datos: ${error.message}`);
        }

        return data;
    }

    static async obtenerDisponibilidad(articulo_id) {
        // Consultar la tabla existencias haciendo join con depositos
        const { data, error } = await supabaseAdmin
            .from('existencias')
            .select(`
                cantidad,
                depositos (
                    id,
                    nombre
                )
            `)
            .eq('articulo_id', articulo_id);

        if (error) {
            throw new Error(`Error consultando disponibilidad: ${error.message}`);
        }

        // Calcular stock consolidado
        let stock_consolidado = 0;
        const desglose = data.map(item => {
            stock_consolidado += item.cantidad;
            return {
                deposito_id: item.depositos?.id,
                deposito_nombre: item.depositos?.nombre || 'Depósito Desconocido',
                cantidad: item.cantidad
            };
        });

        return {
            articulo_id,
            stock_consolidado,
            desglose
        };
    }
}
module.exports = StockService;