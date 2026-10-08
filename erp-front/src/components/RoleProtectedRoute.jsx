import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();

  // 0. Condición de carrera: Esperar a que termine de rehidratar la sesión
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '10px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--red, #E33141)' }} />
        <p style={{ color: 'var(--gray-500)', fontSize: '14px', fontWeight: '500' }}>Cargando perfil...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 1. Si no hay usuario después de cargar, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Extraer el rol del usuario desde la propiedad plana garantizada por AuthContext
  const userRole = user.rol || 'Sin Rol';

  // 3. Normalizar ambas partes para evitar fallos por mayúsculas o espacios extra
  const normalizedUserRole = userRole.trim().toLowerCase();
  const normalizedAllowed = allowedRoles.map(r => r.trim().toLowerCase());

  // 4. Validar si el rol actual está incluido en los permitidos
  if (!normalizedAllowed.includes(normalizedUserRole)) {
    // En lugar de redirigir a "/" (que activa isLogin y crea un loop invisible),
    // mostramos una pantalla de "Acceso Denegado" estática para cortar el ciclo.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--crit, #E33141)', marginBottom: '10px' }}>Acceso Denegado</h2>
        <p style={{ color: 'var(--gray-700)' }}>Tu perfil operativo (<strong>{userRole}</strong>) no tiene los permisos necesarios para visualizar este módulo.</p>
        <a href="/login" style={{ marginTop: '20px', color: 'var(--gray-500)', textDecoration: 'underline' }}>Volver al inicio</a>
      </div>
    );
  }

  // 5. Si pasa, renderizamos los hijos o el Outlet
  return children ? children : <Outlet />;
};

export default RoleProtectedRoute;
