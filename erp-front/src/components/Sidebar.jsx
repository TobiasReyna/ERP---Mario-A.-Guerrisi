import React from 'react';
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
  FileText 
} from 'lucide-react';

const Sidebar = ({ unreadCount }) => {
  const { user } = useAuth();
  const userRole = user?.rol;

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
    }
  ];

  function TagIcon(props) {
    return <Package {...props} />;
  }

  return (
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

      {MENU_ITEMS.map((group, idx) => {
        // Filtrar los ítems a los que el rol actual tiene acceso
        const allowedItems = group.items.filter(item =>
          userRole === ROLES.ADMIN || item.rolesAllowed.includes(userRole)
        );

        if (allowedItems.length === 0) return null;

        return (
          <nav key={idx} className="nav-group">
            <div className="nav-group-label">{group.group}</div>
            
            {allowedItems.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={itemIdx}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} strokeWidth={2} />
                  {item.title}
                  {item.badge > 0 && <span className="nav-item-badge">{item.badge}</span>}
                </NavLink>
              );
            })}
          </nav>
        );
      })}

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">
          Mario A. Guerrisi<br />
          Instrumentos Musicales &copy; 2026<br />
          Sprint 1 · v1.1
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
