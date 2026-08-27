const { supabaseAdmin } = require('../config/supabase');

class MasterService {
    static async getCategorias() {
        const { data, error } = await supabaseAdmin.from('categorias').select('*');
        if (error) throw new Error(`Error consultando categorias: ${error.message}`);
        return data;
    }

    static async getMarcas() {
        // Traemos solo las marcas activas
        const { data, error } = await supabaseAdmin.from('marcas').select('*').eq('estado', true);
        if (error) throw new Error(`Error consultando marcas: ${error.message}`);
        return data;
    }

    static async getPaises() {
        const { data, error } = await supabaseAdmin.from('paises_origen').select('*');
        if (error) throw new Error(`Error consultando paises_origen: ${error.message}`);
        return data;
    }

    static async getDepositosActivos() {
        // Traemos solo los depósitos activos
        const { data, error } = await supabaseAdmin.from('depositos').select('*').eq('estado', true);
        if (error) throw new Error(`Error consultando depositos: ${error.message}`);
        return data;
    }

    static async getMotivosAjuste() {
        // Traemos solo los motivos de ajuste activos
        const { data, error } = await supabaseAdmin.from('motivos_ajustes').select('*').eq('estado', true);
        if (error) throw new Error(`Error consultando motivos_ajustes: ${error.message}`);
        return data;
    }

    static async getActividadSistema() {
        // 1. Obtener diccionarios para nombres
        const [{ data: depositos }, { data: motivos }, { data: arts }] = await Promise.all([
            supabaseAdmin.from('depositos').select('id, nombre'),
            supabaseAdmin.from('motivos_ajustes').select('id, nombre'),
            supabaseAdmin.from('articulos').select('id, descripcion')
        ]);
        
        const depDict = depositos ? depositos.reduce((acc, d) => ({ ...acc, [d.id]: d.nombre }), {}) : {};
        const motDict = motivos ? motivos.reduce((acc, m) => ({ ...acc, [m.id]: m.nombre }), {}) : {};
        const artDict = arts ? arts.reduce((acc, a) => ({ ...acc, [a.id]: a.descripcion }), {}) : {};

        // 2. Traer 10 ajustes, 10 transferencias, 10 articulos modificados
        const [{ data: ajustes }, { data: transferencias }, { data: articulos }] = await Promise.all([
            supabaseAdmin.from('ajustes_stock').select('*').order('fecha_hora_registro', { ascending: false }).limit(10),
            supabaseAdmin.from('transferencias_stock').select('*').order('fecha_hora_registro', { ascending: false }).limit(10),
            supabaseAdmin.from('articulos').select('*').order('fecha_hora_actualizacion', { ascending: false }).limit(10)
        ]);

        let actividad = [];

        if (ajustes) {
            actividad = actividad.concat(ajustes.map(a => ({
                id: `aj-${a.id || Date.now() + Math.random()}`,
                tipo: 'MOVIMIENTOS',
                titulo: 'Movimiento registrado',
                descripcion: `Se registró un ajuste de stock para ${artDict[a.articulo_id] || 'Producto desconocido'} (Motivo: ${motDict[a.motivo_id] || 'N/A'}) en ${depDict[a.deposito_id] || 'Depósito'}.`,
                fecha: a.fecha_hora_registro,
                typeLabel: 'ok'
            })));
        }

        if (transferencias) {
            actividad = actividad.concat(transferencias.map(t => ({
                id: `tr-${t.id || Date.now() + Math.random()}`,
                tipo: 'MOVIMIENTOS',
                titulo: 'Transferencia completada',
                descripcion: `Se transfirieron ${t.cantidad} unidades de ${artDict[t.articulo_id] || 'Producto desconocido'} de ${depDict[t.deposito_origen_id] || 'origen'} a ${depDict[t.deposito_destino_id] || 'destino'}.`,
                fecha: t.fecha_hora_registro,
                typeLabel: 'info'
            })));
        }

        if (articulos) {
            actividad = actividad.concat(articulos.map(a => ({
                id: `ar-${a.id || Date.now() + Math.random()}`,
                tipo: 'CATÁLOGO',
                titulo: 'Catálogo actualizado',
                descripcion: `El producto ${a.descripcion} fue registrado o actualizado.`,
                fecha: a.fecha_hora_actualizacion || a.fecha_hora_registro,
                typeLabel: 'ok'
            })));
        }

        actividad.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        return actividad.slice(0, 20); // Retornar las últimas 20 globales
    }
}

module.exports = MasterService;
