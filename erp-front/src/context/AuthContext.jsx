import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehidratar sesión (persistencia tras F5)
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/auth/me', {
          withCredentials: true
        });
        
        // Aplanamos igual que en login
        const extractedRole = response.data.user.roles?.nombre || response.data.user.rol_nombre || response.data.user.rol || 'Sin Rol';
        setUser({
          ...response.data.user,
          rol: extractedRole
        });
      } catch (error) {
        // Falló la autenticación por cookie
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  const login = (userData) => {
    const extractedRole = userData.roles?.nombre || userData.rol_nombre || userData.rol || 'Sin Rol';
    const normalizedUser = {
      ...userData,
      rol: extractedRole
    };
    setUser(normalizedUser);
  };

  const logout = async () => {
    try {
      // Solo el backend puede borrar cookies HttpOnly
      await axios.post('http://localhost:3001/api/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor:', error);
    } finally {
      // Limpiamos el estado local siempre, para no dejar al usuario atrapado en la sesión
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
