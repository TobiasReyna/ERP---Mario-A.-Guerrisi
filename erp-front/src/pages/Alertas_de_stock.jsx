import { useState, useMemo } from 'react';
import Modal from '../components/Modal';

const INITIAL_ALERTS = [
  {
    id: 1,
    name: 'Fender Stratocaster Player',
    sku: 'GTR-FEN-001',
    actual: 2,
    min: 5,
    suggested: 8,
    warehouse: 'Depósito Norte',
    priority: 'crit',
    priorityLabel: 'Crítico',
  },
  {
    id: 2,
    name: 'Pearl Export Series',
    sku: 'BAT-PEA-012',
    actual: 2,
    min: 4,
    suggested: 6,
    warehouse: 'Depósito Central',
    priority: 'crit',
    priorityLabel: 'Crítico',
  },
  {
    id: 3,
    name: 'Ibanez GSR200',
    sku: 'BAJ-IBA-010',
    actual: 3,
    min: 6,
    suggested: 8,
    warehouse: 'Depósito Sur',
    priority: 'crit',
    priorityLabel: 'Crítico',
  },
  {
    id: 4,
    name: 'Yamaha YTR-2330',
    sku: 'VIE-YAM-016',
    actual: 0,
    min: 5,
    suggested: 6,
    warehouse: 'Depósito Sur',
    priority: 'crit',
    priorityLabel: 'Crítico',
  },
  {
    id: 5,
    name: 'Taylor 214ce',
    sku: 'GTR-TAY-008',
    actual: 4,
    min: 6,
    suggested: 6,
    warehouse: 'Depósito Sur',
    priority: 'low',
    priorityLabel: 'Stock bajo',
  },
  {
    id: 6,
    name: 'Roland TD-17',
    sku: 'BAT-ROL-006',
    actual: 5,
    min: 6,
    suggested: 4,
    warehouse: 'Depósito Norte',
    priority: 'low',
    priorityLabel: 'Stock bajo',
  },
  {
    id: 7,
    name: 'Yamaha HS5',
    sku: 'AUD-YAM-014',
    actual: 7,
    min: 8,
    suggested: 6,
    warehouse: 'Depósito Sur',
    priority: 'low',
    priorityLabel: 'Stock bajo',
  },
  {
    id: 8,
    name: 'Korg B2',
    sku: 'KEY-KOR-011',
    actual: 2,
    min: 3,
    suggested: 4,
    warehouse: 'Depósito Sur',
    priority: 'low',
    priorityLabel: 'Stock bajo',
  },
];

