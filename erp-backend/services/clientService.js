const { supabaseAdmin } = require('../config/supabase');

class ClientService {
  static async listarClientes() {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, razon_social, cuit, limite_credito, saldo_actual, estado')
      .order('razon_social', { ascending: true });

    if (error) throw new Error(`Error al listar clientes: ${error.message}`);

    return (data || []).map((c) => ({
      id: c.id,
      razonSocial: c.razon_social,
      cuit: c.cuit,
      limiteCredito: Number(c.limite_credito) || 0,
      saldoActual: Number(c.saldo_actual) || 0,
      estado: Boolean(c.estado),
    }));
  }

  static async actualizarLimiteCredito(clienteId, nuevoLimite) {
    const limiteNumerico = Number(nuevoLimite);
    if (isNaN(limiteNumerico) || limiteNumerico < 0) {
      throw new Error('El límite de crédito debe ser un número mayor o igual a 0.');
    }

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .update({ limite_credito: limiteNumerico })
      .eq('id', clienteId)
      .select('id, razon_social, cuit, limite_credito, saldo_actual, estado')
      .single();

    if (error) throw new Error(`Error al actualizar límite: ${error.message}`);
    if (!data) throw new Error('Cliente no encontrado.');

    return {
      id: data.id,
      razonSocial: data.razon_social,
      cuit: data.cuit,
      limiteCredito: Number(data.limite_credito) || 0,
      saldoActual: Number(data.saldo_actual) || 0,
      estado: Boolean(data.estado),
    };
  }
}

module.exports = ClientService;