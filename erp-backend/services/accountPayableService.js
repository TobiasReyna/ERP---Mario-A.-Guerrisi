const { supabaseAdmin } = require('../config/supabase');

class AccountPayableService {
    static async getAllAccountsPayable() {
        const { data, error } = await supabaseAdmin
            .from('cuentas_por_pagar')
            .select(`
                *,
                pagos_cxp (*),
                proveedores (razon_social),
                ordenes_compra (numero_orden)
            `);
            
        if (error) throw new Error(error.message);
        return data;
    }

    static async syncAccountsPayable() {
        // 1. Obtener ordenes de compra con estado Parcial o Recibida
        const { data: ordenes, error: errOC } = await supabaseAdmin
            .from('ordenes_compra')
            .select('*, ordenes_compra_detalle(*)')
            .in('estado', ['Parcial', 'Recibida']);
        if (errOC) throw new Error(errOC.message);

        // 2. Obtener cuentas por pagar existentes
        const { data: cuentas, error: errCXP } = await supabaseAdmin
            .from('cuentas_por_pagar')
            .select('*');
        if (errCXP) throw new Error(errCXP.message);

        const cuentasMap = new Map();
        const duplicatesToDelete = [];

        for (const cxp of cuentas) {
            if (cuentasMap.has(cxp.orden_compra_id)) {
                duplicatesToDelete.push(cxp.id);
            } else {
                cuentasMap.set(cxp.orden_compra_id, cxp);
            }
        }

        // Delete duplicates to maintain 1-to-1 relationship
        if (duplicatesToDelete.length > 0) {
            await supabaseAdmin.from('cuentas_por_pagar').delete().in('id', duplicatesToDelete);
        }

        // 3. Comparar y sincronizar
        for (const oc of ordenes) {
            let monto_total = 0;
            if (oc.ordenes_compra_detalle) {
                monto_total = oc.ordenes_compra_detalle.reduce((acc, det) => acc + (Number(det.cantidad_recibida) * Number(det.precio_unitario)), 0);
            }

            if (!cuentasMap.has(oc.id)) {
                // No existe, crear
                const fechaEmision = new Date(oc.fecha_emision);
                fechaEmision.setMonth(fechaEmision.getMonth() + 1);
                const fecha_vencimiento = fechaEmision.toISOString().split('T')[0];

                const { error: errInsert } = await supabaseAdmin
                    .from('cuentas_por_pagar')
                    .insert({
                        proveedor_id: oc.proveedor_id,
                        orden_compra_id: oc.id,
                        monto_total: monto_total,
                        saldo_pendiente: monto_total,
                        fecha_vencimiento: fecha_vencimiento,
                        estado: 'Pendiente'
                    });
                if (errInsert) throw new Error(errInsert.message);
            } else {
                // Existe, comprobar monto_total
                const cxp = cuentasMap.get(oc.id);
                if (Number(cxp.monto_total) !== monto_total) {
                    const { error: errUpdate } = await supabaseAdmin
                        .from('cuentas_por_pagar')
                        .update({ monto_total: monto_total })
                        .eq('id', cxp.id);
                    if (errUpdate) throw new Error(errUpdate.message);
                }
            }
        }
        return { success: true };
    }

    static async registerPayment(cuenta_por_pagar_id, monto_pagado, usuario_id) {
        // Obtenemos el saldo actual de la cuenta
        const { data: cuenta, error: errGet } = await supabaseAdmin
            .from('cuentas_por_pagar')
            .select('saldo_pendiente')
            .eq('id', cuenta_por_pagar_id)
            .single();

        if (errGet) throw new Error(errGet.message);
        if (!cuenta) throw new Error('Cuenta por pagar no encontrada');

        const nuevo_saldo = Number(cuenta.saldo_pendiente) - Number(monto_pagado);
        if (nuevo_saldo < 0) {
            throw new Error('El monto a pagar excede el saldo pendiente.');
        }

        // Insertar el pago
        const { error: errInsert } = await supabaseAdmin
            .from('pagos_cxp')
            .insert({
                cuenta_por_pagar_id,
                monto_pagado,
                usuario_id
            });

        if (errInsert) throw new Error(errInsert.message);

        // Actualizar el saldo pendiente en cuentas_por_pagar
        const { data: updatedCuenta, error: errUpdate } = await supabaseAdmin
            .from('cuentas_por_pagar')
            .update({ saldo_pendiente: nuevo_saldo })
            .eq('id', cuenta_por_pagar_id)
            .select()
            .single();

        if (errUpdate) throw new Error(errUpdate.message);

        return updatedCuenta;
    }
}

module.exports = AccountPayableService;
