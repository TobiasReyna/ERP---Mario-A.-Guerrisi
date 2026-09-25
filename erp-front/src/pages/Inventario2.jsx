import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import Modal2 from '../components/Modal2';
import { supabase } from '../config/supabaseClient';

function Inventario2() {
  // =========================================================================
  // ESTADOS PRINCIPALES
  // =========================================================================
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [activeDepositId, setActiveDepositId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [searchFilter, setSearchFilter] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Estados para Modal2 (Movimientos Multi-producto / Ajustes)
  const [usuarios, setUsuarios] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados Generales
  const [confirmBanner, setConfirmBanner] = useState(null);

  // Estados Modal Transferencia
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferData, setTransferData] = useState({
    origenId: '',
    destinoId: '',
    cantidad: 1,
    motivo: 'Rebalanceo de stock',
    responsable: 'Juan Pérez',
  });
  const [isTransferring, setIsTransferring] = useState(false);

  // =========================================================================
  // FUNCIONES DE APOYO
  // =========================================================================
  const showConfirm = (text) => {
    setConfirmBanner(text);
    setTimeout(() => setConfirmBanner(null), 4500);
  };

  const calculateDepositStatus = (qty) => {
    if (qty <= 0) return 'Crítico';
    if (qty <= 2) return 'Reposición';
    return 'Normal';
  };

  const getProductStockInDeposit = (item, dep) => {
    if (!item || !dep) return 0;
    if (item.stocksPorDeposito) {
      if (item.stocksPorDeposito[dep.id] !== undefined) {
        return Number(item.stocksPorDeposito[dep.id]) || 0;
      }
      if (item.stocksPorDeposito[dep.nombre] !== undefined) {
        return Number(item.stocksPorDeposito[dep.nombre]) || 0;
      }
    }
    const depName = (dep.nombre || '').toLowerCase();
    if (depName.includes('central') && item.central !== undefined) {
      return Number(item.central) || 0;
    }
    if (depName.includes('margalef') && item.margalef !== undefined) {
      return Number(item.margalef) || 0;
    }
    return 0;
  };

  // =========================================================================
  // CARGA DE DATOS
  // =========================================================================
  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/stock/inventory');
      const data = await res.json();
      if (data && data.data) {
        setItems(data.data);
      }
    } catch (err) {
      console.error('Error cargando inventario:', err);
    }
  };

  useEffect(() => {
    // 1. Inventario General
    fetch('http://localhost:3001/api/stock/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) {
          setItems(data.data);
          if (data.data.length > 0) setSelectedProductId(data.data[0].id);
        }
      })
      .catch((err) => console.error('Error fetching inventory:', err));

    // 2. Categorías
    fetch('http://localhost:3001/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) setCategorias(data.data);
      })
      .catch((err) => console.error('Error cargando categorías:', err));

    // 3. Depósitos
    fetch('http://localhost:3001/api/deposits')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data && data.data.length > 0) {
          setDepositos(data.data);
          setActiveDepositId(data.data[0].id);
          setTransferData((prev) => ({
            ...prev,
            origenId: data.data[0].id,
            destinoId: data.data[1] ? data.data[1].id : data.data[0].id,
          }));
        } else {
          throw new Error('Sin datos de depósitos');
        }
      })
      .catch((err) => {
        console.error('Error fetching deposits:', err);
        const fallbackDeps = [
          { id: '1', nombre: 'Tienda Central' },
          { id: '2', nombre: 'Galería Margalef' },
        ];
        setDepositos(fallbackDeps);
        setActiveDepositId(fallbackDeps[0].id);
        setTransferData((prev) => ({
          ...prev,
          origenId: fallbackDeps[0].id,
          destinoId: fallbackDeps[1].id,
        }));
      });

    // 4. Catálogos Maestros (Supabase)
    const loadMasterCatalogs = async () => {
      try {
        const [uRes, mRes, pRes] = await Promise.all([
          supabase.from('usuarios').select('id, nombre'),
          supabase.from('motivos_ajustes').select('id, nombre'),
          supabase.from('articulos').select('id, descripcion, modelo').eq('estado', true),
        ]);

        setUsuarios(uRes.data?.length > 0 ? uRes.data : [
          { id: 'usr-1', nombre: 'Juan Pérez' },
          { id: 'usr-2', nombre: 'María Gómez' },
          { id: 'usr-3', nombre: 'Carlos Ruiz' },
        ]);

        setMotivos(mRes.data?.length > 0 ? mRes.data : [
          { id: 'mot-1', nombre: 'Rebalanceo de stock' },
          { id: 'mot-2', nombre: 'Conteo físico' },
          { id: 'mot-3', nombre: 'Rotura / Merma' },
        ]);

        if (pRes.data && pRes.data.length > 0) {
          setCatalogoProductos(pRes.data);
        }
      } catch (err) {
        console.error('Error cargando catálogos maestros:', err);
      }
    };

    loadMasterCatalogs();
  }, []);

  // =========================================================================
  // HOOKS MEMOIZADOS
  // =========================================================================
  const activeDeposit = useMemo(() => {
    return depositos.find((d) => String(d.id) === String(activeDepositId)) || depositos[0] || { id: '1', nombre: 'Depósito' };
  }, [depositos, activeDepositId]);

  const origenDeposit = useMemo(() => {
    return depositos.find((d) => String(d.id) === String(transferData.origenId)) || depositos[0];
  }, [depositos, transferData.origenId]);

  const destinoDeposit = useMemo(() => {
    return depositos.find((d) => String(d.id) === String(transferData.destinoId)) || depositos[1] || depositos[0];
  }, [depositos, transferData.destinoId]);

  const selectedTransferProduct = useMemo(() => {
    return items.find((it) => String(it.id) === String(selectedProductId)) || items[0] || null;
  }, [items, selectedProductId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = !selectedCategory || selectedCategory === 'Todas' || String(item.categoria_id) === String(selectedCategory);
      const stock = getProductStockInDeposit(item, activeDeposit);
      const status = calculateDepositStatus(stock);
      const matchStatus = selectedStatus === 'Todos' || status === selectedStatus;
      const query = searchFilter.trim().toLowerCase();
      const matchSearch =
        !query ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.marca && item.marca.toLowerCase().includes(query)) ||
        (item.modelo && item.modelo.toLowerCase().includes(query)) ||
        (item.code && item.code.toLowerCase().includes(query));

      return matchCategory && matchStatus && matchSearch;
    });
  }, [items, activeDeposit, selectedCategory, selectedStatus, searchFilter]);

  // Reseteo de página al filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [activeDepositId, selectedCategory, selectedStatus, searchFilter]);

  // Cálculos de Paginación
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, currentPage, rowsPerPage]);

  // =========================================================================
  // HANDLERS DE MOVIMIENTOS
  // =========================================================================
  const handleConfirmMovement = async ({ headerData, productos }) => {
    setIsSubmitting(true);
    try {
      const { deposito, tipoMovimiento, responsable } = headerData;

      for (const item of productos) {
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
            const artInfo = catalogoProductos.find((p) => p.id === item.producto);
            const prodName = artInfo ? artInfo.descripcion : 'seleccionado';
            throw new Error(`Stock insuficiente para "${prodName}". Stock actual: ${currentStock}, requerido: ${cant}.`);
          }
          finalStock = currentStock - cant;
        } else if (tipoMovimiento === 'ajuste') {
          finalStock = cant;
        }

        const res = await fetch('http://localhost:3001/api/stock/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articulo_id: item.producto,
            deposito_id: deposito,
            cantidad_anterior: Number(currentStock),
            cantidad_nueva: Number(finalStock),
            motivo_id: item.motivo || (motivos.length > 0 ? motivos[0].id : null),
            usuario_id: responsable,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Error al registrar el movimiento en el backend.');

        if (existData) {
          await supabase.from('existencias').update({ cantidad: Number(finalStock) }).eq('articulo_id', item.producto).eq('deposito_id', deposito);
        } else {
          await supabase.from('existencias').insert([{ articulo_id: item.producto, deposito_id: deposito, cantidad: Number(finalStock) }]);
        }
      }
      await fetchInventory();
      setIsModalOpen(false);
      showConfirm(`Movimiento registrado con éxito para ${productos.length} producto(s).`);
    } catch (err) {
      console.error('Error en el movimiento:', err);
      alert(`❌ Error en la transacción: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!selectedTransferProduct) return;

    const qty = Number(transferData.cantidad) || 0;
    if (qty <= 0) return alert('La cantidad a transferir debe ser mayor a 0.');
    if (transferData.origenId === transferData.destinoId) return alert('El depósito de origen y de destino no pueden ser el mismo.');

    const currentOriginStock = getProductStockInDeposit(selectedTransferProduct, origenDeposit);
    if (qty > currentOriginStock) return alert(`Stock insuficiente en ${origenDeposit.nombre}. Disponibles: ${currentOriginStock} uds.`);

    setIsTransferring(true);
    try {
      await fetch('http://localhost:3001/api/stock/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articulo_id: selectedTransferProduct.id,
          deposito_origen_id: origenDeposit.id,
          deposito_destino_id: destinoDeposit.id,
          cantidad: qty,
          usuario_id: transferData.responsable,
        }),
      });

      setItems((prev) =>
        prev.map((it) => {
          if (String(it.id) !== String(selectedTransferProduct.id)) return it;
          const updatedStocks = { ...(it.stocksPorDeposito || {}) };
          const origStock = getProductStockInDeposit(it, origenDeposit);
          const destStock = getProductStockInDeposit(it, destinoDeposit);

          updatedStocks[origenDeposit.id] = Math.max(0, origStock - qty);
          updatedStocks[origenDeposit.nombre] = Math.max(0, origStock - qty);
          updatedStocks[destinoDeposit.id] = destStock + qty;
          updatedStocks[destinoDeposit.nombre] = destStock + qty;

          return {
            ...it,
            central: origenDeposit.nombre?.includes('Central') ? Math.max(0, (it.central || 0) - qty) : destinoDeposit.nombre?.includes('Central') ? (it.central || 0) + qty : it.central,
            margalef: origenDeposit.nombre?.includes('Margalef') ? Math.max(0, (it.margalef || 0) - qty) : destinoDeposit.nombre?.includes('Margalef') ? (it.margalef || 0) + qty : it.margalef,
            stocksPorDeposito: updatedStocks,
          };
        })
      );

      setIsTransferModalOpen(false);
      showConfirm(`Transferencia de ${qty} unidad(es) de ${origenDeposit.nombre} a ${destinoDeposit.nombre} registrada correctamente.`);
    } catch (err) {
      console.error('Error al transferir:', err);
      alert('❌ Error de conexión o transacción.');
    } finally {
      setIsTransferring(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Normal') return <span className="badge badge-green"><span className="badge-dot"></span>Normal</span>;
    if (status === 'Reposición') return <span className="badge badge-amber"><span className="badge-dot"></span>Reposición</span>;
    return <span className="badge badge-red"><span className="badge-dot"></span>Crítico</span>;
  };

  return (
    <div>
      {confirmBanner && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{confirmBanner}</span>
        </div>
      )}

      {/* CABECERA: TABS DE DEPÓSITO Y ACCIONES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="warehouse-tabs" style={{ marginBottom: 0 }}>
          {depositos.map((dep) => (
            <button
              key={dep.id}
              className={`warehouse-tab ${activeDepositId === dep.id ? 'active' : ''}`}
              onClick={() => setActiveDepositId(dep.id)}
            >
              {dep.nombre}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-outline"
            onClick={() => setIsTransferModalOpen(true)}
          >
            Transferir stock
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            + Registrar movimiento
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="filter-bar">
        <div className="search-input" style={{ maxWidth: '280px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por artículo, modelo o código…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="select-field">
          Categoría:
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
        </div>

        <div className="select-field">
          Estado:
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option>Todos</option>
            <option>Normal</option>
            <option>Reposición</option>
            <option>Crítico</option>
          </select>
        </div>
      </div>

      {/* TABLA DE INVENTARIO CON SOMBREADO EN STOCK CERO */}
      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código interno</th>
                <th>Categoría</th>
                <th style={{ textAlign: 'right' }}>Stock en {activeDeposit.nombre}</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-500)' }}>
                    No se encontraron productos en <strong>{activeDeposit.nombre}</strong> con los filtros actuales.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const stock = getProductStockInDeposit(item, activeDeposit);
                  const status = calculateDepositStatus(stock);
                  const productName = `${item.marca || ''} ${item.modelo || ''}`.trim() || item.name;
                  const isZero = stock <= 0;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: isZero ? '#f8fafc' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td className="cell-strong" style={{ color: isZero ? '#64748b' : 'var(--ink)' }}>
                        {productName}
                      </td>
                      <td className="cell-mono" style={{ color: isZero ? '#94a3b8' : 'inherit' }}>
                        {item.code || '—'}
                      </td>
                      <td style={{ color: isZero ? '#94a3b8' : 'inherit' }}>
                        {item.category || 'Sin categoría'}
                      </td>
                      <td
                        className={`stock-cell ${isZero ? 'zero' : stock <= 2 ? 'low' : ''}`}
                        style={{ textAlign: 'right' }}
                      >
                        <strong>{stock}</strong> <span>uds.</span>
                      </td>
                      <td>{getStatusBadge(status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PAGINACIÓN */}
        {filteredItems.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              borderTop: '1px solid var(--border-color, #e5e7eb)',
              fontSize: '12.5px',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '10px',
              background: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Filas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span style={{ marginLeft: '6px' }}>
                Mostrando{' '}
                <strong style={{ color: '#0f172a' }}>
                  {(currentPage - 1) * rowsPerPage + 1}
                </strong>{' '}
                -{' '}
                <strong style={{ color: '#0f172a' }}>
                  {Math.min(currentPage * rowsPerPage, filteredItems.length)}
                </strong>{' '}
                de <strong style={{ color: '#0f172a' }}>{filteredItems.length}</strong> artículos
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                ← Anterior
              </button>

              <span style={{ fontWeight: '700', padding: '0 6px', color: '#0f172a' }}>
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1,
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL TRANSFERENCIA ENTRE DEPÓSITOS */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transferir stock entre depósitos"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsTransferModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleConfirmTransfer}>
              {isTransferring ? 'Transfiriendo...' : 'Confirmar transferencia'}
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmTransfer}>
          <div className="form-row">
            <div className="form-field full">
              <label>Producto *</label>
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                {items.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {`${prod.marca || ''} ${prod.modelo || ''}`.trim() || prod.name} ({prod.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Depósito origen *</label>
              <select
                value={transferData.origenId}
                onChange={(e) => setTransferData({ ...transferData, origenId: e.target.value })}
              >
                {depositos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Depósito destino *</label>
              <select
                value={transferData.destinoId}
                onChange={(e) => setTransferData({ ...transferData, destinoId: e.target.value })}
              >
                {depositos
                  .filter((d) => d.id !== transferData.origenId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Cantidad a transferir *</label>
              <input
                type="number"
                min="1"
                value={transferData.cantidad}
                onChange={(e) =>
                  setTransferData({ ...transferData, cantidad: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL REGISTRAR MOVIMIENTO (AJUSTES) */}
      <Modal2
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmMovement}
        depositos={depositos}
        usuarios={usuarios}
        motivos={motivos}
        catalogoProductos={
          catalogoProductos.length > 0
            ? catalogoProductos
            : items.map((it) => ({
                id: it.id,
                descripcion: it.name || `${it.marca || ''} ${it.modelo || ''}`.trim(),
                modelo: it.modelo || '',
              }))
        }
        isSubmitting={isSubmitting}
        initialTipoMovimiento="ajuste"
        initialDeposito={activeDepositId}
      />
    </div>
  );
}

export default Inventario2;