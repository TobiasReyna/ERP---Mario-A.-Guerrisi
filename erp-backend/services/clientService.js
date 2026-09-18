const { supabaseAdmin } = require('../config/supabase');

class ClientService {
  /**
   * Alta rápida de cliente desde el POS (HU-20). Requiere al menos
   * uno de dni/cuit — igual que exige el CHECK de la base.
   */
  static async crearCliente(payload) {
    const { razonSocial, dni, cuit, telefono, direccion } = payload;

    if (!razonSocial || !razonSocial.trim()) {
      throw new Error('El nombre del cliente es obligatorio.');
    }
    if (!dni && !cuit) {
      throw new Error('Necesitás cargar al menos un DNI o un CUIT.');
    }
    if (cuit && !/^\d{11}$/.test(String(cuit))) {
      throw new Error('El CUIT debe tener 11 dígitos, sin guiones.');
    }

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .insert([
        {
          razon_social: razonSocial.trim(),
          dni: dni || null,
          cuit: cuit || null,
          telefono: telefono || '',
          direccion: direccion || '',
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un cliente registrado con ese DNI o CUIT.');
      }
      throw new Error(`Error al crear el cliente: ${error.message}`);
    }

    return {
      id: data.id,
      razonSocial: data.razon_social,
      dni: data.dni,
      cuit: data.cuit,
      telefono: data.telefono,
      direccion: data.direccion,
      limiteCredito: Number(data.limite_credito) || 0,
      saldoActual: Number(data.saldo_actual) || 0,
      estado: Boolean(data.estado),
    };
  }

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

  /**
   * HU-20: búsqueda de clientes por razón social, DNI o CUIT para el POS.
   * Trae solo clientes activos, máximo 10 resultados.
   */
  static async buscarClientes(query) {
    const texto = (query || '').trim();
    if (texto.length < 2) return [];

    let builder = supabaseAdmin
      .from('clientes')
      .select('id, razon_social, dni, cuit, limite_credito, saldo_actual, estado')
      .eq('estado', true)
      .limit(10);

    if (/^\d+$/.test(texto)) {
      // Numérico: puede ser DNI o CUIT -> se busca en ambos
      builder = builder.or(`dni.eq.${texto},cuit.eq.${texto}`);
    } else {
      builder = builder.ilike('razon_social', `%${texto}%`);
    }

    const { data, error } = await builder;
    if (error) throw new Error(`Error al buscar clientes: ${error.message}`);

    return (data || []).map((c) => ({
      id: c.id,
      razonSocial: c.razon_social,
      dni: c.dni,
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