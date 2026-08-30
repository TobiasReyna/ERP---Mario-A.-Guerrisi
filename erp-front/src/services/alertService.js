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
      stock (
        deposito_id,
        stock_actual,
        stock_minimo,
        stock_maximo,
        depositos ( nombre )
      )
    `)
    .eq('estado', true);

  if (error) throw error;

  return (data || []).map((art) => {
    const existencias = art.stock || [];

    // 1. Calcular existencias y umbrales consolidados reales
    const stockActual = existencias.reduce(
      (acc, s) => acc + (Number(s.stock_actual) || 0),
      0
    );

    const minConsolidado = existencias.length > 0
      ? existencias.reduce((acc, s) => acc + (Number(s.stock_minimo) || 0), 0)
      : 5; // Fallback solo si no tiene registros de stock configurados

    const maxConsolidado = existencias.length > 0
      ? existencias.reduce((acc, s) => acc + (Number(s.stock_maximo) || 0), 0)
      : 15;

    // 2. Cantidad sugerida a comprar/reponer para llegar al stock máximo
    const sugerido = Math.max(0, maxConsolidado - stockActual);

    // 3. Determinación estricta de prioridades
    let prioridad = 'Normal';
    if (stockActual <= 0) {
      prioridad = 'Crítico';
    } else if (stockActual <= minConsolidado) {
      prioridad = 'Bajo stock';
    } else if (stockActual < maxConsolidado) {
      prioridad = 'Reposición';
    }

    return {
      id: art.id,
      codigo: art.codigo_interno || String(art.id).substring(0, 8),
      descripcion: art.descripcion,
      modelo: art.modelo || 'Estándar',
      ean: art.codigo_ean13 || 'S/EAN',
      marca: art.marcas?.nombre || 'Sin marca',
      categoria: art.categorias?.nombre || 'General',
      stockActual,
      stockMinimo: minConsolidado,
      stockMaximo: maxConsolidado,
      sugerido,
      alcance: 'Consolidado',
      prioridad,
      desglose: existencias.map((s) => ({
        depositoId: s.deposito_id,
        depositoNombre: s.depositos?.nombre || 'Depósito',
        stockActual: Number(s.stock_actual) || 0,
        stockMinimo: Number(s.stock_minimo) || 0,
        stockMaximo: Number(s.stock_maximo) || 0,
      })),
    };
  });
};