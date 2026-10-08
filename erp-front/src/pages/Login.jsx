import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { user, login, isLoading: isAuthLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Si ya estamos autenticados (persistencia exitosa), redirigir al inventario
  useEffect(() => {
    if (user && !isAuthLoading) {
      navigate('/Inventario', { replace: true });
    }
  }, [user, isAuthLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:3001/api/auth/login',
        { email, password },
        { withCredentials: true }
      );

      login(response.data.user);

      setIsLoading(false);
      navigate('/Inventario');
    } catch (err) {
      setIsLoading(false);
      if (err.response && err.response.status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else if (err.response && err.response.status === 403) {
        setError('El usuario no tiene un perfil operativo.');
      } else {
        setError('Ocurrió un error al intentar iniciar sesión.');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gray-50)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--white)',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius-lg)',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Logo and Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'var(--red)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 8px 16px rgba(227, 49, 65, 0.3)'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--black)', letterSpacing: '-0.3px', margin: '0 0 4px 0' }}>
            Mario A. Guerrisi
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0, fontWeight: '500' }}>
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {error && (
            <div style={{
              background: 'var(--crit-soft)',
              color: 'var(--crit)',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--crit-border)',
              fontSize: '13px',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }} htmlFor="email">
                Correo Electrónico
              </label>
              <div className="search-input" style={{ width: '100%', padding: '11px 14px', background: 'var(--gray-50)' }}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  disabled={isLoading}
                  style={{ width: '100%', fontWeight: '500' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }} htmlFor="password">
                Contraseña
              </label>
              <div className="search-input" style={{ width: '100%', padding: '11px 14px', background: 'var(--gray-50)', position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  style={{ width: '100%', paddingRight: '30px', fontWeight: '500' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--gray-500)',
                    transition: 'color 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--gray-700)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--gray-500)'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px', fontSize: '13.5px', opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <a href="#" style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--gray-500)', textDecoration: 'none', transition: 'color 0.15s ease' }}
             onMouseOver={(e) => e.currentTarget.style.color = 'var(--black)'}
             onMouseOut={(e) => e.currentTarget.style.color = 'var(--gray-500)'}>
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
