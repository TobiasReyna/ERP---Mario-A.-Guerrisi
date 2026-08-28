import { supabase } from '../config/supabaseClient';

export const getReplenishmentData = async () => {
  const { data, error } = await supabase
    .from('articulos')
    .select(`
      id,
      codigo_interno,
      descripcion,
      codigo_ean13,
      modelo,
      estado,
      marcas ( nombre ),
      categorias ( nombre ),
      politicas_reposicion_deposito (
        deposito_id,
        stock_minimo,
        stock_maximo,
        depositos ( nombre )
      )
    `)
    .eq('estado', true);

  if (error) throw error;

  return (data || []).map((art) => {
    // Si tienen una tabla de stock por depósito o políticas por depósito:
    const politicas = art.politicas_reposicion_deposito || [];
    
    // Calcular mínimos y máximos consolidados
    const minConsolidado = politicas.reduce((acc, p) => acc + (p.stock_minimo || 0), 0) || 5;
    const maxConsolidado = politicas.reduce((acc, p) => acc + (p.stock_maximo || 0), 0) || 12;

    // Stock actual (se toma del campo de stock o cálculo de movimientos)
    const stockActual = art.stock_actual ?? 0;
    const sugerido = Math.max(0, maxConsolidado - stockActual);

    let prioridad = 'Normal';
    if (stockActual <= minConsolidado) {
      prioridad = 'Crítico';
    } else if (stockActual < maxConsolidado) {
      prioridad = 'Reposición';
    }

    return {
      id: art.id,
      codigo: art.codigo_interno,
      descripcion: art.descripcion,
      marca: art.marcas?.nombre || 'S/M',
      categoria: art.categorias?.nombre || 'General',
      stockActual,
      stockMinimo: minConsolidado,
      stockMaximo: maxConsolidado,
      sugerido,
      alcance: 'Consolidado',
      prioridad,
    };
  });
};