import { useState, useEffect, useMemo } from 'react';
import Modal2 from '../components/Modal2';
import { supabase } from '../config/supabaseClient';

function Movimientos() {
  const [allMovements, setAllMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filtros
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedWarehouse, setSelectedWarehouse] = useState('Todos');
  const [selectedUser, setSelectedUser] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast confirmación
  const [confirmToast, setConfirmToast] = useState(null);

  // Modal registrar movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Catálogos maestros
  const [dbFetchProd, setDbFetchProd] = useState([]);
  const [dbFetchDepo, setDbFetchDepo] = useState([]);
  const [dbFetchUsu, setDbFetchUsu] = useState([]);
  const [dbFetchMot, setDbFetchMot] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // =========================================================================
  // 1. CARGA DE HISTORIAL (AJUSTES + TRANSFERENCIAS)
  // =========================================================================
  const fetchAllMovements = async () => {
    setIsLoading(true);
    try {
      const [artRes, depRes, usuRes, motRes, ajRes, trRes] = await Promise.all([
        supabase.from('articulos').select('id, descripcion, modelo'),
        supabase.from('depositos').select('id, nombre'),
        supabase.from('usuarios').select('id, nombre'),
        supabase.from('motivos_ajustes').select('id, nombre'),
        supabase.from('ajustes_stock').select('*'),
        supabase.from('transferencias_stock').select('*'),
      ]);

      const artMap = new Map((artRes.data || []).map((a) => [a.id, a]));
      const depMap = new Map((depRes.data || []).map((d) => [d.id, d.nombre]));
      const usuMap = new Map((usuRes.data || []).map((u) => [u.id, u.nombre]));
      const motMap = new Map((motRes.data || []).map((m) => [m.id, m.nombre]));

      const lista = [];

      // A. Mapeo de Ajustes (Tienen stock anterior y nuevo)
      if (ajRes.data) {
        ajRes.data.forEach((a) => {
          const dateObj = new Date(a.fecha_hora_registro);
          const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

          const art = artMap.get(a.articulo_id);
          const depNombre = depMap.get(a.deposito_id) || 'Depósito';
          const usuNombre = usuMap.get(a.usuario_id) || 'Administrador de Sistema';
          const motNombre = motMap.get(a.motivo_id) || 'Ajuste de inventario';

          const cantAnt = a.cantidad_anterior ?? 0;
          const cantNue = a.cantidad_nueva ?? 0;
          const delta = cantNue - cantAnt;
          const tipoLabel = delta >= 0 ? 'Ajuste positivo' : 'Ajuste negativo';

          lista.push({
            id: `aj-${a.id}`,
            rawDate: dateObj,
            date: dateFormatted,
            product: art?.descripcion || 'Producto no especificado',
            model: art?.modelo || 'Estándar',
            type: tipoLabel,
            warehouse: depNombre,
            qty: delta >= 0 ? `+${delta}` : `${delta}`,
            reason: motNombre,
            user: usuNombre,
            stockChange: `${cantAnt} → ${cantNue}`,
          });
        });
      }

      // B. Mapeo de Transferencias
      if (trRes.data) {
        trRes.data.forEach((t) => {
          const dateObj = new Date(t.fecha_hora_registro);
          const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

          const art = artMap.get(t.articulo_id);
          const origen = depMap.get(t.deposito_origen_id) || 'Origen';
          const destino = depMap.get(t.deposito_destino_id) || 'Destino';
          const usuNombre = usuMap.get(t.usuario_id) || 'Usuario de Sistema';
          const motNombre = motMap.get(t.motivo_id) || 'Transferencia';

          const isSameWarehouse = t.deposito_origen_id === t.deposito_destino_id;
          const warehouseDisplay = isSameWarehouse ? origen : `${origen} → ${destino}`;

          lista.push({
            id: `tr-${t.id}`,
            rawDate: dateObj,
            date: dateFormatted,
            product: art?.descripcion || 'Producto no especificado',
            model: art?.modelo || 'Estándar',
            type: 'Transferencia',
            warehouse: warehouseDisplay,
            qty: `${t.cantidad}`,
            reason: motNombre,
            user: usuNombre,
            stockChange: '-',
          });
        });
      }

      lista.sort((a, b) => b.rawDate - a.rawDate);
      setAllMovements(lista);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 2. CARGA DE CATÁLOGOS MAESTROS
  // =========================================================================
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [pRes, dRes, uRes, mRes] = await Promise.all([
          supabase.from('articulos').select('*').eq('estado', true),
          supabase.from('depositos').select('*'),
          supabase.from('usuarios').select('*'),
          supabase.from('motivos_ajustes').select('*'),
        ]);

        if (pRes.data) setDbFetchProd(pRes.data);
        if (dRes.data) setDbFetchDepo(dRes.data);
        if (uRes.data) setDbFetchUsu(uRes.data);
        if (mRes.data) setDbFetchMot(mRes.data);
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };

    loadCatalogs();
    fetchAllMovements();
  }, []);

  // =========================================================================
  // 3. FILTRADO REACTIVO
  // =========================================================================
  const filteredMovements = useMemo(() => {
    return allMovements.filter((mov) => {
      const matchesType =
        selectedType === 'Todos' ||
        (selectedType === 'Entrada' && mov.type === 'Ajuste positivo') ||
        (selectedType === 'Salida' && mov.type === 'Ajuste negativo') ||
        mov.type.toLowerCase().includes(selectedType.toLowerCase());

      const matchesWarehouse =
        selectedWarehouse === 'Todos' ||
        mov.warehouse.toLowerCase().includes(selectedWarehouse.toLowerCase());

      const matchesUser =
        selectedUser === 'Todos' || mov.user === selectedUser;

      const matchesSearch =
        searchQuery.trim() === '' ||
        mov.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mov.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mov.model.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesType && matchesWarehouse && matchesUser && matchesSearch;
    });
  }, [allMovements, selectedType, selectedWarehouse, selectedUser, searchQuery]);

  const showToast = (msg) => {
    setConfirmToast(msg);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // =========================================================================
  // 5. REGISTRO SEGURO MULTIPRODUCTO A TRAVÉS DEL BACKEND (Bypasea RLS)
  // =========================================================================
  const handleConfirmMultiProductMovement = async ({ headerData, productos }) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { deposito, tipoMovimiento, responsable } = headerData;

      for (const item of productos) {
        // 1. Obtener existencia actual del artículo en ese depósito
        const { data: existData } = await supabase
          .from('existencias')
          .select('cantidad')
          .eq('articulo_id', item.producto)
          .eq('deposito_id', deposito)
          .maybeSingle();

        const currentStock = existData?.cantidad ?? 0;
        let finalStock = currentStock;
        const cant = Number(item.cantidad) || 0;

        if (tipoMovimiento === 'entrada') {
          finalStock = currentStock + cant;
        } else if (tipoMovimiento === 'salida') {
          if (currentStock < cant) {
            const artInfo = dbFetchProd.find((p) => p.id === item.producto);
            const prodName = artInfo ? artInfo.descripcion : 'seleccionado';
            throw new Error(`Stock insuficiente para "${prodName}". Stock actual: ${currentStock}, requerido: ${cant}.`);
          }
          finalStock = currentStock - cant;
        } else if (tipoMovimiento === 'ajuste') {
          finalStock = cant;
        }

        // 2. Registrar en backend (ajustes_stock)
        const res = await fetch('http://localhost:3001/api/stock/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articulo_id: item.producto,
            deposito_id: deposito,
            cantidad_anterior: Number(currentStock),
            cantidad_nueva: Number(finalStock),
            motivo_id: item.motivo || (dbFetchMot.length > 0 ? dbFetchMot[0].id : null),
            usuario_id: responsable,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || json.message || 'Error al registrar el ajuste en el backend.');
        }

        // 3. Actualizar tabla existencias en Supabase
        if (existData) {
          await supabase
            .from('existencias')
            .update({ cantidad: Number(finalStock) })
            .eq('articulo_id', item.producto)
            .eq('deposito_id', deposito);
        } else {
          await supabase.from('existencias').insert([
            {
              articulo_id: item.producto,
              deposito_id: deposito,
              cantidad: Number(finalStock),
            },
          ]);
        }
      }

      await fetchAllMovements();
      setIsModalOpen(false);
      showToast(`Movimiento registrado con éxito para ${productos.length} producto(s).`);
    } catch (err) {
      alert(`Error en la transacción: ${err.message}`);
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        alert('❌ Error de conexión: No se pudo contactar con el backend (http://localhost:3001). Asegúrate de que el servidor Express esté iniciado ejecutando "node server.js" en la carpeta erp-backend.');
      } else {
        alert(`❌ Error en la transacción: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* ENCABEZADO */}
      <div className="section-heading">
        <div>
          <h2>Movimientos y ajustes de stock</h2>
          <span className="desc">
            Entradas, salidas, ajustes y transferencias entre Tienda Central y Galería Margalef
          </span>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Registrar movimiento
        </button>
      </div>

      {/* CONFIRM BANNER */}
      {confirmToast && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{confirmToast}</span>
        </div>
      )}

      {/* FILTROS */}
      <div className="filter-bar">
        <div className="select-field">
          Tipo:
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option>Todos</option>
            <option>Entrada</option>
            <option>Salida</option>
            <option>Ajuste positivo</option>
            <option>Ajuste negativo</option>
            <option>Transferencia</option>
          </select>
        </div>

        <div className="select-field">
          Depósito:
          <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
            <option value="Todos">Todos los depósitos</option>
            {dbFetchDepo.map((d) => (
              <option key={d.id} value={d.nombre}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="select-field">
          Usuario:
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="Todos">Todos los usuarios</option>
            {dbFetchUsu.map((u) => (
              <option key={u.id} value={u.nombre}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="search-input" style={{ maxWidth: '240px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar producto o modelo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA DE MOVIMIENTOS */}
      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Modelo</th>
                <th>Depósito</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
                <th>Stock ant. → nuevo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                    Cargando movimientos...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                    No se encontraron movimientos registrados bajo los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td>{mov.date}</td>
                    <td className="cell-strong">{mov.product}</td>
                    <td>{mov.model}</td>
                    <td>{mov.warehouse}</td>
                    <td className="cell-strong">{mov.qty}</td>
                    <td>{mov.reason}</td>
                    <td>{mov.user}</td>
                    <td
                      className="cell-mono"
                      style={{
                        fontWeight: '700',
                        color: mov.stockChange !== '-' ? 'var(--gray-900)' : 'var(--gray-400)',
                      }}
                    >
                      {mov.stockChange}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR MOVIMIENTO MULTIPRODUCTO */}
      <Modal2
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmMultiProductMovement}
        depositos={dbFetchDepo}
        usuarios={dbFetchUsu}
        motivos={dbFetchMot}
        catalogoProductos={dbFetchProd}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default Movimientos;