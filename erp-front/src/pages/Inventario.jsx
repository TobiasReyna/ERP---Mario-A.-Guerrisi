import { useState, useMemo } from 'react';
import Modal from '../components/Modal';

const INITIAL_INVENTORY = [
  { id: 1, name: 'Fender Stratocaster Player', sku: 'GTR-FEN-001', brand: 'Fender', category: 'Guitarras eléctricas', central: 10, norte: 3, sur: 3 },
  { id: 2, name: 'Gibson Les Paul Studio', sku: 'GTR-GIB-002', brand: 'Gibson', category: 'Guitarras eléctricas', central: 4, norte: 1, sur: 2 },
  { id: 3, name: 'Cort AD810', sku: 'GTR-COR-007', brand: 'Cort', category: 'Guitarras acústicas', central: 12, norte: 6, sur: 9 },
  { id: 4, name: 'Taylor 214ce', sku: 'GTR-TAY-008', brand: 'Taylor', category: 'Guitarras acústicas', central: 3, norte: 0, sur: 1 },
  { id: 5, name: 'Fender Player Jazz Bass', sku: 'BAJ-FEN-009', brand: 'Fender', category: 'Bajos', central: 5, norte: 2, sur: 3 },
  { id: 6, name: 'Ibanez GSR200', sku: 'BAJ-IBA-010', brand: 'Ibanez', category: 'Bajos', central: 2, norte: 1, sur: 0 },
  { id: 7, name: 'Yamaha P-145', sku: 'KEY-YAM-003', brand: 'Yamaha', category: 'Pianos', central: 9, norte: 4, sur: 6 },
  { id: 8, name: 'Korg B2', sku: 'KEY-KOR-011', brand: 'Korg', category: 'Teclados', central: 7, norte: 3, sur: 2 },
  { id: 9, name: 'Roland TD-17', sku: 'BAT-ROL-006', brand: 'Roland', category: 'Baterías', central: 3, norte: 1, sur: 1 },
  { id: 10, name: 'Pearl Export Series', sku: 'BAT-PEA-012', brand: 'Pearl', category: 'Baterías', central: 2, norte: 0, sur: 0 },
  { id: 11, name: 'LP Cajón Peruano', sku: 'PER-LPX-013', brand: 'LP', category: 'Percusión', central: 15, norte: 8, sur: 10 },
  { id: 12, name: 'Marshall MG30GFX', sku: 'AMP-MAR-005', brand: 'Marshall', category: 'Amplificadores', central: 6, norte: 2, sur: 3 },
  { id: 13, name: 'Shure SM58', sku: 'MIC-SHR-004', brand: 'Shure', category: 'Micrófonos', central: 20, norte: 10, sur: 14 },
  { id: 14, name: 'Yamaha HS5', sku: 'AUD-YAM-014', brand: 'Yamaha', category: 'Audio', central: 4, norte: 2, sur: 1 },
  { id: 15, name: 'Dunlop Correa + Púas Kit', sku: 'ACC-DUN-015', brand: 'Dunlop', category: 'Accesorios', central: 30, norte: 18, sur: 22 },
  { id: 16, name: 'Yamaha YTR-2330', sku: 'VIE-YAM-016', brand: 'Yamaha', category: 'Viento', central: 2, norte: 1, sur: 0 },
];

const WAREHOUSE_MAP = {
  'Depósito Central': 'central',
  'Depósito Norte': 'norte',
  'Depósito Sur': 'sur',
};

