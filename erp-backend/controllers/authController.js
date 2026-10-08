const { supabaseAdmin, createAuthClient } = require('../config/supabase');

// Opciones compartidas por login y logout. clearCookie solo borra la cookie
// si path/sameSite/secure coinciden con los usados al crearla.
const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
});

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
        }

        // 1. Validar credenciales con un cliente AISLADO y descartable.
        //    Así la sesión del usuario nunca queda guardada en supabaseAdmin.
        const authClient = createAuthClient();
        const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
            email,
            password
        });

        if (authError || !authData.user) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const user = authData.user;
        const session = authData.session;

        // 2. Obtener rol operativo con el cliente administrativo (service role, sin RLS)
        //    usuarios.id referencia a auth.users.id, así que buscamos por id.
        const { data: userData, error: userError } = await supabaseAdmin
            .from('usuarios')
            .select('id, nombre, email, rol_id, roles(nombre)')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            console.error('[Auth] Error obteniendo perfil operativo:', userError);
            return res.status(403).json({ error: 'Usuario no tiene un perfil operativo asignado.' });
        }

        if (!userData.roles?.nombre) {
            console.warn(`[Auth] El JOIN con roles devolvió vacío para el usuario ${userData.id} (rol_id: ${userData.rol_id})`);
        }

        const roleName = userData.roles?.nombre || 'Sin Rol';

        // 3. Configurar cookies HttpOnly
        const cookieOptions = getCookieOptions();

        // access_token (1 hora)
        res.cookie('access_token', session.access_token, {
            ...cookieOptions,
            maxAge: 3600 * 1000
        });

        // refresh_token (7 días)
        res.cookie('refresh_token', session.refresh_token, {
            ...cookieOptions,
            maxAge: 7 * 24 * 3600 * 1000
        });

        // 4. Retornar JSON limpio sin tokens
        return res.status(200).json({
            user: {
                id: userData.id,
                nombre: userData.nombre,
                email: userData.email,
                rol_id: userData.rol_id,
                rol_nombre: roleName
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

const getMe = async (req, res) => {
    try {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        const { data: userData, error: userError } = await supabaseAdmin
            .from('usuarios')
            .select('id, nombre, email, rol_id, roles(nombre)')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return res.status(403).json({ error: 'Usuario sin perfil operativo' });
        }

        const roleName = userData.roles?.nombre || 'Sin Rol';

        return res.status(200).json({
            user: {
                id: userData.id,
                nombre: userData.nombre,
                email: userData.email,
                rol_id: userData.rol_id,
                rol_nombre: roleName
            }
        });
    } catch (error) {
        console.error('Error en getMe:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const logout = async (req, res) => {
    const token = req.cookies?.access_token;

    // Revocar la sesión en Supabase para invalidar también el refresh_token.
    // Es best-effort: si falla (token ya expirado, etc.) igual borramos las cookies.
    if (token) {
        try {
            await supabaseAdmin.auth.admin.signOut(token);
        } catch (error) {
            console.warn('[Auth] No se pudo revocar la sesión en Supabase:', error.message);
        }
    }

    const cookieOptions = getCookieOptions();
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return res.status(200).json({ message: 'Sesión cerrada correctamente.' });
};

module.exports = {
    login,
    getMe,
    logout
};
