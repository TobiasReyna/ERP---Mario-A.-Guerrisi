const { supabaseAdmin } = require('../config/supabase');

class ClientService {
  /**
   * Alta rápida de cliente desde el POS (HU-20). Requiere al menos
   * uno de dni/cuit — igual que exige el CHECK de la base.
   */
  static async crearCliente(payload) {
    const { razonSocial, dni, cuit, email, telefono, direccion } = payload;

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
          email: email || null,
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
      email: data.email,
      telefono: data.telefono,
      direccion: data.direccion,
      estado: Boolean(data.estado),
    };
  }

  static async listarClientes() {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, razon_social, cuit, estado')
      .order('razon_social', { ascending: true });

    if (error) throw new Error(`Error al listar clientes: ${error.message}`);

    return (data || []).map((c) => ({
      id: c.id,
      razonSocial: c.razon_social,
      cuit: c.cuit,
      estado: Boolean(c.estado),
    }));
  }

  /**
   * HU-20: búsqueda de clientes por razón social, DNI o CUIT para el POS.
   * Filtra en memoria para evitar errores de operadores entre enteros y texto en Postgres.
   */
  static async buscarClientes(query) {
    const texto = (query || '').trim();
    if (texto.length < 2) return [];

    const soloDigitos = texto.replace(/\D/g, '');
    const termino = texto.toLowerCase();

    // Trae los clientes activos
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, razon_social, dni, cuit, email, telefono, direccion, estado')
      .eq('estado', true);

    if (error) throw new Error(`Error al buscar clientes: ${error.message}`);

    // Filtro seguro convirtiendo DNI y CUIT a string
    const filtrados = (data || []).filter((c) => {
      const razonSocial = (c.razon_social || '').toLowerCase();
      const dniStr = String(c.dni || '');
      const cuitStr = String(c.cuit || '');

      const coincideNombre = razonSocial.includes(termino);
      const coincideDni = soloDigitos.length >= 2 && dniStr.includes(soloDigitos);
      const coincideCuit = soloDigitos.length >= 2 && cuitStr.includes(soloDigitos);

      return coincideNombre || coincideDni || coincideCuit;
    });

    // Retorna hasta 10 resultados formateados
    return filtrados.slice(0, 10).map((c) => ({
      id: c.id,
      razonSocial: c.razon_social,
      dni: c.dni,
      cuit: c.cuit,
      email: c.email,
      telefono: c.telefono,
      direccion: c.direccion,
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
      .select('id, razon_social, cuit, estado')
      .single();

    if (error) throw new Error(`Error al actualizar límite: ${error.message}`);
    if (!data) throw new Error('Cliente no encontrado.');

    return {
      id: data.id,
      razonSocial: data.razon_social,
      cuit: data.cuit,
      estado: Boolean(data.estado),
    };
  }
}

module.exports = ClientService;