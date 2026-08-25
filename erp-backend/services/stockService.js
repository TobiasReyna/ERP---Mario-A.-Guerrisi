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

    static async obtenerHistorial(articulo_id) {
        // 1. Obtener diccionarios auxiliares para mapear IDs a nombres rápidamente (sin joins complejos)
        const [{ data: depositos }, { data: motivos }] = await Promise.all([
            supabaseAdmin.from('depositos').select('id, nombre'),
            supabaseAdmin.from('motivos_ajustes').select('id, nombre')
        ]);
        
        const depDict = depositos ? depositos.reduce((acc, d) => ({ ...acc, [d.id]: d.nombre }), {}) : {};
        const motDict = motivos ? motivos.reduce((acc, m) => ({ ...acc, [m.id]: m.nombre }), {}) : {};

        // 2. Obtener ajustes y transferencias del artículo de forma paralela
        const [{ data: ajustes }, { data: transferencias }] = await Promise.all([
            supabaseAdmin.from('ajustes_stock').select('*').eq('articulo_id', articulo_id),
            supabaseAdmin.from('transferencias_stock').select('*').eq('articulo_id', articulo_id)
        ]);

        let historial = [];

        // 3. Mapear Ajustes
        if (ajustes) {
            historial = historial.concat(ajustes.map(a => {
                const nombreMotivo = motDict[a.motivo_id] || 'Desconocido';
                const deposito = depDict[a.deposito_id] || 'Depósito Desconocido';
                return {
                    fecha: a.fecha_hora_registro,
                    tipo_movimiento: 'AJUSTE',
                    cantidad_afectada: a.cantidad_nueva - a.cantidad_anterior,
                    detalle: `Motivo: ${nombreMotivo} en ${deposito}. Stock anterior: ${a.cantidad_anterior} -> Nuevo: ${a.cantidad_nueva}`,
                    usuario_id: a.usuario_id
                };
            }));
        }

        // 4. Mapear Transferencias
        if (transferencias) {
            historial = historial.concat(transferencias.map(t => {
                const origen = depDict[t.deposito_origen_id] || 'Desconocido';
                const destino = depDict[t.deposito_destino_id] || 'Desconocido';
                return {
                    fecha: t.fecha_hora_registro,
                    tipo_movimiento: 'TRANSFERENCIA',
                    cantidad_afectada: t.cantidad,
                    detalle: `De: ${origen} Hacia: ${destino}`,
                    usuario_id: t.usuario_id
                };
            }));
        }

        // 5. Ordenar por fecha descendente (más recientes primero)
        historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        return historial;
    }
}
module.exports = StockService;