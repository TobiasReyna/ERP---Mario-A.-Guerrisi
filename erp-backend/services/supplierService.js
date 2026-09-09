const { supabaseAdmin } = require('../config/supabase');

class SupplierService {
    // 1. Método para la grilla y tarjetas KPI de la pantalla principal
    static async obtenerProveedoresFiltrados(filtros = {}) {
        const { search, estado, condicion_pago } = filtros;

        // A. Métricas para los 3 contadores superiores
        const { data: todos, error: errKpi } = await supabaseAdmin
            .from('proveedores')
            .select('id, estado');

        if (errKpi) throw new Error(`Error en base de datos: ${errKpi.message}`);

        const metricas = {
            total: todos ? todos.length : 0,
            activos: todos ? todos.filter((p) => p.estado === true).length : 0,
            dados_de_baja: todos ? todos.filter((p) => p.estado === false).length : 0,
        };

        // B. Consulta para la tabla con orden y filtros reactivos
        let query = supabaseAdmin
            .from('proveedores')
            .select('*')
            .order('razon_social', { ascending: true });

        // Filtro por Estado ('Activos', 'Dados de baja', 'Todos')
        if (estado && estado !== 'Todos') {
            const estadoBool = estado === 'Activos' || estado === true || estado === 'true';
            query = query.eq('estado', estadoBool);
        }

        // Filtro por Condición de Pago ('Contado', '30 días', etc.)
        if (condicion_pago && condicion_pago !== 'Todas') {
            query = query.eq('condicion_pago', condicion_pago);
        }

        // Buscador por razón social, CUIT, nombre de contacto o email
        if (search && search.trim() !== '') {
            const clean = search.trim();
            query = query.or(
                `razon_social.ilike.%${clean}%,cuit.ilike.%${clean}%,nombre_contacto.ilike.%${clean}%,email.ilike.%${clean}%`
            );
        }

        const { data: proveedores, error } = await query;
        if (error) throw new Error(`Error en base de datos: ${error.message}`);

        return {
            metricas,
            proveedores: proveedores || []
        };
    }

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
                    notas: notas || '',
                    estado: true
                }
            ])
            .select()
            .single();

        if (error) {
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
                notas: notas || '',
                fecha_hora_actualizacion: new Date().toISOString()
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
            .update({ 
                estado, 
                fecha_hora_actualizacion: new Date().toISOString() 
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Error en base de datos: ${error.message}`);
        return data;
    }

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