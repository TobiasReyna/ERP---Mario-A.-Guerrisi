// src/services/tesoreriaService.js
// Ajusta la importación de supabase según cómo lo tengas configurado en tu proyecto
const  {supabaseAdmin} = require('../config/supabase'); 

const obtenerLibroDiario = async ({ fecha, deposito_id, caja_id, cajero_id, tipo_evento, medio_pago, limit, offset }) => {
  const { data, error } = await supabaseAdmin.rpc('obtener_libro_diario', {
    p_fecha: fecha,
    p_deposito_id: deposito_id,
    p_caja_id: caja_id || null,
    p_cajero_id: cajero_id || null,
    p_tipo_evento: tipo_evento || null,
    p_medio_pago: medio_pago || null,
    p_limit: limit,
    p_offset: offset
  });

  if (error) throw error;
  return data;
};

const obtenerDetalleEvento = async ({ tipo_evento, referencia_id }) => {
  if (tipo_evento === 'Venta') {
    const { data, error } = await supabaseAdmin
      .from('ventas')
      .select(`
        id, total, lista_precio_id,
        clientes (razon_social, dni),
        ventas_detalle (cantidad, precio_unitario, importe_linea, articulos(descripcion)),
        pagos_venta (metodo, monto)
      `)
      .eq('id', referencia_id)
      .single();
    if (error) throw error;
    return data;
  } 
  
  if (tipo_evento === 'Ingreso' || tipo_evento === 'Egreso') {
    const { data, error } = await supabaseAdmin
      .from('caja_movimientos')
      .select('observacion, contra_asiento_de')
      .eq('id', referencia_id)
      .single();
    if (error) throw error;
    return data;
  }

  return {};
};

module.exports = {
  obtenerLibroDiario,
  obtenerDetalleEvento
};