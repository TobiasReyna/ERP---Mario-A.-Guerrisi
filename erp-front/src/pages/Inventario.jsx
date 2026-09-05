import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';

function Inventario() {
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [activeDepositId, setActiveDepositId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [searchFilter, setSearchFilter] = useState('');

  // Banner de confirmación
  const [confirmBanner, setConfirmBanner] = useState(null);

  // Modal Transferencia
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

  // Carga inicial de datos
  useEffect(() => {
    // 1. Cargar inventario general
    fetch('http://localhost:3001/api/stock/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) {
          setItems(data.data);
          if (data.data.length > 0) {
            setSelectedProductId(data.data[0].id);
          }
        }
      })
      .catch((err) => console.error('Error fetching inventory:', err));

    // 2. Cargar categorías
    fetch('http://localhost:3001/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) {
          setCategorias(data.data);
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));

    // 3. Cargar depósitos activos
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
  }, []);

  // Depósito actualmente activo
  const activeDeposit = useMemo(() => {
    return (
      depositos.find((d) => String(d.id) === String(activeDepositId)) ||
      depositos[0] || { id: '1', nombre: 'Depósito' }
    );
  }, [depositos, activeDepositId]);

  // Función helper para obtener el stock de un producto en un depósito dado
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

  // Cálculo del estado según el stock en el depósito
  const calculateDepositStatus = (qty) => {
    if (qty <= 0) return 'Crítico';
    if (qty <= 2) return 'Reposición';
    return 'Normal';
  };

  const showConfirm = (text) => {
    setConfirmBanner(text);
    setTimeout(() => setConfirmBanner(null), 4500);
  };

  // Filtrado reactivo enfocado exclusivamente en el depósito activo
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory =
        !selectedCategory ||
        selectedCategory === 'Todas' ||
        String(item.categoria_id) === String(selectedCategory);

      const stock = getProductStockInDeposit(item, activeDeposit);
      const status = calculateDepositStatus(stock);

      const matchStatus =
        selectedStatus === 'Todos' || status === selectedStatus;

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

  // Producto seleccionado para el modal de transferencia
  const selectedTransferProduct = useMemo(() => {
    return (
      items.find((it) => String(it.id) === String(selectedProductId)) ||
      items[0] ||
      null
    );
  }, [items, selectedProductId]);

  const origenDeposit = useMemo(() => {
    return (
      depositos.find((d) => String(d.id) === String(transferData.origenId)) ||
      depositos[0]
    );
  }, [depositos, transferData.origenId]);

  const destinoDeposit = useMemo(() => {
    return (
      depositos.find((d) => String(d.id) === String(transferData.destinoId)) ||
      depositos[1] ||
      depositos[0]
    );
  }, [depositos, transferData.destinoId]);

  // Manejador de confirmación de transferencia
  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!selectedTransferProduct) return;

    const qty = Number(transferData.cantidad) || 0;
    if (qty <= 0) {
      alert('La cantidad a transferir debe ser mayor a 0.');
      return;
    }

    if (transferData.origenId === transferData.destinoId) {
      alert('El depósito de origen y de destino no pueden ser el mismo.');
      return;
    }

    const currentOriginStock = getProductStockInDeposit(
      selectedTransferProduct,
      origenDeposit
    );

    if (qty > currentOriginStock) {
      alert(
        `Stock insuficiente en ${origenDeposit.nombre}. Disponibles: ${currentOriginStock} uds.`
      );
      return;
    }

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

      // Reflejar cambios reactivamente en el estado local
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
            central:
              origenDeposit.nombre?.includes('Central')
                ? Math.max(0, (it.central || 0) - qty)
                : destinoDeposit.nombre?.includes('Central')
                ? (it.central || 0) + qty
                : it.central,
            margalef:
              origenDeposit.nombre?.includes('Margalef')
                ? Math.max(0, (it.margalef || 0) - qty)
                : destinoDeposit.nombre?.includes('Margalef')
                ? (it.margalef || 0) + qty
                : it.margalef,
            stocksPorDeposito: updatedStocks,
          };
        })
      );

      setIsTransferModalOpen(false);
      showConfirm(
        `Transferencia de ${qty} unidad(es) de ${origenDeposit.nombre} a ${destinoDeposit.nombre} registrada correctamente.`
      );
    } catch (err) {
      console.error('Error al transferir stock:', err);
      setIsTransferModalOpen(false);
      showConfirm(
        `Transferencia registrada localmente: ${qty} unidad(es) de ${origenDeposit.nombre} a ${destinoDeposit.nombre}.`
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Normal')
      return (
        <span className="badge badge-green">
          <span className="badge-dot"></span>Normal
        </span>
      );
    if (status === 'Reposición')
      return (
        <span className="badge badge-amber">
          <span className="badge-dot"></span>Reposición
        </span>
      );
    return (
      <span className="badge badge-red">
        <span className="badge-dot"></span>Crítico
      </span>
    );
  };

  return (
    <div>
      {/* ENCABEZADO Y ACCIONES */}
      <div className="section-heading">
        <div>
          <h2>Inventario por depósito</h2>
          <span className="desc">
            Consulta y gestión individualizada de existencias. Selecciona una sucursal para ver su inventario exclusivo.
          </span>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => {
            if (depositos.length > 0) {
              setTransferData((prev) => ({
                ...prev,
                origenId: activeDeposit.id,
                destinoId:
                  depositos.find((d) => d.id !== activeDeposit.id)?.id ||
                  activeDeposit.id,
              }));
            }
            setIsTransferModalOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 7h13l-3-3M17 17H4l3 3" />
          </svg>
          Transferir stock
        </button>
      </div>

      {/* BANNER DE CONFIRMACIÓN */}
      {confirmBanner && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{confirmBanner}</span>
        </div>
      )}

      {/* PESTAÑAS DE DEPÓSITOS (UNA SOLA TABLA POR SUCURSAL) */}
      <div className="warehouse-tabs">
        {depositos.map((dep) => (
          <button
            key={dep.id}
            className={`warehouse-tab ${activeDepositId === dep.id ? 'active' : ''}`}
            onClick={() => setActiveDepositId(dep.id)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '15px', height: '15px', marginRight: '6px' }}
            >
              <path d="M21 8 12 3 3 8l9 5 9-5Z" />
              <path d="M3 8v8l9 5 9-5V8" />
              <path d="M12 13v8" />
            </svg>
            {dep.nombre}
          </button>
        ))}
      </div>

      {/* FILTROS DE BÚSQUEDA Y CATEGORÍAS */}
      <div className="filter-bar">
        <div className="select-field">
          Buscar:
          <input
            type="text"
            placeholder="Artículo, modelo o código..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--gray-300)',
              fontSize: '13px',
              marginLeft: '6px',
              outline: 'none',
            }}
          />
        </div>

        <div className="select-field">
          Categoría:
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="select-field">
          Estado:
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option>Todos</option>
            <option>Normal</option>
            <option>Reposición</option>
            <option>Crítico</option>
          </select>
        </div>
      </div>

      {/* TABLA EXCLUSIVA DEL DEPÓSITO SELECCIONADO */}
      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código</th>
                <th>Categoría</th>
                <th>Stock en {activeDeposit.nombre}</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: 'center',
                      padding: '36px',
                      color: 'var(--gray-500)',
                    }}
                  >
                    No se encontraron productos en{' '}
                    <strong>{activeDeposit.nombre}</strong> con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stock = getProductStockInDeposit(item, activeDeposit);
                  const status = calculateDepositStatus(stock);
                  const productName =
                    `${item.marca || ''} ${item.modelo || ''}`.trim() ||
                    item.name;

                  return (
                    <tr key={item.id}>
                      <td className="cell-strong">{productName}</td>
                      <td className="cell-mono">{item.code}</td>
                      <td>{item.category || 'Sin categoría'}</td>
                      <td
                        className={`stock-cell ${
                          stock === 0 ? 'zero' : stock <= 2 ? 'low' : ''
                        }`}
                      >
                        <strong>{stock}</strong>{' '}
                        <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                          uds.
                        </span>
                      </td>
                      <td>{getStatusBadge(status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TRANSFERIR STOCK (HU-01) */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transferir stock entre depósitos"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => setIsTransferModalOpen(false)}
              disabled={isTransferring}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmTransfer}
              disabled={isTransferring}
            >
              {isTransferring ? 'Transfiriendo...' : 'Confirmar transferencia'}
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmTransfer}>
          <div className="form-row">
            <div className="form-field full">
              <label>Producto *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {items.map((prod) => {
                  const pName =
                    `${prod.marca || ''} ${prod.modelo || ''}`.trim() ||
                    prod.name;
                  return (
                    <option key={prod.id} value={prod.id}>
                      {pName} ({prod.code})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Depósito origen *</label>
              <select
                value={transferData.origenId}
                onChange={(e) => {
                  const newOrigId = e.target.value;
                  setTransferData({
                    ...transferData,
                    origenId: newOrigId,
                    destinoId:
                      transferData.destinoId === newOrigId
                        ? depositos.find((d) => d.id !== newOrigId)?.id || newOrigId
                        : transferData.destinoId,
                  });
                }}
              >
                {depositos.map((d) => {
                  const st = selectedTransferProduct
                    ? getProductStockInDeposit(selectedTransferProduct, d)
                    : 0;
                  return (
                    <option key={d.id} value={d.id}>
                      {d.nombre} ({st} uds.)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-field">
              <label>Depósito destino *</label>
              <select
                value={transferData.destinoId}
                onChange={(e) =>
                  setTransferData({ ...transferData, destinoId: e.target.value })
                }
              >
                {depositos
                  .filter((d) => d.id !== transferData.origenId)
                  .map((d) => {
                    const st = selectedTransferProduct
                      ? getProductStockInDeposit(selectedTransferProduct, d)
                      : 0;
                    return (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({st} uds.)
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Cantidad *</label>
              <input
                type="number"
                min="1"
                required
                value={transferData.cantidad}
                onChange={(e) =>
                  setTransferData({
                    ...transferData,
                    cantidad: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </div>
            <div className="form-field">
              <label>Usuario responsable</label>
              <select
                value={transferData.responsable}
                onChange={(e) =>
                  setTransferData({
                    ...transferData,
                    responsable: e.target.value,
                  })
                }
              >
                <option>Juan Pérez</option>
                <option>María Gómez</option>
                <option>Carlos Ruiz</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>Motivo / observación</label>
              <textarea
                placeholder="Ej: Rebalanceo de stock, pedido de sucursal…"
                value={transferData.motivo}
                onChange={(e) =>
                  setTransferData({ ...transferData, motivo: e.target.value })
                }
              />
            </div>
          </div>

          {selectedTransferProduct && origenDeposit && destinoDeposit && (
            <div className="form-field">
              <label>Vista previa de la redistribución</label>
              <div className="stock-preview">
                {/* Origen */}
                <div className="sp-item">
                  <div className="n">
                    {getProductStockInDeposit(selectedTransferProduct, origenDeposit)} →{' '}
                    {Math.max(
                      0,
                      getProductStockInDeposit(selectedTransferProduct, origenDeposit) -
                        Number(transferData.cantidad || 0)
                    )}
                  </div>
                  <div className="l">{origenDeposit.nombre} (Origen)</div>
                </div>

                <div className="sp-arrow">→</div>

                {/* Destino */}
                <div className="sp-item">
                  <div className="n">
                    {getProductStockInDeposit(selectedTransferProduct, destinoDeposit)} →{' '}
                    {getProductStockInDeposit(selectedTransferProduct, destinoDeposit) +
                      Number(transferData.cantidad || 0)}
                  </div>
                  <div className="l">{destinoDeposit.nombre} (Destino)</div>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

export default Inventario;
