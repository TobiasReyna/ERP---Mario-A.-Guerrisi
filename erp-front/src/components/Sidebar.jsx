import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import { 
  Package, 
  Tags, 
  Archive, 
  ArrowRightLeft, 
  Bell, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  FileText,
  Wallet 
} from 'lucide-react';

const Sidebar = ({ unreadCount }) => {
  const { user } = useAuth();
  const userRole = user?.rol;
  const [colapsado, setColapsado] = useState(false);

  function TagIcon(props) {
    return <Package {...props} />;
  }

  // Definición dinámica de ítems del menú con RBAC
  const MENU_ITEMS = [
    {
      group: 'Navegación',
      items: [
        {
          title: 'Catálogo',
          path: '/Catalogo_de_productos',
          icon: TagIcon,
          rolesAllowed: [ROLES.ADMIN, ROLES.DEPOSITO, ROLES.COMPRAS]
        },
        {
          title: 'Lista de Precios',
          path: '/Lista_Precios',
          icon: Tags,
          rolesAllowed: [ROLES.ADMIN, ROLES.COMPRAS]
        },
        {
          title: 'Inventario',
          path: '/Inventario',
          icon: Archive,
          rolesAllowed: [ROLES.ADMIN, ROLES.DEPOSITO, ROLES.CAJERO]
        },
        {
          title: 'Movimientos',
          path: '/Movimientos',
          icon: ArrowRightLeft,
          rolesAllowed: [ROLES.ADMIN, ROLES.DEPOSITO]
        },
        {
          title: 'Alertas y notificaciones',
          path: '/Alertas_de_stock',
          icon: Bell,
          rolesAllowed: [ROLES.ADMIN, ROLES.DEPOSITO, ROLES.COMPRAS],
          badge: unreadCount
        }
      ]
    },
    {
      group: 'Compras',
      items: [
        {
          title: 'Proveedores',
          path: '/Gestion_de_proveedores',
          icon: Users,
          rolesAllowed: [ROLES.ADMIN, ROLES.COMPRAS]
        },
        {
          title: 'Cotizaciones y OC',
          path: '/Cotizaciones_ordenes_compra',
          icon: ShoppingCart,
          rolesAllowed: [ROLES.ADMIN, ROLES.COMPRAS]
        },
        {
          title: 'Cuentas por Pagar',
          path: '/Cuentas_por_pagar',
          icon: CreditCard,
          rolesAllowed: [ROLES.ADMIN, ROLES.TESORERO]
        },
        {
          title: 'Comprobantes',
          path: '/registro-comprobantes',
          icon: FileText,
          rolesAllowed: [ROLES.ADMIN, ROLES.TESORERO, ROLES.COMPRAS]
        }
      ]
    },
    {
      group: 'Supervisión',
      items: [
        {
          title: 'Gestión de Cajas',
          path: '/Gestion_Cajas',
          icon: Wallet,
          rolesAllowed: [
            ROLES.ADMIN,
            ROLES.GERENTE,
            ROLES.COMPRAS,
          ],
        },
      ],
    },
  ];

  return (
    <aside 
        className="sidebar"
        style={{
          position: 'relative',
          width: colapsado ? '80px' : '260px',
          transition: 'width 0.3s ease-in-out',
          flexShrink: 0
        }}
    >
      {/* Botón Rojo Flotante de Alternancia */}
      <button
        onClick={() => setColapsado(!colapsado)}
        title={colapsado ? 'Expandir menú' : 'Contraer menú'}
        style={{
          position: 'absolute',
          right: '5px',
          top: '70px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          backgroundColor: '#dc2626',
          color: '#ffffff',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          fontWeight: 'bold',
          fontSize: '12px'
        }}
      >
        {colapsado ? '>>' : '<<'}
      </button>

      {/* Marca / Logo */}
      <div className="sidebar-brand" style={{ justifyContent: colapsado ? 'center' : 'flex-start' }}>
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        {!colapsado && (
          <div className="brand-text">
            <span className="brand-name">Mario A. Guerrisi</span>
            <span className="brand-sub">Inventario</span>
          </div>
        )}
      </div>

      {/* Elementos de Navegación */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {MENU_ITEMS.map((group, idx) => {
          const allowedItems = group.items.filter(item =>
            userRole === ROLES.ADMIN || item.rolesAllowed.includes(userRole)
          );

          if (allowedItems.length === 0) return null;

          return (
            <nav key={idx} className="nav-group">
              {!colapsado && <div className="nav-group-label">{group.group}</div>}
              
              {allowedItems.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={itemIdx}
                    to={item.path}
                    title={colapsado ? item.title : ''}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    style={{ justifyContent: colapsado ? 'center' : 'flex-start' }}
                  >
                    <Icon size={17} strokeWidth={2} />
                    {!colapsado && <span>{item.title}</span>}
                    {!colapsado && item.badge > 0 && (
                      <span className="nav-item-badge">{item.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          );
        })}
      </div>

      {/* Pie de Página */}
      {!colapsado && (
        <div className="sidebar-footer">
          <div className="sidebar-footer-text">
            Mario A. Guerrisi<br />
            Instrumentos Musicales &copy; 2026<br />
            Sprint 1 · v1.1
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;