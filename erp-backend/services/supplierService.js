const { supabaseAdmin } = require('../config/supabase');

// public.proveedores ya existe en Supabase. La tabla real, tal como la creó
// el equipo de base de datos, solo traía razon_social, cuit, email, telefono,
// condicion_pago y estado; nombre_contacto, direccion, notas,
// fecha_hora_registro y fecha_hora_actualizacion se agregaron con
// docs/sprint2/migracion_proveedores_campos_adicionales.sql (ejecutar esa
// migración antes de usar este service).
// ordenes_compra y ordenes_compra_detalle (HU-12/HU-13) también ya existen,
// así que obtenerHistorialCompras consulta datos reales.

class SupplierService {
    static async crearProveedor(payload) {
        const {
            razon_social,
            cuit,
            nombre_contacto,
            telefono,
            email,
            direccion,
            condicion_pago,
            notas
        } = payload;

        const { data, error } = await supabaseAdmin
            .from('proveedores')
            .insert([
                {
                    razon_social,
                    cuit,
                    nombre_contacto: nombre_contacto || '',
                    telefono,
                    email,
                    direccion: direccion || '',
                    condicion_pago,
                    notas: notas || ''
                }
            ])
            .select()
            .single();

        if (error) {
            // 23505 = unique_violation (Postgres) -> CUIT duplicado
            if (error.code === '23505') {
                const proveedorExistente = await SupplierService.buscarPorCuit(cuit);
                const duplicadoError = new Error('Ya existe un proveedor registrado con ese CUIT.');
                duplicadoError.code = 'CUIT_DUPLICADO';
                duplicadoError.proveedorExistente = proveedorExistente;
                throw duplicadoError;
            }
            throw new Error(`Error en base de datos: ${error.message}`);
        }

        return data;
    }

    static async obtenerProveedoresActivos() {
        const { data, error } = await supabaseAdmin
            .from('proveedores')
            .select('*')
            .eq('estado', true)
            .order('razon_social', { ascending: true });

        if (error) throw new Error(`Error en base de datos: ${error.message}`);
        return data;
    }

    static async obtenerTodosProveedores() {
        const { data, error } = await supabaseAdmin
            .from('proveedores')
            .select('*')
            .order('razon_social', { ascending: true });

        if (error) throw new Error(`Error en base de datos: ${error.message}`);
        return data;
    }

    static async obtenerProveedorPorId(id) {
        const { data, error } = await supabaseAdmin
            .from('proveedores')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error(`Error en base de datos: ${error.message}`);
        return data;
    }

    static async buscarPorCuit(cuit, idAExcluir = null) {
        let query = supabaseAdmin.from('proveedores').select('*').eq('cuit', cuit);
        if (idAExcluir) query = query.neq('id', idAExcluir);

        const { data, error } = await query.maybeSingle();
        if (error) throw new Error(`Error en base de datos: ${error.message}`);
        return data;
    }

    static async modificarProveedor(id, payload) {
        const {
            razon_social,
            cuit,
            nombre_contacto,
            telefono,
            email,
            direccion,
            condicion_pago,
            notas
        } = payload;

        const { data, error } = await supabaseAdmin
            .from('proveedores')
            .update({
                razon_social,
                cuit,
                nombre_contacto: nombre_contacto || '',
                telefono,
                email,
                direccion: direccion || '',
                condicion_pago,
                notas: notas || ''
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                const proveedorExistente = await SupplierService.buscarPorCuit(cuit, id);
                const duplicadoError = new Error('Ya existe otro proveedor registrado con ese CUIT.');
                duplicadoError.code = 'CUIT_DUPLICADO';
                duplicadoError.proveedorExistente = proveedorExistente;
                throw duplicadoError;
            }
            throw new Error(`Error en base de datos: ${error.message}`);
        }

        return data;
    }

    static async cambiarEstado(id, estado) {
        const { data, error } = await supabaseAdmin
            .from('proveedores')
            .update({ estado })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Error en base de datos: ${error.message}`);
        return data;
    }

    // Criterio de aceptación 3: historial de OC y montos operados.
    // Las tablas ordenes_compra / ordenes_compra_detalle ya existen en Supabase
    // (HU-12/HU-13). ordenes_compra no guarda un monto propio: se calcula sumando
    // cantidad_solicitada * precio_unitario de cada línea de ordenes_compra_detalle.
    static async obtenerHistorialCompras(proveedorId) {
        const { data, error } = await supabaseAdmin
            .from('ordenes_compra')
            .select('numero_orden, fecha_emision, estado, ordenes_compra_detalle(cantidad_solicitada, precio_unitario)')
            .eq('proveedor_id', proveedorId)
            .order('fecha_emision', { ascending: false });

        if (error) throw new Error(`Error en base de datos: ${error.message}`);

        return (data || []).map((oc) => ({
            numero: oc.numero_orden,
            fecha: oc.fecha_emision,
            estado: oc.estado,
            monto: (oc.ordenes_compra_detalle || []).reduce(
                (acc, item) => acc + Number(item.cantidad_solicitada) * Number(item.precio_unitario),
                0
            ),
        }));
    }
}

module.exports = SupplierService;
