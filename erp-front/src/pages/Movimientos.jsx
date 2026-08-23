import { useState, useMemo } from 'react';
import Modal from '../components/Modal';

const INITIAL_MOVEMENTS = [
  {
    id: 1,
    product: 'Fender Stratocaster Player',
    sku: 'GTR-FEN-001',
    type: 'ENTRADA',
    typeClass: 'type-entrada',
    warehouse: 'Depósito Central',
    qty: '+12',
    reason: 'Reposición de proveedor',
    user: 'Juan Pérez',
    date: '15/08/2026 09:14',
    stockChange: '0 → 10',
    status: 'Completado',
  },
  {
    id: 2,
    product: 'Shure SM58',
    sku: 'MIC-SHR-004',
    type: 'SALIDA',
    typeClass: 'type-salida',
    warehouse: 'Depósito Norte',
    qty: '-6',
    reason: 'Venta mostrador',
    user: 'María Gómez',
    date: '15/08/2026 08:52',
    stockChange: '16 → 10',
    status: 'Completado',
  },
  {
    id: 3,
    product: 'Roland TD-17',
    sku: 'BAT-ROL-006',
    type: 'TRANSFERENCIA',
    typeClass: 'type-transferencia',
    warehouse: 'Central → Sur',
    qty: '2',
    reason: 'Rebalanceo de stock',
    user: 'Carlos Ruiz',
    date: '14/08/2026 17:30',
    stockChange: '5 → 3 / -1 → 1',
    status: 'Completado',
  },
  {
    id: 4,
    product: 'Ibanez GSR200',
    sku: 'BAJ-IBA-010',
    type: 'AJUSTE NEG.',
    typeClass: 'type-ajuste-neg',
    warehouse: 'Depósito Sur',
    qty: '-1',
    reason: 'Producto dañado en depósito',
    user: 'Carlos Ruiz',
    date: '14/08/2026 16:05',
    stockChange: '1 → 0',
    status: 'Completado',
  },
  {
    id: 5,
    product: 'Yamaha P-145',
    sku: 'KEY-YAM-003',
    type: 'ENTRADA',
    typeClass: 'type-entrada',
    warehouse: 'Depósito Central',
    qty: '+9',
    reason: 'Reposición de proveedor',
    user: 'Juan Pérez',
    date: '14/08/2026 11:20',
    stockChange: '0 → 9',
    status: 'Completado',
  },
  {
    id: 6,
    product: 'Marshall MG30GFX',
    sku: 'AMP-MAR-005',
    type: 'AJUSTE POS.',
    typeClass: 'type-ajuste-pos',
    warehouse: 'Depósito Central',
    qty: '+2',
    reason: 'Corrección de conteo físico',
    user: 'María Gómez',
    date: '13/08/2026 15:41',
    stockChange: '4 → 6',
    status: 'Completado',
  },
  {
    id: 7,
    product: 'Pearl Export Series',
    sku: 'BAT-PEA-012',
    type: 'SALIDA',
    typeClass: 'type-salida',
    warehouse: 'Depósito Central',
    qty: '-3',
    reason: 'Venta a cliente corporativo',
    user: 'Juan Pérez',
    date: '13/08/2026 10:02',
    stockChange: '5 → 2',
    status: 'Completado',
  },
  {
    id: 8,
    product: 'Cort AD810',
    sku: 'GTR-COR-007',
    type: 'TRANSFERENCIA',
    typeClass: 'type-transferencia',
    warehouse: 'Norte → Sur',
    qty: '4',
    reason: 'Solicitud de sucursal',
    user: 'Carlos Ruiz',
    date: '12/08/2026 14:18',
    stockChange: '10 → 6 / 5 → 9',
    status: 'Pendiente',
  },
];

const PRODUCTS_LIST = [
  { name: 'Fender Stratocaster Player', sku: 'GTR-FEN-001' },
  { name: 'Gibson Les Paul Studio', sku: 'GTR-GIB-002' },
  { name: 'Yamaha P-145', sku: 'KEY-YAM-003' },
  { name: 'Shure SM58', sku: 'MIC-SHR-004' },
  { name: 'Marshall MG30GFX', sku: 'AMP-MAR-005' },
  { name: 'Roland TD-17', sku: 'BAT-ROL-006' },
  { name: 'Cort AD810', sku: 'GTR-COR-007' },
  { name: 'Taylor 214ce', sku: 'GTR-TAY-008' },
  { name: 'Pearl Export Series', sku: 'BAT-PEA-012' },
  { name: 'Ibanez GSR200', sku: 'BAJ-IBA-010' },
];

