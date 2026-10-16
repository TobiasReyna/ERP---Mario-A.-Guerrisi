const { supabaseAdmin } = require('../config/supabase');

const ROLES = {
  ADMIN: 'Administrador',
  DEPOSITO: 'Encargado de Depósito',
  COMPRAS: 'Encargado de Compras',
  TESORERO: 'Tesorero',
  CAJERO: 'Cajero',
};

/**
 * Middleware que verifica la sesión activa mediante cookie HttpOnly (access_token)
 * o cabecera Authorization Bearer, e inyecta req.user con el perfil operativo y su rol.
 */
const verificarSesion = async (req, res, next) => {
  try {
    let token = req.cookies?.access_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'No autenticado. Debe iniciar sesión.' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Sesión inválida o expirada.' });
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('id, nombre, email, estado, rol_id, roles(nombre)')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ error: 'El usuario no posee un perfil operativo asignado.' });
    }

    if (userData.estado === false) {
      return res.status(403).json({ error: 'El perfil del usuario se encuentra inactivo.' });
    }

    const roleName = userData.roles?.nombre || 'Sin Rol';

    req.user = {
      id: userData.id,
      nombre: userData.nombre,
      email: userData.email,
      rol_id: userData.rol_id,
      rol: roleName,
      rol_nombre: roleName,
    };

    return next();
  } catch (error) {
    console.error('[AuthMiddleware] Error en verificarSesion:', error);
    return res.status(500).json({ error: 'Error interno al verificar la sesión.' });
  }
};

/**
 * Middleware de control de acceso basado en roles (RBAC).
 * @param {string[]} rolesPermitidos Lista de nombres de rol autorizados (ej. [ROLES.ADMIN, ROLES.TESORERO])
 */
const autorizarRoles = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    const rolUsuario = String(req.user.rol).trim().toLowerCase();
    const permitidosNormalizados = rolesPermitidos.map((r) => String(r).trim().toLowerCase());

    if (!permitidosNormalizados.includes(rolUsuario)) {
      return res.status(403).json({
        error: `Acceso denegado. Su rol (${req.user.rol}) no tiene permisos para acceder a este recurso.`,
      });
    }

    return next();
  };
};

module.exports = {
  ROLES,
  verificarSesion,
  autorizarRoles,
};