function Inventario() {
  const [items, setItems] = useState(INITIAL_INVENTORY);
  const [activeTab, setActiveTab] = useState('Todos los depósitos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Modal de Ajuste
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustmentData, setAdjustmentData] = useState({
    deposito: 'central',
    tipoOperacion: 'sumar',
    cantidad: 1,
    motivo: 'Ajuste de inventario'
  });

  // Determina el estado del stock según la cantidad
  const calculateStatus = (qty) => {
    if (qty === 0) return { label: 'Sin stock', badgeClass: 'badge-red' };
    if (qty <= 2) return { label: 'Crítico', badgeClass: 'badge-red' };
    if (qty <= 4) return { label: 'Stock bajo', badgeClass: 'badge-amber' };
    return { label: 'Disponible', badgeClass: 'badge-green' };
  };

  // Filtrado estricto por depósito, categoría, marca y estado
  const filteredItems = useMemo(() => {
    const isSingleWarehouse = activeTab !== 'Todos los depósitos';
    const whKey = isSingleWarehouse ? WAREHOUSE_MAP[activeTab] : null;

    return items.filter((item) => {
      const matchCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
      const matchBrand = selectedBrand === 'Todas' || item.brand === selectedBrand;

      // Cantidad a evaluar (del depósito puntual o la suma de los 3)
      const currentStock = isSingleWarehouse ? item[whKey] : item.central + item.norte + item.sur;
      const { label: itemStatus } = calculateStatus(currentStock);

      const matchStatus = selectedStatus === 'Todos' || itemStatus === selectedStatus;

      // FILTRO CLAVE: si hay un depósito seleccionado, solo mostramos productos con stock > 0 en ese depósito
      const matchWarehouse = isSingleWarehouse ? item[whKey] > 0 : true;

      return matchCategory && matchBrand && matchStatus && matchWarehouse;
    });
  }, [items, activeTab, selectedCategory, selectedBrand, selectedStatus]);

  const handleOpenAdjustModal = (item) => {
    const defaultWh = activeTab !== 'Todos los depósitos' ? WAREHOUSE_MAP[activeTab] : 'central';
    setSelectedItem(item);
    setAdjustmentData({
      deposito: defaultWh,
      tipoOperacion: 'sumar',
      cantidad: 1,
      motivo: 'Recuento físico / corrección'
    });
    setIsModalOpen(true);
  };

  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qty = Number(adjustmentData.cantidad) || 0;
    const delta = adjustmentData.tipoOperacion === 'sumar' ? qty : -qty;

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== selectedItem.id) return item;
        const newQty = Math.max(0, item[adjustmentData.deposito] + delta);
        return {
          ...item,
          [adjustmentData.deposito]: newQty
        };
      })
    );

    setIsModalOpen(false);
  };

  const getStockCellClass = (qty) => {
    if (qty === 0) return 'stock-cell zero';
    if (qty <= 2) return 'stock-cell crit';
    if (qty <= 4) return 'stock-cell low';
    return 'stock-cell';
  };

  const isSpecificWarehouse = activeTab !== 'Todos los depósitos';
  const currentWhKey = isSpecificWarehouse ? WAREHOUSE_MAP[activeTab] : null;

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>
            {isSpecificWarehouse ? `Inventario — ${activeTab}` : 'Inventario multi-depósito'}
          </h2>
          <span className="desc">
            {isSpecificWarehouse
              ? `Mostrando ${filteredItems.length} productos con existencias en ${activeTab}`
              : 'Comparación consolidada de stock entre los 3 depósitos activos'}
          </span>
        </div>
      </div>

      {/* PESTAÑAS DE FILTRADO POR DEPÓSITO */}
      <div className="warehouse-tabs">
        {['Todos los depósitos', 'Depósito Central', 'Depósito Norte', 'Depósito Sur'].map((tab) => (
          <button
            key={tab}
            className={`warehouse-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILTROS SECUNDARIOS */}
      <div className="filter-bar">
        <div className="select-field">
          Categoría:
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option>Todas</option>
            <option>Guitarras eléctricas</option>
            <option>Guitarras acústicas</option>
            <option>Bajos</option>
            <option>Teclados</option>
            <option>Pianos</option>
            <option>Baterías</option>
            <option>Percusión</option>
            <option>Amplificadores</option>
            <option>Micrófonos</option>
            <option>Audio</option>
            <option>Accesorios</option>
            <option>Viento</option>
          </select>
        </div>

        <div className="select-field">
          Marca:
          <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
            <option>Todas</option>
            <option>Fender</option>
            <option>Gibson</option>
            <option>Yamaha</option>
            <option>Roland</option>
            <option>Cort</option>
            <option>Taylor</option>
            <option>Ibanez</option>
            <option>Pearl</option>
            <option>LP</option>
            <option>Marshall</option>
            <option>Shure</option>
            <option>Dunlop</option>
          </select>
        </div>

        <div className="select-field">
          Estado:
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option>Todos</option>
            <option>Disponible</option>
            <option>Stock bajo</option>
            <option>Crítico</option>
            <option>Sin stock</option>
          </select>
        </div>
      </div>

      {/* TABLA ADAPTADA DINÁMICAMENTE */}
      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                {!isSpecificWarehouse ? (
                  <>
                    <th>Central</th>
                    <th>Norte</th>
                    <th>Sur</th>
                    <th>Stock total</th>
                  </>
                ) : (
                  <th>Stock en {activeTab.replace('Depósito ', '')}</th>
                )}
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isSpecificWarehouse ? 5 : 8} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                    No se encontraron productos con stock en este depósito bajo los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stockEvaluated = isSpecificWarehouse
                    ? item[currentWhKey]
                    : item.central + item.norte + item.sur;
                  const statusInfo = calculateStatus(stockEvaluated);

                  return (
                    <tr key={item.id}>
                      <td className="cell-strong">
                        {item.name}
                        <div className="cell-sub">{item.brand} · {item.category}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{item.sku}</td>

                      {!isSpecificWarehouse ? (
                        <>
                          <td className={getStockCellClass(item.central)}>{item.central}</td>
                          <td className={getStockCellClass(item.norte)}>{item.norte}</td>
                          <td className={getStockCellClass(item.sur)}>{item.sur}</td>
                          <td className="cell-strong">{stockEvaluated}</td>
                        </>
                      ) : (
                        <td className={`cell-strong ${getStockCellClass(item[currentWhKey])}`}>
                          {item[currentWhKey]} uds.
                        </td>
                      )}

                      <td>
                        <span className={`badge ${statusInfo.badgeClass}`}>
                          <span className="badge-dot"></span>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenAdjustModal(item)}
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE AJUSTE */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? `Ajustar Stock: ${selectedItem.name}` : 'Ajustar Inventario'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSaveAdjustment}>
              Aplicar Corrección
            </button>
          </>
        }
      >
        {selectedItem && (
          <form onSubmit={handleSaveAdjustment}>
            <div className="stock-preview" style={{ marginBottom: '16px' }}>
              <div className="sp-item">
                <div className="n">{selectedItem.central}</div>
                <div className="l">Central</div>
              </div>
              <div className="sp-item">
                <div className="n">{selectedItem.norte}</div>
                <div className="l">Norte</div>
              </div>
              <div className="sp-item">
                <div className="n">{selectedItem.sur}</div>
                <div className="l">Sur</div>
              </div>
              <div className="sp-item">
                <div className="n" style={{ color: 'var(--red)' }}>
                  {selectedItem.central + selectedItem.norte + selectedItem.sur}
                </div>
                <div className="l">Total Consolidado</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Depósito a Modificar</label>
                <select
                  value={adjustmentData.deposito}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, deposito: e.target.value })}
                >
                  <option value="central">Depósito Central</option>
                  <option value="norte">Depósito Norte</option>
                  <option value="sur">Depósito Sur</option>
                </select>
              </div>

              <div className="form-field">
                <label>Operación</label>
                <select
                  value={adjustmentData.tipoOperacion}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, tipoOperacion: e.target.value })}
                >
                  <option value="sumar">Sumar existencias (+)</option>
                  <option value="restar">Restar existencias (-)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Cantidad de Unidades</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustmentData.cantidad}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, cantidad: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Motivo</label>
                <input
                  type="text"
                  placeholder="Ej. Recuento físico, merma..."
                  value={adjustmentData.motivo}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, motivo: e.target.value })}
                />
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default Inventario;