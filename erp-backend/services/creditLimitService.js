const { supabaseAdmin } = require('../config/supabase');

class CreditLimitService {
  /**
   * Listar clientes con estado crediticio y cálculo de métricas generales
   */
  static async listarClientesConCredito() {
    const { data: clientes, error } = await supabaseAdmin
      .from('clientes')
      .select('id, razon_social, cuit, limite_credito, saldo_actual, estado')
      .order('razon_social', { ascending: true });

    if (error) throw new Error(`Error al listar clientes: ${error.message}`);

    let totalCreditoOtorgado = 0;
    let totalDeudaActual = 0;
    let clientesExcedidos = 0;
    let clientesEnAlerta = 0;

    const listaFormateada = (clientes || []).map((c) => {
      const limite = Number(c.limite_credito) || 0;
      const saldo = Number(c.saldo_actual) || 0;
      const disponible = Math.max(0, limite - saldo);
      const porcentajeUso = limite > 0 ? (saldo / limite) * 100 : saldo > 0 ? 100 : 0;

      let estadoCredito = 'Normal';
      if (saldo > limite) {
        estadoCredito = 'Excedido';
        clientesExcedidos++;
      } else if (porcentajeUso >= 80) {
        estadoCredito = 'Alerta';
        clientesEnAlerta++;
      }

      totalCreditoOtorgado += limite;
      totalDeudaActual += saldo;

      return {
        id: c.id,
        razonSocial: c.razon_social,
        cuit: c.cuit,
        limiteCredito: limite,
        saldoActual: saldo,
        disponible,
        porcentajeUso: Math.round(porcentajeUso),
        estadoCredito,
        activo: Boolean(c.estado),
      };
    });

    return {
      clientes: listaFormateada,
      kpis: {
        totalCreditoOtorgado,
        totalDeudaActual,
        disponibleTotal: Math.max(0, totalCreditoOtorgado - totalDeudaActual),
        clientesExcedidos,
        clientesEnAlerta,
        totalClientes: listaFormateada.length,
      },
    };
  }

  /**
   * Actualizar límite de crédito de un cliente (HU-24 Criterio 1)
   */
  static async actualizarLimite(id, nuevoLimite) {
    const limiteNumerico = Number(nuevoLimite);

    if (isNaN(limiteNumerico) || limiteNumerico < 0) {
      throw new Error('El límite de crédito debe ser un número positivo mayor o igual a 0.');
    }

    const { data: cliente, error } = await supabaseAdmin
      .from('clientes')
      .update({ limite_credito: limiteNumerico })
      .eq('id', id)
      .select('id, razon_social, cuit, limite_credito, saldo_actual, estado')
      .single();

    if (error) throw new Error(`Error al actualizar límite: ${error.message}`);
    if (!cliente) throw new Error('Cliente no encontrado.');

    const limite = Number(cliente.limite_credito) || 0;
    const saldo = Number(cliente.saldo_actual) || 0;

    return {
      id: cliente.id,
      razonSocial: cliente.razon_social,
      cuit: cliente.cuit,
      limiteCredito: limite,
      saldoActual: saldo,
      disponible: Math.max(0, limite - saldo),
      porcentajeUso: limite > 0 ? Math.round((saldo / limite) * 100) : 100,
      activo: Boolean(cliente.estado),
    };
  }
}

module.exports = CreditLimitService;