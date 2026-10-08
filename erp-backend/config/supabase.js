const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el archivo .env');
}

const CLIENT_OPTIONS = {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
};

// Cliente inicializado con Service Role Key para ignorar RLS en el backend.
// IMPORTANTE: NUNCA llamar a métodos de sesión (signInWithPassword, setSession, etc.)
// sobre este cliente. Aunque persistSession sea false, supabase-js guarda la sesión
// en memoria y las consultas siguientes saldrían con el JWT del usuario (sujetas a RLS),
// contaminando a toda la API.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, CLIENT_OPTIONS);

// Fábrica de clientes descartables para operaciones de autenticación de usuarios.
// Cada llamada crea una instancia aislada que se descarta al terminar la petición,
// así la sesión del usuario nunca se mezcla con el cliente administrativo.
const createAuthClient = () => createClient(supabaseUrl, supabaseServiceKey, CLIENT_OPTIONS);

module.exports = { supabaseAdmin, createAuthClient };