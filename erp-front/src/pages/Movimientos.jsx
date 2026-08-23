import { useState, useMemo } from 'react';
import Modal from '../components/Modal';

const INITIAL_MOVEMENTS = [
  { id: 1, date: '21/08/2026 09:42', product: 'Fender Stratocaster Player', type: 'AJUSTE NEG.', typeClass: 'type-ajuste-neg', warehouse: 'Tienda Central', qty: '-2', reason: 'Rotura', user: 'Juan Pérez', stockChange: '10 → 8' },
  { id: 2, date: '21/08/2026 09:14', product: 'Fender Stratocaster Player', type: 'ENTRADA', typeClass: 'type-entrada', warehouse: 'Tienda Central', qty: '+10', reason: 'Reposición de proveedor', user: 'Juan Pérez', stockChange: '0 → 10' },
  { id: 3, date: '21/08/2026 08:52', product: 'Shure SM58', type: 'SALIDA', typeClass: 'type-salida', warehouse: 'Galería Margalef', qty: '-4', reason: 'Venta mostrador', user: 'María Gómez', stockChange: '16 → 12' },
  { id: 4, date: '20/08/2026 17:30', product: 'Roland TD-17', type: 'TRANSFERENCIA', typeClass: 'type-transferencia', warehouse: 'Central → Margalef', qty: '2', reason: 'Rebalanceo de stock', user: 'Carlos Ruiz', stockChange: '5 → 3 / -1 → 1' },
  { id: 5, date: '20/08/2026 16:05', product: 'Ibanez GSR200', type: 'AJUSTE NEG.', typeClass: 'type-ajuste-neg', warehouse: 'Galería Margalef', qty: '-1', reason: 'Diferencia de recuento', user: 'Carlos Ruiz', stockChange: '2 → 1' },
  { id: 6, date: '20/08/2026 11:20', product: 'Yamaha P-145', type: 'ENTRADA', typeClass: 'type-entrada', warehouse: 'Tienda Central', qty: '+1', reason: 'Reposición de proveedor', user: 'Juan Pérez', stockChange: '0 → 1' },
  { id: 7, date: '19/08/2026 15:41', product: 'Marshall MG30GFX', type: 'AJUSTE POS.', typeClass: 'type-ajuste-pos', warehouse: 'Tienda Central', qty: '+2', reason: 'Diferencia de recuento', user: 'María Gómez', stockChange: '4 → 6' },
  { id: 8, date: '19/08/2026 10:02', product: 'Pearl Export Series', type: 'SALIDA', typeClass: 'type-salida', warehouse: 'Tienda Central', qty: '-3', reason: 'Venta a cliente corporativo', user: 'Juan Pérez', stockChange: '5 → 2' },
  { id: 9, date: '18/08/2026 14:18', product: 'Cort AD810', type: 'TRANSFERENCIA', typeClass: 'type-transferencia', warehouse: 'Margalef → Central', qty: '4', reason: 'Solicitud de sucursal', user: 'Carlos Ruiz', stockChange: '13 → 9 / 8 → 12' },
  { id: 10, date: '17/08/2026 09:30', product: 'Yamaha YTR-2330', type: 'AJUSTE NEG.', typeClass: 'type-ajuste-neg', warehouse: 'Galería Margalef', qty: '-1', reason: 'Vencimiento', user: 'María Gómez', stockChange: '1 → 0' },
  { id: 11, date: '16/08/2026 12:00', product: 'Korg B2', type: 'ENTRADA', typeClass: 'type-entrada', warehouse: 'Tienda Central', qty: '+5', reason: 'Reposición de proveedor', user: 'Juan Pérez', stockChange: '2 → 7' },
];

const PRODUCTS_LIST = [
  { name: 'Fender Stratocaster Player', code: 'COD-0001', stockCentral: 8, stockMargalef: 3 },
  { name: 'Gibson Les Paul Studio', code: 'COD-0002', stockCentral: 4, stockMargalef: 2 },
  { name: 'Cort AD810', code: 'COD-0003', stockCentral: 12, stockMargalef: 9 },
  { name: 'Yamaha P-145', code: 'COD-0007', stockCentral: 1, stockMargalef: 1 },
  { name: 'Shure SM58', code: 'COD-0013', stockCentral: 20, stockMargalef: 12 },
  { name: 'Marshall MG30GFX', code: 'COD-0012', stockCentral: 6, stockMargalef: 3 },
  { name: 'Roland TD-17', code: 'COD-0009', stockCentral: 3, stockMargalef: 1 },
];

