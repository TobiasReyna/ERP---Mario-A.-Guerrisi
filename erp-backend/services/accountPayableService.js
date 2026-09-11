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
