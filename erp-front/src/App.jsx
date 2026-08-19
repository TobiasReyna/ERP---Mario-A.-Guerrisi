import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Dashboard from './pages/Dashboard';
import Catalogo_de_productos from './pages/Catalogo_de_productos';
import Inventario from './pages/Inventario';
import Alertas_de_stock from './pages/Alertas_de_stock';
import Depositos from './pages/Depositos';
import Configuracion from './pages/Configuracion';
import Usuarios from './pages/Usuarios';

function App() {

  return (
    <>
      <BrowserRouter>

        {/* Acá irá el menú lateral de navegación */}

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/Catalogo_De_Productos" element={<Catalogo_de_productos />} />
          <Route path="/Inventario" element={<Inventario />} />
          <Route path="/Alertas_de_stock" element={<Alertas_de_stock />} />
          <Route path="/Depositos" element={<Depositos />} />
          <Route path="/Configuracion" element={<Configuracion />} />
          <Route path="/Usuarios" element={<Usuarios />} />
        </Routes>

      </BrowserRouter>
    </>
  );
}

export default App;
