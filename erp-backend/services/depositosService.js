const  {supabaseAdmin} = require('../config/supabase');

const obtenerDepositosActivos = async () => {
  const { data, error } = await supabaseAdmin
    .from('depositos')
    .select('id, nombre')
    .eq('estado', true)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
};

module.exports = { obtenerDepositosActivos };