function Movimientos() {
  const [movements, setMovements] = useState(INITIAL_MOVEMENTS);

  // Filtros
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedWarehouse, setSelectedWarehouse] = useState('Todos');
  const [selectedUser, setSelectedUser] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast confirmación
  const [confirmToast, setConfirmToast] = useState(null);

  // Modal registrar movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productIndex, setProductIndex] = useState(0);
  const [warehouse, setWarehouse] = useState('Tienda Central');
  const [movementType, setMovementType] = useState('entrada');
  const [qty, setQty] = useState(5);
  const [user, setUser] = useState('Juan Pérez');
  const [reason, setReason] = useState('');
  const [hasReasonError, setHasReasonError] = useState(false);

  const isAdjustment = movementType === 'ajuste-pos' || movementType === 'ajuste-neg';
  const currentProduct = PRODUCTS_LIST[productIndex] || PRODUCTS_LIST[0];
  const baseStock = warehouse === 'Tienda Central' ? currentProduct.stockCentral : currentProduct.stockMargalef;

  // Cálculo vista previa de stock
  const calculatedResultStock = useMemo(() => {
    const numQty = Number(qty) || 0;
    if (movementType === 'entrada' || movementType === 'ajuste-pos') return baseStock + numQty;
    if (movementType === 'salida' || movementType === 'ajuste-neg') return Math.max(0, baseStock - numQty);
    return baseStock;
  }, [baseStock, qty, movementType]);

  const showToast = (msg) => {
    setConfirmToast(msg);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  // Filtrado
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchType =
        selectedType === 'Todos' ||
        (selectedType === 'Entrada' && m.type === 'ENTRADA') ||
        (selectedType === 'Salida' && m.type === 'SALIDA') ||
        (selectedType === 'Ajuste positivo' && m.type === 'AJUSTE POS.') ||
        (selectedType === 'Ajuste negativo' && m.type === 'AJUSTE NEG.') ||
        (selectedType === 'Transferencia' && m.type === 'TRANSFERENCIA');

      const matchWh = selectedWarehouse === 'Todos' || m.warehouse.includes(selectedWarehouse);
      const matchUser = selectedUser === 'Todos' || m.user === selectedUser;
      const matchSearch =
        m.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.reason.toLowerCase().includes(searchQuery.toLowerCase());

      return matchType && matchWh && matchUser && matchSearch;
    });
  }, [movements, selectedType, selectedWarehouse, selectedUser, searchQuery]);

  const handleOpenModal = () => {
    setProductIndex(0);
    setWarehouse('Tienda Central');
    setMovementType('entrada');
    setQty(5);
    setUser('Juan Pérez');
    setReason('');
    setHasReasonError(false);
    setIsModalOpen(true);
  };

  const handleConfirmMovement = (e) => {
    e.preventDefault();

    // Validación HU-02: Motivo obligatorio para ajustes
    if (isAdjustment && !reason.trim()) {
      setHasReasonError(true);
      return;
    }

    setHasReasonError(false);

    let typeLabel = 'ENTRADA';
    let typeClass = 'type-entrada';
    let qtyDisplay = `+${qty}`;

    if (movementType === 'salida') {
      typeLabel = 'SALIDA';
      typeClass = 'type-salida';
      qtyDisplay = `-${qty}`;
    } else if (movementType === 'ajuste-pos') {
      typeLabel = 'AJUSTE POS.';
      typeClass = 'type-ajuste-pos';
      qtyDisplay = `+${qty}`;
    } else if (movementType === 'ajuste-neg') {
      typeLabel = 'AJUSTE NEG.';
      typeClass = 'type-ajuste-neg';
      qtyDisplay = `-${qty}`;
    } else if (movementType === 'transferencia') {
      typeLabel = 'TRANSFERENCIA';
      typeClass = 'type-transferencia';
      qtyDisplay = `${qty}`;
    }

    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMov = {
      id: Date.now(),
      date: dateFormatted,
      product: currentProduct.name,
      type: typeLabel,
      typeClass,
      warehouse,
      qty: qtyDisplay,
      reason: reason || (movementType === 'entrada' ? 'Reposición de proveedor' : 'Venta mostrador'),
      user,
      stockChange: `${baseStock} → ${calculatedResultStock}`,
    };

    setMovements([newMov, ...movements]);
    setIsModalOpen(false);
    showToast('Movimiento registrado correctamente.');
  };

  return (
    <div>
      {/* ENCABEZADO */}
      <div className="section-heading">
        <div>
          <h2>Movimientos y ajustes de stock</h2>
          <span className="desc">Entradas, salidas, ajustes y transferencias entre Tienda Central y Galería Margalef</span>
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
            <option>Todos</option>
            <option>Tienda Central</option>
            <option>Galería Margalef</option>
          </select>
        </div>

        <div className="select-field">
          Usuario:
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option>Todos</option>
            <option>Juan Pérez</option>
            <option>María Gómez</option>
            <option>Carlos Ruiz</option>
          </select>
        </div>

        <div className="search-input" style={{ maxWidth: '240px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar producto o código"
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
                <th>Tipo</th>
                <th>Depósito</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
                <th>Stock ant. → nuevo</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
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
                    <td><span className={`type-pill ${mov.typeClass}`}>{mov.type}</span></td>
                    <td>{mov.warehouse}</td>
                    <td className="cell-strong">{mov.qty}</td>
                    <td>{mov.reason}</td>
                    <td>{mov.user}</td>
                    <td className="cell-mono">{mov.stockChange}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR MOVIMIENTO (HU-02) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar movimiento de stock"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmMovement}>
              Registrar movimiento
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmMovement}>
          <div className="form-row">
            <div className="form-field full">
              <label>Producto<span className="req">*</span></label>
              <select
                value={productIndex}
                onChange={(e) => setProductIndex(Number(e.target.value))}
              >
                {PRODUCTS_LIST.map((p, idx) => (
                  <option key={p.code} value={idx}>
                    {p.name} — {p.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Depósito<span className="req">*</span></label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              >
                <option>Tienda Central</option>
                <option>Galería Margalef</option>
              </select>
            </div>

            <div className="form-field">
              <label>Tipo de movimiento<span className="req">*</span></label>
              <select
                value={movementType}
                onChange={(e) => {
                  setMovementType(e.target.value);
                  setHasReasonError(false);
                }}
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste-pos">Ajuste positivo</option>
                <option value="ajuste-neg">Ajuste negativo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Cantidad<span className="req">*</span></label>
              <input
                type="number"
                min="1"
                placeholder="Ej: 10"
                required
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </div>

            <div className="form-field">
              <label>Usuario responsable</label>
              <select value={user} onChange={(e) => setUser(e.target.value)}>
                <option>Juan Pérez</option>
                <option>María Gómez</option>
                <option>Carlos Ruiz</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>
                Motivo {isAdjustment && <span className="req">*</span>}
              </label>
              <select
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setHasReasonError(false);
                }}
              >
                <option value="">Seleccionar motivo…</option>
                <option value="Rotura">Rotura</option>
                <option value="Pérdida">Pérdida</option>
                <option value="Vencimiento">Vencimiento</option>
                <option value="Diferencia de recuento">Diferencia de recuento</option>
                <option value="Reposición de proveedor">Reposición de proveedor</option>
                <option value="Venta mostrador">Venta mostrador</option>
              </select>

              {!isAdjustment && (
                <span className="field-hint">Obligatorio para ajustes y mermas.</span>
              )}

              {hasReasonError && (
                <span className="field-error">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  Seleccioná un motivo para continuar.
                </span>
              )}
            </div>
          </div>

          <div className="form-field">
            <label>Vista previa de stock</label>
            <div className="stock-preview">
              <div className="sp-item">
                <div className="n">{baseStock}</div>
                <div className="l">Stock anterior</div>
              </div>
              <div className="sp-arrow">→</div>
              <div className="sp-item">
                <div className="n" style={{ color: movementType.includes('neg') || movementType === 'salida' ? 'var(--crit)' : 'var(--green)' }}>
                  {calculatedResultStock}
                </div>
                <div className="l">Stock resultante</div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Movimientos;