// =============================================================================
// comprobantesProveedorService.js — HU-23 (Registro de Comprobantes de Proveedores)
// =============================================================================
// Reglas de negocio implementadas:
//   1. Segregación de deuda: cada Factura / ND genera una CxP nueva e independiente.
//   2. NC: descuenta el saldo exactamente de la CxP indicada por `id_cuenta_por_pagar`.
//   3. Atomicidad: inserción del comprobante + operación sobre CxP con rollback manual.
//   4. Unicidad: bloquea la combinación proveedor_id + numero_comprobante (HTTP 409).
//   5. Fechas: fecha_vencimiento >= fecha_emision (las NC ignoran esta validación).
// =============================================================================

const { supabaseAdmin } = require('../config/supabase');

class ComprobantesProveedorService {

    // -----------------------------------------------------------------------
    // Listar comprobantes (con join a proveedores)
    // -----------------------------------------------------------------------
    static async listarComprobantes() {
        const { data, error } = await supabaseAdmin
            .from('comprobantes_proveedores')
            .select(`
                *,
                proveedores (id, razon_social)
            `)
            .order('fecha_emision', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    // -----------------------------------------------------------------------
    // Obtener facturas/ND pendientes de un proveedor (para el select de NC)
    // -----------------------------------------------------------------------
    static async listarCxpPendientesPorProveedor(proveedorId) {
        const { data, error } = await supabaseAdmin
            .from('cuentas_por_pagar')
            .select(`
                id,
                saldo_pendiente,
                fecha_vencimiento,
                comprobante_proveedor_id,
                comprobantes_proveedores (numero_comprobante, tipo_comprobante)
            `)
            .eq('proveedor_id', proveedorId)
            .in('estado', ['Pendiente', 'Mora'])
            .gt('saldo_pendiente', 0)
            .order('fecha_vencimiento', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    // -----------------------------------------------------------------------
    // Registrar comprobante (Factura, Nota de Crédito, Nota de Débito)
    // -----------------------------------------------------------------------
    static async registrarComprobante(payload) {
        const {
            proveedor_id,
            tipo_comprobante,
            numero_comprobante,
            monto_total,
            fecha_emision,
            fecha_vencimiento,     // null/undefined para Nota de Crédito
            id_cuenta_por_pagar,   // obligatorio para Nota de Crédito
            orden_compra_id,
            usuario_id,
            detalles,
        } = payload;

        const esNC = tipo_comprobante === 'Nota de Crédito';

        // ------------------------------------------------------------------
        // Validación de fechas (Regla 3): solo para Factura y ND
        // ------------------------------------------------------------------
        if (!esNC) {
            if (!fecha_vencimiento) {
                const err = new Error('La fecha de vencimiento es obligatoria para Facturas y Notas de Débito.');
                err.status = 400;
                throw err;
            }
            if (fecha_vencimiento < fecha_emision) {
                const err = new Error('La fecha de vencimiento no puede ser anterior a la fecha de emisión.');
                err.status = 400;
                throw err;
            }
        }

        // ------------------------------------------------------------------
        // Validación de unicidad: proveedor_id + tipo + numero_comprobante
        // ------------------------------------------------------------------
        const { data: existente, error: errDup } = await supabaseAdmin
            .from('comprobantes_proveedores')
            .select('id')
            .eq('proveedor_id', proveedor_id)
            .eq('tipo_comprobante', tipo_comprobante)
            .eq('numero_comprobante', numero_comprobante)
            .maybeSingle();

        if (errDup) throw new Error(errDup.message);
        if (existente) {
            const err = new Error('COMPROBANTE_DUPLICADO');
            err.status = 409;
            throw err;
        }

        // ------------------------------------------------------------------
        // Para NC: verificar que la CxP destino exista y tenga saldo suficiente
        // ------------------------------------------------------------------
        let cuentaDestino = null;
        if (esNC) {
            if (!id_cuenta_por_pagar) {
                const err = new Error('Debe indicar la Factura Pendiente a la que se aplicará la Nota de Crédito.');
                err.status = 400;
                throw err;
            }

            const { data: cxp, error: errCxp } = await supabaseAdmin
                .from('cuentas_por_pagar')
                .select('id, saldo_pendiente, proveedor_id')
                .eq('id', id_cuenta_por_pagar)
                .single();

            if (errCxp || !cxp) {
                const err = new Error('La Cuenta por Pagar indicada no existe.');
                err.status = 404;
                throw err;
            }
            if (String(cxp.proveedor_id) !== String(proveedor_id)) {
                const err = new Error('La Cuenta por Pagar no pertenece al proveedor seleccionado.');
                err.status = 400;
                throw err;
            }
            if (Number(monto_total) > Number(cxp.saldo_pendiente)) {
                const err = new Error('El monto de la Nota de Crédito supera el saldo pendiente de la Factura seleccionada.');
                err.status = 400;
                throw err;
            }
            cuentaDestino = cxp;
        }

        // ==================================================================
        // Paso 1 — insertar la cabecera del comprobante
        // (ya NO existe comprobantes_proveedores.id_cuenta_por_pagar: el vínculo
        //  vive solo en cuentas_por_pagar.comprobante_proveedor_id)
        // ==================================================================
        const { data: comprobante, error: errInsert } = await supabaseAdmin
            .from('comprobantes_proveedores')
            .insert({
                proveedor_id,
                tipo_comprobante,
                numero_comprobante,
                monto_total: Number(monto_total),
                fecha_emision,
                fecha_vencimiento: esNC ? null : fecha_vencimiento,
                orden_compra_id: orden_compra_id || null,
                usuario_id: usuario_id || null,
            })
            .select()
            .single();

        if (errInsert) throw new Error(errInsert.message);

        // Registro de lo que hay que deshacer si algo falla
        let cxpCreadaId = null;          // Factura / ND: CxP nueva
        let saldoOriginalNC = null;      // NC: saldo previo de la CxP afectada

        try {
            // --- Paso 2: Cuentas por Pagar ---
            if (esNC) {
                // La NC descuenta el saldo de la CxP elegida
                saldoOriginalNC = Number(cuentaDestino.saldo_pendiente);
                const nuevoSaldo = saldoOriginalNC - Number(monto_total);

                const { error: errUpd } = await supabaseAdmin
                    .from('cuentas_por_pagar')
                    .update({
                        saldo_pendiente: nuevoSaldo,
                        ...(nuevoSaldo === 0 ? { estado: 'Pagada' } : {}),
                    })
                    .eq('id', cuentaDestino.id);
                if (errUpd) throw new Error(errUpd.message);
            } else if (tipo_comprobante !== 'Remito') {
                // Factura / ND: deuda nueva e independiente.
                // (Un Remito no es un documento de deuda: no genera CxP.)
                const { data: cxp, error: errCxp } = await supabaseAdmin
                    .from('cuentas_por_pagar')
                    .insert({
                        proveedor_id,
                        orden_compra_id: orden_compra_id || null,
                        comprobante_proveedor_id: comprobante.id,
                        monto_total: Number(monto_total),
                        saldo_pendiente: Number(monto_total),
                        fecha_vencimiento,
                        estado: 'Pendiente',
                    })
                    .select('id')
                    .single();
                if (errCxp) throw new Error(errCxp.message);
                cxpCreadaId = cxp.id;
            }

            // --- Paso 3: detalle de artículos ---
            const detallesAInsertar = detalles.map((item) => {
                const cantidad = Number(item.cantidad);
                const precio = Number(item.precio_unitario);
                return {
                    comprobante_id: comprobante.id,
                    articulo_id: item.articulo_id,
                    cantidad,
                    precio_unitario: precio,
                    subtotal: item.subtotal || cantidad * precio,
                };
            });

            const { error: errDetalles } = await supabaseAdmin
                .from('comprobantes_proveedores_detalle')
                .insert(detallesAInsertar);
            if (errDetalles) throw new Error(errDetalles.message);

        } catch (errOperacion) {
            // ------------------------------------------------------------------
            // ROLLBACK MANUAL (orden inverso)
            // ------------------------------------------------------------------
            console.error('[HU-23] Rollback por falla:', errOperacion.message);

            if (cxpCreadaId) {
                await supabaseAdmin.from('cuentas_por_pagar').delete().eq('id', cxpCreadaId);
            }
            if (esNC && saldoOriginalNC !== null) {
                await supabaseAdmin
                    .from('cuentas_por_pagar')
                    .update({ saldo_pendiente: saldoOriginalNC, estado: 'Pendiente' })
                    .eq('id', cuentaDestino.id);
            }
            await supabaseAdmin.from('comprobantes_proveedores_detalle').delete().eq('comprobante_id', comprobante.id);
            await supabaseAdmin.from('comprobantes_proveedores').delete().eq('id', comprobante.id);

            throw new Error(`Error procesando la operación. El comprobante fue revertido. Detalle: ${errOperacion.message}`);
        }

        return comprobante;
    }
}

module.exports = ComprobantesProveedorService;