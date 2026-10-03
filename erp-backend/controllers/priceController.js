import { supabase } from '../config/supabaseClient.js';

// 1. APLICADOR AUTOMÁTICO DE PRECIOS VIGENTES
// Se ejecuta para asegurar que si ya llegó la fecha programada, el precio pase a 'precio_actual'
export async function sincronizarPreciosProgramados() {
  try {
    const ahora = new Date().toISOString();

    // Busca precios en el historial cuya fecha ya se cumplió
    const { data: programadosVencidos, error } = await supabase
      .from('historial_precios')
      .select('id, articulo_id, precio, fecha_hora_registro')
      .lte('fecha_hora_registro', ahora)
      .order('fecha_hora_registro', { ascending: true });

    if (error || !programadosVencidos || programadosVencidos.length === 0) return;

    // Actualiza articulos.precio_actual con el valor vigente
    for (const item of programadosVencidos) {
      await supabase
        .from('articulos')
        .update({
          precio_actual: item.precio,
          fecha_hora_actualizacion: ahora,
        })
        .eq('id', item.articulo_id);
    }
  } catch (err) {
    console.error('[PriceSync] Error sincronizando precios:', err);
  }
}

// 2. ACTUALIZACIÓN INDIVIDUAL (Inmediata o Programada)
export async function actualizarPrecioIndividual(req, res) {
  try {
    const { articulo_id, nuevo_precio, fecha_programada, usuario_id } = req.body;

    if (!articulo_id || !nuevo_precio || nuevo_precio <= 0) {
      return res.status(400).json({ error: 'Datos de artículo o precio inválidos.' });
    }

    const ahora = new Date();
    const esFuturo = fecha_programada && new Date(fecha_programada) > ahora;
    const fechaEfectiva = esFuturo ? new Date(fecha_programada).toISOString() : ahora.toISOString();

    // Guardamos en historial_precios (como histórico o como programación a futuro)
    const { error: histError } = await supabase.from('historial_precios').insert([
      {
        articulo_id,
        precio: nuevo_precio,
        fecha_hora_registro: fechaEfectiva,
        usuario_id: usuario_id || '00000000-0000-0000-0000-000000000001',
      },
    ]);

    if (histError) throw histError;

    // Solo si es INMEDIATO actualizamos articulos.precio_actual hoy
    if (!esFuturo) {
      const { error: artError } = await supabase
        .from('articulos')
        .update({
          precio_actual: nuevo_precio,
          fecha_hora_actualizacion: fechaEfectiva,
        })
        .eq('id', articulo_id);

      if (artError) throw artError;
    }

    res.json({
      ok: true,
      mensaje: esFuturo
        ? `Precio programado con éxito para el ${new Date(fecha_programada).toLocaleString('es-AR')}.`
        : 'Precio actualizado de inmediato.',
      esFuturo,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 3. AUMENTO MASIVO GRUPAL (Porcentaje sobre catálogo, marca o categoría)
export async function aplicarAumentoMasivo(req, res) {
  try {
    const { tipo, categoria_id, marca_id, porcentaje, redondeo, fecha_programada, usuario_id } = req.body;

    const pct = Number(porcentaje);
    if (isNaN(pct) || pct === 0) {
      return res.status(400).json({ error: 'El porcentaje debe ser distinto de 0.' });
    }

    // Traer los artículos según el filtro
    let query = supabase.from('articulos').select('id, precio_actual').eq('estado', true);
    if (tipo === 'categoria' && categoria_id) query = query.eq('categoria_id', categoria_id);
    if (tipo === 'marca' && marca_id) query = query.eq('marca_id', marca_id);

    const { data: articulos, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!articulos || articulos.length === 0) {
      return res.status(404).json({ error: 'No se encontraron artículos para el alcance elegido.' });
    }

    const ahora = new Date();
    const esFuturo = fecha_programada && new Date(fecha_programada) > ahora;
    const fechaEfectiva = esFuturo ? new Date(fecha_programada).toISOString() : ahora.toISOString();
    const factor = 1 + pct / 100;

    const calcularRedondeo = (val, regla) => {
      if (regla === '10') return Math.round(val / 10) * 10;
      if (regla === '100') return Math.round(val / 100) * 100;
      if (regla === '1000') return Math.round(val / 1000) * 1000;
      return Math.round(val * 100) / 100;
    };

    // Procesar cada artículo
    for (const art of articulos) {
      const nuevoPrecio = Math.max(0, calcularRedondeo(art.precio_actual * factor, redondeo));

      // Guardar en el historial
      await supabase.from('historial_precios').insert([
        {
          articulo_id: art.id,
          precio: nuevoPrecio,
          fecha_hora_registro: fechaEfectiva,
          usuario_id: usuario_id || '00000000-0000-0000-0000-000000000001',
        },
      ]);

      // Si es hoy, actualizar precio_actual
      if (!esFuturo) {
        await supabase
          .from('articulos')
          .update({
            precio_actual: nuevoPrecio,
            fecha_hora_actualizacion: fechaEfectiva,
          })
          .eq('id', art.id);
      }
    }

    res.json({
      ok: true,
      articulosAfectados: articulos.length,
      mensaje: esFuturo
        ? `Aumento del ${pct}% programado para ${articulos.length} artículos a partir de ${new Date(fecha_programada).toLocaleString('es-AR')}.`
        : `Aumento del ${pct}% aplicado a ${articulos.length} artículos con éxito.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 4. LISTAR AUMENTOS FUTUROS PENDIENTES
export async function listarAumentosProgramados(req, res) {
  try {
    const ahora = new Date().toISOString();

    const { data, error } = await supabase
      .from('historial_precios')
      .select(`
        id,
        precio,
        fecha_hora_registro,
        articulo_id,
        articulos (descripcion, modelo, precio_actual, marcas (nombre))
      `)
      .gt('fecha_hora_registro', ahora)
      .order('fecha_hora_registro', { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 5. CANCELAR UN PRECIO PROGRAMADO ANTES DE QUE SE CUMPLA
export async function cancelarAumentoProgramado(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('historial_precios').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true, mensaje: 'Programación cancelada con éxito.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}