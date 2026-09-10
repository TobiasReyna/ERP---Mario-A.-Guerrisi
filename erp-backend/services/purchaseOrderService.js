const { supabaseAdmin } = require('../config/supabase');

class PurchaseOrderService {
    static async createPurchaseOrder(cotizacion_id, proveedor_id, usuario_id) {
        // 1. Update cotizacion state to 'Aprobada'
        await supabaseAdmin
            .from('cotizaciones')
            .update({ estado: 'Aprobada', fecha_hora_actualizacion: new Date().toISOString() })
            .eq('id', cotizacion_id);

        // 2. Insert into ordenes_compra
        const { data, error } = await supabaseAdmin
            .from('ordenes_compra')
            .insert({
                cotizacion_id,
                proveedor_id,
                usuario_id,
                estado: 'Pendiente'
            })
            .select();
        
        if (error) throw new Error(error.message);
        return data;
    }

    static async getRecentPurchaseOrder() {
        const { data, error } = await supabaseAdmin
            .from('ordenes_compra')
            .select('id, fecha_emision, numero_orden')
            .order('fecha_emision', { ascending: false })
            .limit(1);
            
        if (error) throw new Error(error.message);
        return data;
    }

    static async createPurchaseOrderDetail(orden_compra_id, articulo_id, cantidad_solicitada, precio_unitario) {
        const { data, error } = await supabaseAdmin
            .from('ordenes_compra_detalle')
            .insert({
                orden_compra_id,
                articulo_id,
                cantidad_solicitada,
                precio_unitario
            })
            .select();
            
        if (error) throw new Error(error.message);
        return data;
    }

    static async getAllPurchaseOrders() {
        const { data, error } = await supabaseAdmin
            .from('ordenes_compra')
            .select('*, ordenes_compra_detalle(*)')
            .order('fecha_emision', { ascending: false });
            
        if (error) throw new Error(error.message);
        return data;
    }

    static async receivePurchaseOrder(id, detalles) {
        // detalles es un array de { id_detalle, cant_a_sumar }
        // Necesitamos primero obtener el detalle actual o hacer el update directamente si supabase lo permite.
        // Pero lo más seguro es actualizar individualmente.
        for (const det of detalles) {
            if (det.cant_a_sumar > 0) {
                // Obtener el valor actual
                const { data: curr, error: errGet } = await supabaseAdmin
                    .from('ordenes_compra_detalle')
                    .select('cantidad_recibida')
                    .eq('id', det.id_detalle)
                    .single();
                if (errGet) throw new Error(errGet.message);
                
                const nuevaCant = curr.cantidad_recibida + det.cant_a_sumar;
                
                const { error: errUpd } = await supabaseAdmin
                    .from('ordenes_compra_detalle')
                    .update({ cantidad_recibida: nuevaCant })
                    .eq('id', det.id_detalle);
                if (errUpd) throw new Error(errUpd.message);
            }
        }
        
        // Si hay triggers, el estado se actualiza solo.
        // Sino, deberíamos evaluarlo. El usuario dijo: 
        // "la propia base de datos se encargará de actualizar el estado de la orden de compra principal."
        return { success: true };
    }

    static async cancelPurchaseOrder(id) {
        const { data, error } = await supabaseAdmin
            .from('ordenes_compra')
            .update({ estado: 'Cancelada' })
            .eq('id', id)
            .select();
            
        if (error) throw new Error(error.message);
        return data;
    }
}

module.exports = PurchaseOrderService;