function Movimientos() {
  const [movements, setMovements] = useState(INITIAL_MOVEMENTS);
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedWarehouse, setSelectedWarehouse] = useState('Todos');
  const [selectedUser, setSelectedUser] = useState('Todos');

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    productIndex: 0,
    type: 'ENTRADA',
    warehouseOrigin: 'Depósito Central',
    warehouseDest: 'Depósito Sur',
    quantity: 1,
    reason: '',
    user: 'Juan Pérez',
  });

  // Filtrado reactivo
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchType = selectedType === 'Todos' || m.type === selectedType;
      const matchWh = selectedWarehouse === 'Todos' || m.warehouse.includes(selectedWarehouse);
      const matchUser = selectedUser === 'Todos' || m.user === selectedUser;
      return matchType && matchWh && matchUser;
    });
  }, [movements, selectedType, selectedWarehouse, selectedUser]);

  const handleRegisterMovement = (e) => {
    e.preventDefault();
    const prod = PRODUCTS_LIST[formData.productIndex];

    let typeClass = 'type-entrada';
    let qtyFormatted = `+${formData.quantity}`;
    let whDisplay = formData.warehouseOrigin;

    if (formData.type === 'SALIDA') {
      typeClass = 'type-salida';
      qtyFormatted = `-${formData.quantity}`;
    } else if (formData.type === 'TRANSFERENCIA') {
      typeClass = 'type-transferencia';
      qtyFormatted = `${formData.quantity}`;
      whDisplay = `${formData.warehouseOrigin.replace('Depósito ', '')} → ${formData.warehouseDest.replace('Depósito ', '')}`;
    } else if (formData.type === 'AJUSTE POS.') {
      typeClass = 'type-ajuste-pos';
      qtyFormatted = `+${formData.quantity}`;
    } else if (formData.type === 'AJUSTE NEG.') {
      typeClass = 'type-ajuste-neg';
      qtyFormatted = `-${formData.quantity}`;
    }

    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newEntry = {
      id: Date.now(),
      product: prod.name,
      sku: prod.sku,
      type: formData.type,
      typeClass,
      warehouse: whDisplay,
      qty: qtyFormatted,
      reason: formData.reason || 'Operación registrada manualmente',
      user: formData.user,
      date: dateFormatted,
      stockChange: 'Actualizado',
      status: 'Completado',
    };

    setMovements([newEntry, ...movements]);
    setIsModalOpen(false);
    setFormData({
      productIndex: 0,
      type: 'ENTRADA',
      warehouseOrigin: 'Depósito Central',
      warehouseDest: 'Depósito Sur',
      quantity: 1,
      reason: '',
      user: 'Juan Pérez',
    });
  };

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>Movimientos de stock</h2>
          <span className="desc">Historial de entradas, salidas, ajustes y transferencias</span>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Registrar movimiento
        </button>
      </div>

      {/* FILTROS ACTIVOS */}
      <div className="filter-bar">
        <div className="select-field">
          Tipo:
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option>Todos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SALIDA">Salida</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="AJUSTE POS.">Ajuste positivo</option>
            <option value="AJUSTE NEG.">Ajuste negativo</option>
          </select>
        </div>

        <div className="select-field">
          Depósito:
          <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
            <option>Todos</option>
            <option value="Central">Depósito Central</option>
            <option value="Norte">Depósito Norte</option>
            <option value="Sur">Depósito Sur</option>
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
      </div>

      {/* TABLA DE MOVIMIENTOS */}
      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Depósito</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
                <th>Fecha</th>
                <th>Stock ant. → result.</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                    No hay movimientos registrados que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td className="cell-strong">
                      {mov.product}
                      <div className="cell-sub">{mov.sku}</div>
                    </td>
                    <td>
                      <span className={`type-pill ${mov.typeClass}`}>{mov.type}</span>
                    </td>
                    <td>{mov.warehouse}</td>
                    <td className="cell-strong">{mov.qty}</td>
                    <td>{mov.reason}</td>
                    <td>{mov.user}</td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-700)' }}>{mov.date}</td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{mov.stockChange}</td>
                    <td>
                      <span className={`badge ${mov.status === 'Completado' ? 'badge-green' : 'badge-amber'}`}>
                        <span className="badge-dot"></span>
                        {mov.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR MOVIMIENTO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Movimiento de Stock"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleRegisterMovement}>
              Confirmar y Guardar
            </button>
          </>
        }
      >
        <form onSubmit={handleRegisterMovement}>
          <div className="form-row">
            <div className="form-field full">
              <label>Producto a Mover</label>
              <select
                value={formData.productIndex}
                onChange={(e) => setFormData({ ...formData, productIndex: Number(e.target.value) })}
              >
                {PRODUCTS_LIST.map((p, idx) => (
                  <option key={p.sku} value={idx}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Tipo de Movimiento</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="ENTRADA">Entrada (+)</option>
                <option value="SALIDA">Salida (-)</option>
                <option value="TRANSFERENCIA">Transferencia entre depósitos</option>
                <option value="AJUSTE POS.">Ajuste Positivo (+)</option>
                <option value="AJUSTE NEG.">Ajuste Negativo (-)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Usuario Responsable</label>
              <select
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
              >
                <option>Juan Pérez</option>
                <option>María Gómez</option>
                <option>Carlos Ruiz</option>
                <option>Administrador</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>{formData.type === 'TRANSFERENCIA' ? 'Depósito Origen' : 'Depósito'}</label>
              <select
                value={formData.warehouseOrigin}
                onChange={(e) => setFormData({ ...formData, warehouseOrigin: e.target.value })}
              >
                <option>Depósito Central</option>
                <option>Depósito Norte</option>
                <option>Depósito Sur</option>
              </select>
            </div>

            {formData.type === 'TRANSFERENCIA' ? (
              <div className="form-field">
                <label>Depósito Destino</label>
                <select
                  value={formData.warehouseDest}
                  onChange={(e) => setFormData({ ...formData, warehouseDest: e.target.value })}
                >
                  <option>Depósito Sur</option>
                  <option>Depósito Norte</option>
                  <option>Depósito Central</option>
                </select>
              </div>
            ) : (
              <div className="form-field">
                <label>Cantidad de Unidades</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          {formData.type === 'TRANSFERENCIA' && (
            <div className="form-row">
              <div className="form-field full">
                <label>Cantidad a Transferir</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-field full">
              <label>Motivo / Observación</label>
              <input
                type="text"
                placeholder="Ej. Factura A-00412, Envío a sucursal, etc."
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Movimientos;