function Alertas_de_stock() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [filterSeverity, setFilterSeverity] = useState('Todas');
  const [filterWarehouse, setFilterWarehouse] = useState('Todos');

  // Control del modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [formData, setFormData] = useState({
    cantidad: 1,
    deposito: 'Depósito Central',
    urgencia: 'Alta',
    proveedor: 'Distribuidora Musical Oficial',
    notas: '',
  });

  // Métricas calculadas en tiempo real
  const totalCriticos = useMemo(() => alerts.filter((a) => a.priority === 'crit').length, [alerts]);
  const totalStockBajo = useMemo(() => alerts.filter((a) => a.priority === 'low').length, [alerts]);
  const depositosAfectados = useMemo(() => new Set(alerts.map((a) => a.warehouse)).size, [alerts]);

  // Alertas filtradas
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      const matchSeverity =
        filterSeverity === 'Todas' ||
        (filterSeverity === 'Crítico' && item.priority === 'crit') ||
        (filterSeverity === 'Stock bajo' && item.priority === 'low');

      const matchWarehouse =
        filterWarehouse === 'Todos' || item.warehouse === filterWarehouse;

      return matchSeverity && matchWarehouse;
    });
  }, [alerts, filterSeverity, filterWarehouse]);

  const handleOpenModal = (alertItem = null) => {
    if (alertItem) {
      setSelectedAlert(alertItem);
      setFormData({
        cantidad: alertItem.suggested,
        deposito: alertItem.warehouse,
        urgencia: alertItem.priority === 'crit' ? 'Alta' : 'Normal',
        proveedor: 'Distribuidora Musical Oficial',
        notas: `Reposición sugerida para ${alertItem.name} (${alertItem.sku})`,
      });
    } else {
      setSelectedAlert(null);
      setFormData({
        cantidad: 10,
        deposito: 'Depósito Central',
        urgencia: 'Alta',
        proveedor: 'Distribuidora Musical Oficial',
        notas: 'Reposición masiva de instrumentos críticos',
      });
    }
    setIsModalOpen(true);
  };

  const handleConfirmReposition = (e) => {
    e.preventDefault();

    if (selectedAlert) {
      // Se repone el producto seleccionado y se elimina o actualiza de la lista de alertas
      setAlerts((prev) => prev.filter((a) => a.id !== selectedAlert.id));
    } else {
      // Reposición general: se limpian todas las alertas del depósito elegido
      setAlerts((prev) => prev.filter((a) => a.warehouse !== formData.deposito));
    }

    setIsModalOpen(false);
  };

  return (
    <div>
      {/* TARJETA RESUMEN CON VALORES REACTIVOS */}
      <div className="alert-summary-card">
        <div className="alert-summary-left">
          <div className="alert-summary-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <div className="alert-summary-title">
              {alerts.length > 0 ? `${alerts.length} productos requieren atención` : 'No hay alertas de stock pendientes'}
            </div>
            <div className="alert-summary-sub">
              Revisá el detalle y generá órdenes de reposición para evitar quiebres de stock
            </div>
          </div>
        </div>

        <div className="alert-summary-stats">
          <div className="alert-summary-stat">
            <div className="n">{totalCriticos}</div>
            <div className="l">Críticos</div>
          </div>
          <div className="alert-summary-stat">
            <div className="n">{totalStockBajo}</div>
            <div className="l">Stock bajo</div>
          </div>
          <div className="alert-summary-stat">
            <div className="n">{depositosAfectados}</div>
            <div className="l">Depósitos</div>
          </div>
        </div>
      </div>

      {/* ENCABEZADO Y BOTÓN GLOBAL */}
      <div className="section-heading">
        <div>
          <h2>Productos con alertas activas</h2>
          <span className="desc">Ordenados por prioridad de reposición</span>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal(null)}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Gestionar reposición general
        </button>
      </div>

      {/* BARRA DE FILTROS RÁPIDOS */}
      <div className="filter-bar">
        <div className="select-field">
          Severidad:
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
            <option>Todas</option>
            <option>Crítico</option>
            <option>Stock bajo</option>
          </select>
        </div>

        <div className="select-field">
          Depósito:
          <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}>
            <option>Todos</option>
            <option>Depósito Central</option>
            <option>Depósito Norte</option>
            <option>Depósito Sur</option>
          </select>
        </div>
      </div>

      {/* TARJETAS DE ALERTAS */}
      {filteredAlerts.length === 0 ? (
        <div className="placeholder-panel">
          <div className="p-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3>Todo bajo control</h3>
          <p>No se encontraron productos en estado de alerta bajo los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="alert-cards">
          {filteredAlerts.map((item) => (
            <div
              key={item.id}
              className={`alert-card ${item.priority === 'low' ? 'priority-low' : ''}`}
            >
              <div className="alert-card-head">
                <div>
                  <div className="alert-card-name">{item.name}</div>
                  <div className="alert-card-sku">{item.sku}</div>
                </div>
                <span className={`badge ${item.priority === 'crit' ? 'badge-red' : 'badge-amber'}`}>
                  <span className="badge-dot"></span>
                  {item.priorityLabel}
                </span>
              </div>

              <div className="alert-card-metrics">
                <div className={`alert-metric ${item.priority === 'crit' ? 'crit' : ''}`}>
                  <div className="n">{item.actual}</div>
                  <div className="l">Actual</div>
                </div>
                <div className="alert-metric">
                  <div className="n">{item.min}</div>
                  <div className="l">Mínimo</div>
                </div>
                <div className="alert-metric">
                  <div className="n">{item.suggested}</div>
                  <div className="l">Sugerido</div>
                </div>
              </div>

              <div className="alert-card-foot">
                <span className="alert-card-wh">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21V9l9-6 9 6v12" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                  {item.warehouse}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleOpenModal(item)}
                >
                  Generar reposición
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE REPOSICIÓN */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAlert ? `Generar Reposición — ${selectedAlert.name}` : 'Orden de Reposición Masiva'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmReposition}>
              Confirmar Orden
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmReposition}>
          {selectedAlert && (
            <div className="stock-preview" style={{ marginBottom: '16px' }}>
              <div className="sp-item">
                <div className="n" style={{ color: 'var(--crit)' }}>{selectedAlert.actual}</div>
                <div className="l">Stock Actual</div>
              </div>
              <div className="sp-arrow">→</div>
              <div className="sp-item">
                <div className="n" style={{ color: 'var(--green)' }}>
                  {Number(selectedAlert.actual) + Number(formData.cantidad || 0)}
                </div>
                <div className="l">Proyección Post-Orden</div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label>Cantidad a Reponer</label>
              <input
                type="number"
                min="1"
                required
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
              />
            </div>

            <div className="form-field">
              <label>Depósito Destino</label>
              <select
                value={formData.deposito}
                onChange={(e) => setFormData({ ...formData, deposito: e.target.value })}
              >
                <option>Depósito Central</option>
                <option>Depósito Norte</option>
                <option>Depósito Sur</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Prioridad de Despacho</label>
              <select
                value={formData.urgencia}
                onChange={(e) => setFormData({ ...formData, urgencia: e.target.value })}
              >
                <option value="Alta">Urgente / Inmediata</option>
                <option value="Normal">Normal</option>
                <option value="Baja">Programada</option>
              </select>
            </div>

            <div className="form-field">
              <label>Proveedor Asignado</label>
              <select
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              >
                <option>Distribuidora Musical Oficial</option>
                <option>Importadora del Norte S.A.</option>
                <option>Fender Musical Instruments Corp.</option>
                <option>Yamaha Music Latin America</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>Observaciones de Compra</label>
              <input
                type="text"
                placeholder="Ej. Prioridad alta por pedido pendiente de cliente..."
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Alertas_de_stock;