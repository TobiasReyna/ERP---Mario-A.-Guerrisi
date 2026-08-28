const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el archivo .env');
}

// Cliente inicializado con Service Role Key para ignorar RLS en el backend
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
           autoRefreshToken: false,
           persistSession: false,
         },
       });

module.exports = { supabaseAdmin };