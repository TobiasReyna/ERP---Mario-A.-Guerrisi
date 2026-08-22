import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'

//import './App.css';

import Dashboard from './pages/Dashboard';
import Catalogo_de_productos from './pages/Catalogo_de_productos';
import Inventario from './pages/Inventario';
import Alertas_de_stock from './pages/Alertas_de_stock';
import Depositos from './pages/Depositos';
import Configuracion from './pages/Configuracion';
import Usuarios from './pages/Usuarios';
import Movimientos from './pages/Movimientos'

function App() {
  

  const navigate = useNavigate();
  const location = useLocation(); //pie a la funcionalidad de que un boton se vuelva rojo. Es la base para que cambie de color. Pero no funciona esto.

  return (
    <body>

    <div class="app">


      <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
      <div class="brand-text">
        <span class="brand-name">Mario A. Guerrisi</span>
        <span class="brand-sub">Inventario</span>
      </div>
    </div>

    <nav class="nav-group">
      <div class="nav-group-label">Navegación</div>

      
      <button class="nav-item active" data-view="dashboard" onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
        Dashboard
      </button>
      

      <button class="nav-item" data-view="catalog" onClick={() => navigate('/Catalogo_de_productos')}>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3v5.59a2 2 0 0 0 .59 1.41l9.59 9.59a2 2 0 0 0 2.82 0l3.59-3.59a2 2 0 0 0 0-2.59Z"/><circle cx="8" cy="8" r="1.2"/></svg>
        Catálogo de productos
      </button>

      <button class="nav-item" data-view="inventory" onClick={() => navigate('/Inventario')}>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
        Inventario
      </button>

      <button class="nav-item" data-view="movements" onClick={() => navigate('/Movimientos')}>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h13l-3-3M17 17H4l3 3"/></svg>
        Movimientos
      </button>

      <button class="nav-item" data-view="alerts" onClick={() => navigate('/Alertas_de_stock')}>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        Alertas de stock
      </button>

      <button class="nav-item" data-view="warehouses" onClick={() => navigate('/Depositos')}>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
        Depósitos
      </button>
    </nav>

    <nav class="nav-group">
      <div class="nav-group-label">Administración</div>

      <button class="nav-item" data-view="settings" onClick={() => navigate('/Configuracion')}>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
        Configuración
      </button>

      <button class="nav-item" data-view="users" onClick={() => navigate('/Usuarios')}>
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Usuarios
      </button>

    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-footer-text">Mario A. Guerrisi<br></br>Instrumentos Musicales &copy; 2026</div>
    </div>
      </aside>



  <div class="main">


      <header class="topbar">
      <div class="topbar-left">
        <h1 class="topbar-title" id="topbar-title">Dashboard</h1>
        <span class="topbar-subtitle" id="topbar-subtitle">Resumen general del inventario y el catálogo</span>
      </div>
      <div class="topbar-right">
        <div class="global-search">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Buscar productos, SKU, movimientos…"></input>
        </div>
        <button class="icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="dot"></span>
        </button>
        <button class="icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </button>
        <div class="user-menu">
          <div class="avatar">MG</div>
          <div class="user-meta">
            <span class="user-name">Administrador</span>
            <span class="user-role">Depósito Central</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
          </header>

          <main ClassName="content">
        <div class="stats-grid">

      </div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/Catalogo_de_productos" element={<Catalogo_de_productos />} />
          <Route path="/Inventario" element={<Inventario />} />
          <Route path="/Alertas_de_stock" element={<Alertas_de_stock />} />
          <Route path="/Depositos" element={<Depositos />} />
          <Route path="/Configuracion" element={<Configuracion />} />
          <Route path="/Usuarios" element={<Usuarios />} />
          <Route path="/Movimientos" element={<Movimientos />} />
        </Routes>
      </main>


  </div>

</div>



      </body>
  );
}

export default App;
