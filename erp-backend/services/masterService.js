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
}

module.exports = MasterService;
