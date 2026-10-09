import { useState, useEffect, useRef } from 'react';
import { NavLink, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Catalogo_de_productos from './pages/Catalogo_de_productos';
import Inventario from './pages/Inventario';
import Inventario2 from './pages/Inventario2';
import Alertas_de_stock from './pages/Alertas_de_stock';
import Movimientos from './pages/Movimientos';
import Detalle_producto from './pages/Detalle_producto';
import Gestion_de_proveedores from './pages/Gestion_de_proveedores';
import Cotizaciones_ordenes_compra from './pages/Cotizaciones_ordenes_compra';
import Cuentas_por_pagar from './pages/Cuentas_por_pagar';
import Notas_credito_debito from './pages/Notas_credito_debito';
import Limites_de_credito from './pages/Limites_de_credito';
import Punto_de_Venta from './pages/Punto_de_Venta';
import Perfil from './pages/Perfil';
import RegistroComprobanteProveedor from './pages/RegistroComprobanteProveedor';
import Lista_Precios from './pages/Lista_Precios';

import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Sidebar from './components/Sidebar';
import { ROLES } from './constants/roles';
import { useAuth } from './context/AuthContext';
import { getInitials } from './utils/userDisplay';

import Apertura_Caja from './pages/Apertura_Caja';
import Cierre_Caja from './pages/Cierre_Caja';


const ROUTE_INFO = {
  '/Cierre_Caja': { title: 'Cierre de caja', subtitle: 'Arqueo ciego y cierre de turno' },
  '/Apertura_Caja': { title: 'Apertura de caja', subtitle: 'Inicio de turno y fondo de caja' },
  '/': { title: 'Dashboard', subtitle: 'Resumen general del inventario y el catálogo' },
  '/Catalogo_de_productos': { title: 'Catálogo', subtitle: 'Base maestra de productos — código interno, EAN-13, marca y precio' },
  '/Lista_Precios': { title: 'Lista de Precios', subtitle: 'Gestión de precios al consumidor final, aumentos masivos y auditoría' },
  '/lista-precios': { title: 'Lista de Precios', subtitle: 'Gestión de precios al consumidor final, aumentos masivos y auditoría' },
  '/Inventario': { title: 'Inventario', subtitle: 'Stock comparado entre Tienda Central y Galería Margalef' },
  '/Movimientos': { title: 'Movimientos', subtitle: 'Entradas, salidas, ajustes y transferencias de stock' },
  '/Alertas_de_stock': { title: 'Alertas y notificaciones', subtitle: 'Reposición de stock y actividad general del sistema' },
  '/Detalle_producto': { title: 'Detalle de producto', subtitle: 'Stock por depósito, historial de precios y movimientos' },
  '/Gestion_de_proveedores': { title: 'Gestión de Proveedores', subtitle: 'Contactos, condiciones comerciales e historial de compras por proveedor' },
  '/Cotizaciones_ordenes_compra': { title: 'Cotizaciones y Órdenes de Compra', subtitle: 'Solicitud de cotizaciones a proveedores y formalización de compras' },
  '/Cuentas_por_pagar': { title: 'Cuentas por Pagar', subtitle: 'Obligaciones con proveedores, vencimientos y pagos' },
  '/Notas_credito_debito': { title: 'Notas de Crédito y Débito', subtitle: 'Devoluciones y ajustes de facturación' },
  '/Limites_de_credito': { title: 'Límites de Crédito', subtitle: 'Cuentas corrientes de clientes mayoristas (B2B)' },
  '/Punto_de_Venta': { title: 'Punto de Venta', subtitle: 'Caja única — venta rápida, cobro mixto y comprobante' },
  '/Perfil': { title: 'Mi perfil', subtitle: 'Información de la cuenta y el depósito asignado' },
  '/registro-comprobantes': { title: 'Registro de Comprobantes', subtitle: 'Facturas, Notas de Crédito y Notas de Débito de proveedores' },
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setIsUserOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  // Detecta si estamos operando en la caja

  const esModoPOS = location.pathname.toLowerCase() === '/punto_de_venta';
  const isLogin = location.pathname === '/' || location.pathname.toLowerCase() === '/login';

//  const esModoPOS = ['/punto_de_venta', '/apertura_caja', '/cierre_caja'].includes(location.pathname.toLowerCase());  PRESTAR ATENCION ACA


  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [ultimaLectura, setUltimaLectura] = useState(() => {
    return localStorage.getItem('alertasLeidas') || '0';
  });

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/stock/alerts').then(res => res.ok ? res.json() : { data: [] }),
      fetch('http://localhost:3001/api/system/activity').then(res => res.ok ? res.json() : { data: [] })
    ])
    .then(([alertsRes, activityRes]) => {
      let combined = [];
      const storedLastRead = localStorage.getItem('alertasLeidas') || '0';
      setUltimaLectura(storedLastRead);

      if (alertsRes.data) {
        combined = combined.concat(alertsRes.data.map(alert => {
          const isCritical = alert.stock_actual <= 0;
          const id = `alert-${alert.articulo_id}-${alert.deposito_id}`;
          const pastDate = new Date(Date.now() - 3600000);
          return {
            id,
            type: isCritical ? 'crit' : 'warn',
            title: isCritical ? 'Stock crítico:' : 'Reposición sugerida:',
            text: `${alert.articulo_descripcion} en ${alert.deposito_nombre}. Quedan ${alert.stock_actual} unidades. Sugerida: ${alert.reposicion_sugerida}.`,
            time: 'Ahora',
            rawDate: pastDate
          };
        }));
      }

      if (activityRes.data) {
        combined = combined.concat(activityRes.data.map(a => {
          const dateObj = new Date(a.fecha);
          const timeStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} · ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
          const id = `act-${a.id}`;
          return {
            id,
            type: a.typeLabel,
            title: a.titulo + ':',
            text: a.descripcion,
            time: timeStr,
            rawDate: dateObj
          };
        }));
      }

      const combinedWithUnread = combined.map(n => {
        return {
          ...n,
          unread: n.rawDate.getTime() > parseInt(storedLastRead, 10)
        };
      });

      combinedWithUnread.sort((a, b) => b.rawDate - a.rawDate);
      setNotifications(combinedWithUnread);
    })
    .catch(err => console.error("Error fetching notifications:", err));
  }, []);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  const unreadCount = notifications.filter(n => n.rawDate.getTime() > parseInt(ultimaLectura, 10)).length;

  const currentRouteInfo = ROUTE_INFO[location.pathname] || {
    title: 'Sistema ERP',
    subtitle: 'Mario A. Guerrisi Instrumentos Musicales',
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setIsUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    const nowStr = Date.now().toString();
    localStorage.setItem('alertasLeidas', nowStr);
    setUltimaLectura(nowStr);
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleNotifClick = (id) => {
    setIsNotifOpen(false);
    navigate('/Alertas_de_stock');
  };

  if (isLogin) {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className={`app ${esModoPOS ? 'app--pos-fullscreen' : ''}`}>
      {/* 1. SIDEBAR (Solo visible si NO estamos en el Punto de Venta) */}
      {!esModoPOS && <Sidebar unreadCount={unreadCount} />}

      {/* 2. MAIN CONTAINER */}
      <div className="main" style={esModoPOS ? { width: '100%' } : {}}>
        {/* TOPBAR */}
        <header className="topbar">
          {/* LADO IZQUIERDO */}
          <div className="topbar-left">
            {esModoPOS ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="brand-mark" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div>
                  <h1 className="topbar-title" style={{ fontSize: '15px', margin: 0 }}>Mario A. Guerrisi</h1>
                  <span className="topbar-subtitle" style={{ fontSize: '11px' }}>Punto de Venta — Caja</span>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="topbar-title">{currentRouteInfo.title}</h1>
                <span className="topbar-subtitle">{currentRouteInfo.subtitle}</span>
              </div>
            )}
          </div>

          {/* CENTRO: Switch ERP vs POS flotante */}
          {(user?.rol === ROLES.CAJERO || user?.rol === ROLES.ADMIN) && (
            <div className="topbar-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div
                style={{
                  background: '#f4f4f5',
                padding: '3px',
                borderRadius: '9px',
                border: '1px solid #e4e4e7',
                display: 'inline-flex',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/Inventario')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  background: !esModoPOS ? '#18181b' : 'transparent',
                  color: !esModoPOS ? '#ffffff' : '#71717a',
                  boxShadow: !esModoPOS ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                Gestión ERP
              </button>
              <button
                type="button"
                onClick={() => navigate('/Punto_de_Venta')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  background: esModoPOS ? '#e11d48' : 'transparent',
                  color: esModoPOS ? '#ffffff' : '#71717a',
                  boxShadow: esModoPOS ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                Modo Caja (POS)
              </button>
            </div>
          </div>
          )}

          {/* LADO DERECHO: Notificaciones y Perfil */}
          <div className="topbar-right">
            {/* NOTIFICACIONES */}
            <div className="topbar-item" ref={notifRef}>
              <button
                className="icon-btn"
                aria-label="Notificaciones"
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  setIsUserOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}
              </button>

              {isNotifOpen && (
                <div className="dropdown-panel notif-dropdown open">
                  <div className="dropdown-head">
                    <h4>Notificaciones</h4>
                    {unreadCount > 0 && (
                      <button className="mark-read" onClick={handleMarkAllRead}>
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', fontSize: '12.5px', color: 'var(--gray-500)' }}>
                        No hay notificaciones pendientes.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item ${n.unread ? 'unread' : ''}`}
                          onClick={() => handleNotifClick(n.id)}
                        >
                          {n.unread ? (
                            <span className={`notif-dot ${n.type}`}></span>
                          ) : (
                            <svg style={{ width: '16px', height: '16px', stroke: 'var(--green)', flexShrink: 0, marginTop: '2px' }} viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                          <div className="notif-body">
                            <div className="notif-text">
                              <strong>{n.title}</strong> {n.text}
                            </div>
                            <div className="notif-time">{n.time}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="dropdown-foot">
                    <a
                      onClick={() => {
                        setIsNotifOpen(false);
                        navigate('/Alertas_de_stock');
                      }}
                    >
                      Ver todas las notificaciones
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* MENÚ DE USUARIO */}
            <div className="topbar-item" ref={userRef}>
              <button
                className="user-menu-trigger"
                onClick={() => {
                  setIsUserOpen(!isUserOpen);
                  setIsNotifOpen(false);
                }}
              >
                <div className="avatar">{getInitials(user?.nombre)}</div>
                <div className="user-meta">
                  <span className="user-name">{user?.nombre}</span>
                  <span className="user-role">{user?.rol}</span>
                </div>
                <svg className="chev" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isUserOpen && (
                <div className="dropdown-panel user-dropdown open">
                  <div className="user-dropdown-head">
                    <div className="name">{user?.nombre}</div>
                    <div className="role">{user?.rol}</div>
                  </div>
                  <div className="user-dropdown-list">
                    <button
                      className="user-dropdown-item"
                      onClick={() => {
                        setIsUserOpen(false);
                        navigate('/Perfil');
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Mi perfil
                    </button>
                    <button
                      className="user-dropdown-item danger"
                      onClick={handleLogout}
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <path d="M16 17l5-5-5-5" />
                        <path d="M21 12H9" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. CONTENIDO PRINCIPAL */}
        <main className="content" style={esModoPOS ? { padding: '18px 24px', maxWidth: '1600px', margin: '0 auto', width: '100%' } : {}}>
          <div key={location.pathname} className="page-transition">
            <Routes location={location}>
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/Inventario" replace />} />
                
                {/* Módulo de Inventario / Catálogo */}
                <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOSITO, ROLES.COMPRAS, ROLES.CAJERO]} />}>
                  <Route path="/Catalogo_de_productos" element={<Catalogo_de_productos />} />
                  <Route path="/Inventario" element={<Inventario2 />} />
                  <Route path="/Inventario2" element={<Inventario2 />} />
                  <Route path="/Movimientos" element={<Movimientos />} />
                  <Route path="/Alertas_de_stock" element={<Alertas_de_stock />} />
                  <Route path="/Detalle_producto" element={<Detalle_producto />} />
                </Route>

                {/* Módulo de Compras y Proveedores */}
                <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COMPRAS]} />}>
                  <Route path="/Gestion_de_proveedores" element={<Gestion_de_proveedores />} />
                  <Route path="/Cotizaciones_ordenes_compra" element={<Cotizaciones_ordenes_compra />} />
                  <Route path="/Lista_Precios" element={<Lista_Precios />} />
                  <Route path="/lista-precios" element={<Lista_Precios />} />
                </Route>

                {/* Módulo de Tesorería */}
                <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TESORERO, ROLES.COMPRAS]} />}>
                  <Route path="/Cuentas_por_pagar" element={<Cuentas_por_pagar />} />
                  <Route path="/registro-comprobantes" element={<RegistroComprobanteProveedor />} />
                  <Route path="/Notas_credito_debito" element={<Notas_credito_debito />} />
                </Route>

                {/* Módulo de Punto de Venta y Clientes */}
                <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CAJERO]} />}>
                  <Route path="/Punto_de_Venta" element={<Punto_de_Venta />} />
                  <Route path="/Apertura_Caja" element={<Apertura_Caja />} />
                  <Route path="/Cierre_Caja" element={<Cierre_Caja />} />
                  <Route path="/Limites_de_credito" element={<Limites_de_credito />} />
                </Route>

                {/* Perfil accesible para todos los logueados */}
                <Route path="/Perfil" element={<Perfil />} />
              </Route>
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;