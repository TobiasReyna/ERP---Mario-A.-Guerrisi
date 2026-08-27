import { useState, useEffect, useRef } from 'react';
import { NavLink, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Catalogo_de_productos from './pages/Catalogo_de_productos';
import Inventario from './pages/Inventario';
import Alertas_de_stock from './pages/Alertas_de_stock';
import Movimientos from './pages/Movimientos';
import Detalle_producto from './pages/Detalle_producto';
import Perfil from './pages/Perfil';

const ROUTE_INFO = {
  '/': { title: 'Dashboard', subtitle: 'Resumen general del inventario y el catálogo' },
  '/Catalogo_de_productos': { title: 'Catálogo', subtitle: 'Base maestra de productos — código interno, EAN-13, marca y precio' },
  '/Inventario': { title: 'Inventario', subtitle: 'Stock comparado entre Tienda Central y Galería Margalef' },
  '/Movimientos': { title: 'Movimientos', subtitle: 'Entradas, salidas, ajustes y transferencias de stock' },
  '/Alertas_de_stock': { title: 'Alertas y notificaciones', subtitle: 'Reposición de stock y actividad general del sistema' },
  '/Detalle_producto': { title: 'Detalle de producto', subtitle: 'Stock por depósito, historial de precios y movimientos' },
  '/Perfil': { title: 'Mi perfil', subtitle: 'Información de la cuenta y el depósito asignado' },
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/stock/alerts').then(res => res.ok ? res.json() : { data: [] }),
      fetch('http://localhost:3001/api/system/activity').then(res => res.ok ? res.json() : { data: [] })
    ])
    .then(([alertsRes, activityRes]) => {
      let combined = [];
      
      if (alertsRes.data) {
        combined = combined.concat(alertsRes.data.map(alert => {
          const isCritical = alert.stock_actual <= 0;
          return {
            id: `alert-${alert.articulo_id}-${alert.deposito_id}`,
            type: isCritical ? 'crit' : 'warn',
            title: isCritical ? 'Stock crítico:' : 'Reposición sugerida:',
            text: `${alert.articulo_nombre} en ${alert.deposito_nombre}. Quedan ${alert.stock_actual} unidades. Sugerida: ${alert.cantidad_sugerida}.`,
            time: 'Ahora',
            unread: true,
            rawDate: new Date()
          };
        }));
      }

      if (activityRes.data) {
        combined = combined.concat(activityRes.data.map(a => {
          const dateObj = new Date(a.fecha);
          const timeStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} · ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
          return {
            id: `act-${a.id}`,
            type: a.typeLabel,
            title: a.titulo + ':',
            text: a.descripcion,
            time: timeStr,
            unread: true,
            rawDate: dateObj
          };
        }));
      }

      combined.sort((a, b) => b.rawDate - a.rawDate);
      setNotifications(combined);
    })
    .catch(err => console.error("Error fetching notifications:", err));
  }, []);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  const currentRouteInfo = ROUTE_INFO[location.pathname] || {
    title: 'Sistema ERP',
    subtitle: 'Mario A. Guerrisi Instrumentos Musicales',
  };

  // Cerrar dropdowns al hacer clic fuera
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
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleNotifClick = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
    setIsNotifOpen(false);
    navigate('/Alertas_de_stock');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      navigate('/Catalogo_de_productos');
    }
  };

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">Mario A. Guerrisi</span>
            <span className="brand-sub">Inventario</span>
          </div>
        </div>

        <nav className="nav-group">
          <div className="nav-group-label">Navegación</div>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            Dashboard
          </NavLink>

          <NavLink
            to="/Catalogo_de_productos"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3v5.59a2 2 0 0 0 .59 1.41l9.59 9.59a2 2 0 0 0 2.82 0l3.59-3.59a2 2 0 0 0 0-2.59Z" />
              <circle cx="8" cy="8" r="1.2" />
            </svg>
            Catálogo
          </NavLink>

          <NavLink
            to="/Inventario"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8 12 3 3 8l9 5 9-5Z" />
              <path d="M3 8v8l9 5 9-5V8" />
              <path d="M12 13v8" />
            </svg>
            Inventario
          </NavLink>

          <NavLink
            to="/Movimientos"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h13l-3-3M17 17H4l3 3" />
            </svg>
            Movimientos
          </NavLink>

          <NavLink
            to="/Alertas_de_stock"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Alertas y notificaciones
            {unreadCount > 0 && <span className="nav-item-badge">{unreadCount}</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">
            Mario A. Guerrisi<br />
            Instrumentos Musicales &copy; 2026<br />
            Sprint 1 · v1.1
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{currentRouteInfo.title}</h1>
            <span className="topbar-subtitle">{currentRouteInfo.subtitle}</span>
          </div>

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
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${n.unread ? 'unread' : ''}`}
                        onClick={() => handleNotifClick(n.id)}
                      >
                        <span className={`notif-dot ${n.type}`}></span>
                        <div className="notif-body">
                          <div className="notif-text">
                            <strong>{n.title}</strong> {n.text}
                          </div>
                          <div className="notif-time">{n.time}</div>
                        </div>
                      </div>
                    ))}
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
                <div className="avatar">JP</div>
                <div className="user-meta">
                  <span className="user-name">Juan Pérez</span>
                  <span className="user-role">Encargado de Depósito</span>
                </div>
                <svg className="chev" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isUserOpen && (
                <div className="dropdown-panel user-dropdown open">
                  <div className="user-dropdown-head">
                    <div className="name">Juan Pérez</div>
                    <div className="role">Encargado de Depósito · Tienda Central</div>
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
                      onClick={() => {
                        setIsUserOpen(false);
                        alert('Sesión cerrada.');
                      }}
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

        {/* CONTENIDO PRINCIPAL */}
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/Catalogo_de_productos" element={<Catalogo_de_productos />} />
            <Route path="/Inventario" element={<Inventario />} />
            <Route path="/Movimientos" element={<Movimientos />} />
            <Route path="/Alertas_de_stock" element={<Alertas_de_stock />} />
            <Route path="/Detalle_producto" element={<Detalle_producto />} />
            <Route path="/Perfil" element={<Perfil />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;