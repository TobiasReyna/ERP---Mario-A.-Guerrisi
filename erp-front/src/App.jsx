import { useState } from 'react';
import { NavLink, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Catalogo_de_productos from './pages/Catalogo_de_productos';
import Inventario from './pages/Inventario';
import Alertas_de_stock from './pages/Alertas_de_stock';
import Depositos from './pages/Depositos';
import Configuracion from './pages/Configuracion';
import Usuarios from './pages/Usuarios';
import Movimientos from './pages/Movimientos';
import Detalle_producto from './pages/Detalle_producto';
import Modal from './components/Modal';

const ROUTE_INFO = {
  '/': { title: 'Dashboard', subtitle: 'Resumen general del inventario y el catálogo' },
  '/Catalogo_de_productos': { title: 'Catálogo de Productos', subtitle: 'Gestión y listado de instrumentos y accesorios' },
  '/Inventario': { title: 'Inventario', subtitle: 'Control de existencias y niveles de stock' },
  '/Movimientos': { title: 'Movimientos', subtitle: 'Registro de entradas, salidas y transferencias' },
  '/Alertas_de_stock': { title: 'Alertas de Stock', subtitle: 'Productos por debajo del nivel mínimo operativo' },
  '/Depositos': { title: 'Depósitos', subtitle: 'Ubicaciones físicas y asignación de stock' },
  '/Configuracion': { title: 'Configuración', subtitle: 'Parámetros del sistema y preferencias' },
  '/Usuarios': { title: 'Usuarios', subtitle: 'Gestión de accesos, roles y permisos' },
  '/Detalle_producto': { title: 'Detalle de Producto', subtitle: 'Ficha técnica y desglose por depósito' },
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Estados interactivos del Topbar
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const currentRouteInfo = ROUTE_INFO[location.pathname] || {
    title: 'Sistema ERP',
    subtitle: 'Mario A. Guerrisi Instrumentos Musicales',
  };

  const handleSearchSubmit = (e) => {
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
            Catálogo de productos
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
            Alertas de stock
          </NavLink>

          <NavLink
            to="/Depositos"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21V9l9-6 9 6v12" />
              <path d="M9 21v-6h6v6" />
            </svg>
            Depósitos
          </NavLink>
        </nav>

        <nav className="nav-group">
          <div className="nav-group-label">Administración</div>

          <NavLink
            to="/Configuracion"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
            Configuración
          </NavLink>

          <NavLink
            to="/Usuarios"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Usuarios
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">
            Mario A. Guerrisi<br />
            Instrumentos Musicales &copy; 2026
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
            {/* BUSCADOR GLOBAL */}
            <div className="global-search">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Buscar productos, SKU, movimientos…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchSubmit}
              />
            </div>

            {/* NOTIFICACIONES */}
            <div className="topbar-right-item">
              <button
                className="icon-btn"
                aria-label="Notificaciones"
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  setIsUserMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="dot"></span>
              </button>

              {isNotifOpen && (
                <div className="topbar-dropdown notif-dropdown">
                  <div className="notif-header">
                    <span>Notificaciones</span>
                    <span className="badge badge-red"><span className="badge-dot"></span>3 Nuevas</span>
                  </div>
                  <div
                    className="notif-item"
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate('/Alertas_de_stock');
                    }}
                  >
                    <div>
                      <div className="notif-title">Stock crítico: Pearl Export Series</div>
                      <div className="notif-time">Quedan 2 unidades en Depósito Central</div>
                    </div>
                  </div>
                  <div
                    className="notif-item"
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate('/Alertas_de_stock');
                    }}
                  >
                    <div>
                      <div className="notif-title">Stock crítico: Yamaha YTR-2330</div>
                      <div className="notif-time">0 unidades en Depósito Sur</div>
                    </div>
                  </div>
                  <div
                    className="notif-item"
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate('/Movimientos');
                    }}
                  >
                    <div>
                      <div className="notif-title">Transferencia pendiente</div>
                      <div className="notif-time">Cort AD810: Norte → Sur</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AYUDA / INFORMACIÓN */}
            <button
              className="icon-btn"
              aria-label="Ayuda"
              onClick={() => setIsHelpOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </button>

            {/* MENÚ DE USUARIO */}
            <div className="topbar-right-item">
              <div
                className="user-menu"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  setIsNotifOpen(false);
                }}
              >
                <div className="avatar">MG</div>
                <div className="user-meta">
                  <span className="user-name">Administrador</span>
                  <span className="user-role">Depósito Central</span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              {isUserMenuOpen && (
                <div className="topbar-dropdown user-dropdown">
                  <div className="user-dropdown-header">
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Mario A. Guerrisi</div>
                    <div className="email">admin@guerrisi-erp.com</div>
                  </div>

                  <button
                    className="user-menu-item"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/Configuracion');
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
                    Configuración
                  </button>

                  <button
                    className="user-menu-item"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/Usuarios');
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    Usuarios y Permisos
                  </button>

                  <button
                    className="user-menu-item danger"
                    onClick={() => {
                      alert('Sesión cerrada.');
                      setIsUserMenuOpen(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/Catalogo_de_productos" element={<Catalogo_de_productos />} />
            <Route path="/Inventario" element={<Inventario />} />
            <Route path="/Alertas_de_stock" element={<Alertas_de_stock />} />
            <Route path="/Depositos" element={<Depositos />} />
            <Route path="/Configuracion" element={<Configuracion />} />
            <Route path="/Usuarios" element={<Usuarios />} />
            <Route path="/Movimientos" element={<Movimientos />} />
            <Route path="/Detalle_producto" element={<Detalle_producto />} />
          </Routes>
        </main>
      </div>

      {/* MODAL DE AYUDA */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Centro de Ayuda y Atajos"
        footer={
          <button className="btn btn-primary" onClick={() => setIsHelpOpen(false)}>
            Entendido
          </button>
        }
      >
        <div>
          <h4 style={{ marginBottom: '8px' }}>Sistema ERP — Mario A. Guerrisi</h4>
          <p style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: '1.5', marginBottom: '16px' }}>
            Plataforma integral para control de inventario multi-depósito, gestión de catálogo musical y trazabilidad de movimientos.
          </p>

          <h4 style={{ marginBottom: '8px' }}>Atajos de Navegación</h4>
          <ul style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: '1.8' }}>
            <li><strong>Búsqueda global:</strong> Escribí en el buscador superior y presioná Enter para ir al catálogo[cite: 2, 6].</li>
            <li><strong>Cerrar modales:</strong> Podés presionar la tecla <code>Escape</code> o hacer clic fuera de la ventana.</li>
            <li><strong>Notificaciones:</strong> Hacé clic en la campana para ver alertas de quiebre de stock[cite: 2, 5].</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

export default App;