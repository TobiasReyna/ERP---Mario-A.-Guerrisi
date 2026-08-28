import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';

function Inventario() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('Ambos depósitos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  useEffect(() => {
    fetch('http://localhost:3001/api/stock/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) {
          setItems(data.data);
        }
      })
      .catch((err) => console.error('Error fetching inventory:', err));
  }, []);

  // Banner de confirmación
  const [confirmBanner, setConfirmBanner] = useState(null);

  // Modal Transferencia
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [transferData, setTransferData] = useState({
    origen: 'central',
    destino: 'margalef',
    cantidad: 3,
    motivo: 'Rebalanceo de stock',
    responsable: 'Juan Pérez',
  });

  const selectedItem = items[selectedProductIndex] || items[0] || { central: 0, margalef: 0, name: '' };

  const showConfirm = (text) => {
    setConfirmBanner(text);
    setTimeout(() => setConfirmBanner(null), 4500);
  };

  // Filtrado reactivo
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
      const matchStatus = selectedStatus === 'Todos' || item.status === selectedStatus;

      let matchWarehouse = true;
      if (activeTab === 'Tienda Central') matchWarehouse = item.central > 0;
      if (activeTab === 'Galería Margalef') matchWarehouse = item.margalef > 0;

      return matchCategory && matchStatus && matchWarehouse;
    });
  }, [items, activeTab, selectedCategory, selectedStatus]);

  const handleConfirmTransfer = (e) => {
    e.preventDefault();
    const qty = Number(transferData.cantidad) || 0;

    if (transferData.origen === 'central' && qty > selectedItem.central) {
      alert(`Stock insuficiente en Tienda Central (disponibles: ${selectedItem.central}).`);
      return;
    }
    if (transferData.origen === 'margalef' && qty > selectedItem.margalef) {
      alert(`Stock insuficiente en Galería Margalef (disponibles: ${selectedItem.margalef}).`);
      return;
    }

    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== selectedProductIndex) return it;
        return {
          ...it,
          central: transferData.origen === 'central' ? it.central - qty : it.central + qty,
          margalef: transferData.origen === 'central' ? it.margalef + qty : it.margalef - qty,
        };
      })
    );

    setIsTransferModalOpen(false);
    showConfirm('Transferencia realizada correctamente. El stock consolidado no se modifica, solo se redistribuye.');
  };

  const getStatusBadge = (status) => {
    if (status === 'Normal') return <span className="badge badge-green"><span className="badge-dot"></span>Normal</span>;
    if (status === 'Reposición') return <span className="badge badge-amber"><span className="badge-dot"></span>Reposición</span>;
    return <span className="badge badge-red"><span className="badge-dot"></span>Crítico</span>;
  };

  return (
    <div>
      {/* ENCABEZADO Y ACCIONES */}
      <div className="section-heading">
        <div>
          <h2>Inventario multi-depósito</h2>
          <span className="desc">
            Cada producto puede tener cantidades distintas en Tienda Central y Galería Margalef — el stock consolidado es la suma de ambas
          </span>
        </div>
        <button className="btn btn-outline" onClick={() => setIsTransferModalOpen(true)}>
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

      {/* PESTAÑAS DE DEPÓSITO */}
      <div className="warehouse-tabs">
        {['Ambos depósitos', 'Tienda Central', 'Galería Margalef'].map((tab) => (
          <button
            key={tab}
            className={`warehouse-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILTROS */}
      <div className="filter-bar">
        <div className="select-field">
          Categoría:
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option>Todas</option>
            <option>Guitarras eléctricas</option>
            <option>Guitarras acústicas</option>
            <option>Bajos</option>
            <option>Teclados / Pianos</option>
            <option>Baterías / Percusión</option>
            <option>Amplificadores</option>
            <option>Micrófonos / Audio</option>
            <option>Accesorios</option>
            <option>Viento</option>
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

      {/* TABLA MULTI-DEPÓSITO */}
      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código</th>
                {activeTab === 'Ambos depósitos' && (
                  <>
                    <th>Tienda Central</th>
                    <th>Galería Margalef</th>
                  </>
                )}
                {activeTab === 'Tienda Central' && <th>Tienda Central</th>}
                {activeTab === 'Galería Margalef' && <th>Galería Margalef</th>}
                <th>Stock consolidado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                    No se encontraron productos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const consol = item.central + item.margalef;
                  return (
                    <tr key={item.id}>
                      <td className="cell-strong">{item.name}</td>
                      <td className="cell-mono">{item.code}</td>

                      {activeTab === 'Ambos depósitos' && (
                        <>
                          <td className={`stock-cell ${item.central === 0 ? 'zero' : item.central <= 2 ? 'low' : ''}`}>
                            {item.central}
                          </td>
                          <td className={`stock-cell ${item.margalef === 0 ? 'zero' : item.margalef <= 1 ? 'low' : ''}`}>
                            {item.margalef}
                          </td>
                        </>
                      )}

                      {activeTab === 'Tienda Central' && (
                        <td className={`stock-cell ${item.central === 0 ? 'zero' : item.central <= 2 ? 'low' : ''}`}>
                          {item.central}
                        </td>
                      )}

                      {activeTab === 'Galería Margalef' && (
                        <td className={`stock-cell ${item.margalef === 0 ? 'zero' : item.margalef <= 1 ? 'low' : ''}`}>
                          {item.margalef}
                        </td>
                      )}

                      <td className={`stock-cell consolidated-cell ${item.status === 'Crítico' ? 'crit' : ''}`}>
                        {consol}
                      </td>
                      <td>{getStatusBadge(item.status)}</td>
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
            <button className="btn btn-outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmTransfer}>
              Confirmar transferencia
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmTransfer}>
          <div className="form-row">
            <div className="form-field full">
              <label>Producto *</label>
              <select
                value={selectedProductIndex}
                onChange={(e) => setSelectedProductIndex(Number(e.target.value))}
              >
                {items.map((prod, idx) => (
                  <option key={prod.id} value={idx}>
                    {prod.name} — Consolidado: {prod.central + prod.margalef}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Depósito origen *</label>
              <select
                value={transferData.origen}
                onChange={(e) => {
                  const orig = e.target.value;
                  setTransferData({
                    ...transferData,
                    origen: orig,
                    destino: orig === 'central' ? 'margalef' : 'central',
                  });
                }}
              >
                <option value="central">Tienda Central ({selectedItem.central} uds.)</option>
                <option value="margalef">Galería Margalef ({selectedItem.margalef} uds.)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Depósito destino *</label>
              <select
                value={transferData.destino}
                onChange={(e) => setTransferData({ ...transferData, destino: e.target.value })}
              >
                <option value="margalef">Galería Margalef</option>
                <option value="central">Tienda Central</option>
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
                onChange={(e) => setTransferData({ ...transferData, cantidad: Number(e.target.value) })}
              />
            </div>
            <div className="form-field">
              <label>Usuario responsable</label>
              <select
                value={transferData.responsable}
                onChange={(e) => setTransferData({ ...transferData, responsable: e.target.value })}
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
                placeholder="Ej: Rebalanceo de stock, solicitud de sucursal…"
                value={transferData.motivo}
                onChange={(e) => setTransferData({ ...transferData, motivo: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Vista previa de la redistribución</label>
            <div className="stock-preview">
              <div className="sp-item">
                <div className="n">
                  {transferData.origen === 'central'
                    ? `${selectedItem.central} → ${Math.max(0, selectedItem.central - transferData.cantidad)}`
                    : `${selectedItem.margalef} → ${Math.max(0, selectedItem.margalef - transferData.cantidad)}`}
                </div>
                <div className="l">{transferData.origen === 'central' ? 'Tienda Central' : 'Galería Margalef'}</div>
              </div>
              <div className="sp-arrow">→</div>
              <div className="sp-item">
                <div className="n">
                  {transferData.origen === 'central'
                    ? `${selectedItem.margalef} → ${selectedItem.margalef + Number(transferData.cantidad || 0)}`
                    : `${selectedItem.central} → ${selectedItem.central + Number(transferData.cantidad || 0)}`}
                </div>
                <div className="l">{transferData.destino === 'margalef' ? 'Galería Margalef' : 'Tienda Central'}</div>
              </div>
              <div className="sp-arrow">=</div>
              <div className="sp-item">
                <div className="n" style={{ color: 'var(--black)' }}>
                  {selectedItem.central + selectedItem.margalef}
                </div>
                <div className="l">Consolidado (sin cambios)</div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Inventario;