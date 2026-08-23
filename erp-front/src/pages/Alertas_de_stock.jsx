import { useState, useMemo } from 'react';
import Modal from '../components/Modal';

const INITIAL_CRITICAL_CARDS = [
  { id: 1, name: 'Taylor 214ce', code: 'COD-0004', sku: 'GTR-TAY-008', actual: 4, min: 6, max: 14, suggested: 10, warehouse: 'Consolidado', priority: 'crit' },
  { id: 2, name: 'Ibanez GSR200', code: 'COD-0006', sku: 'BAJ-IBA-010', actual: 3, min: 6, max: 12, suggested: 9, warehouse: 'Consolidado', priority: 'crit' },
  { id: 3, name: 'Yamaha P-145', code: 'COD-0007', sku: 'KEY-YAM-003', actual: 1, min: 3, max: 8, suggested: 7, warehouse: 'Tienda Central', priority: 'crit' },
  { id: 4, name: 'Pearl Export Series', code: 'COD-0010', sku: 'BAT-PEA-012', actual: 2, min: 4, max: 9, suggested: 7, warehouse: 'Consolidado', priority: 'crit' },
];

const INITIAL_REPLENISHMENT_TABLE = [
  { id: 1, name: 'Taylor 214ce', actual: 4, min: 6, max: 14, suggested: 10, scope: 'Consolidado', priority: 'Crítico', priorityClass: 'badge-red' },
  { id: 2, name: 'Ibanez GSR200', actual: 3, min: 6, max: 12, suggested: 9, scope: 'Consolidado', priority: 'Crítico', priorityClass: 'badge-red' },
  { id: 3, name: 'Yamaha P-145', actual: 1, min: 3, max: 8, suggested: 7, scope: 'Tienda Central', priority: 'Crítico', priorityClass: 'badge-red' },
  { id: 4, name: 'Roland TD-17', actual: 4, min: 4, max: 10, suggested: 6, scope: 'Consolidado', priority: 'Crítico', priorityClass: 'badge-red' },
  { id: 5, name: 'Pearl Export Series', actual: 2, min: 4, max: 9, suggested: 7, scope: 'Consolidado', priority: 'Crítico', priorityClass: 'badge-red' },
  { id: 6, name: 'Yamaha YTR-2330', actual: 2, min: 5, max: 10, suggested: 8, scope: 'Consolidado', priority: 'Crítico', priorityClass: 'badge-red' },
  { id: 7, name: 'Gibson Les Paul Studio', actual: 6, min: 4, max: 10, suggested: 4, scope: 'Consolidado', priority: 'Reposición', priorityClass: 'badge-amber' },
  { id: 8, name: 'Fender Player Jazz Bass', actual: 8, min: 5, max: 12, suggested: 4, scope: 'Consolidado', priority: 'Reposición', priorityClass: 'badge-amber' },
  { id: 9, name: 'Marshall MG30GFX', actual: 9, min: 5, max: 14, suggested: 5, scope: 'Consolidado', priority: 'Reposición', priorityClass: 'badge-amber' },
  { id: 10, name: 'Yamaha HS5', actual: 6, min: 5, max: 12, suggested: 6, scope: 'Consolidado', priority: 'Reposición', priorityClass: 'badge-amber' },
];

const INITIAL_ACTIVITIES = [
  { id: 1, title: 'Movimiento registrado', text: 'Se registró un ajuste negativo de stock para Fender Stratocaster Player (motivo: Rotura).', time: 'Hace 32 minutos', category: 'Movimientos', type: 'ok', unread: true },
  { id: 2, title: 'Transferencia completada', text: 'Se transfirieron 2 unidades de Roland TD-17 de Tienda Central a Galería Margalef.', time: 'Ayer · 17:30', category: 'Movimientos', type: 'info', unread: false },
  { id: 3, title: 'Producto actualizado', text: 'Se actualizó el precio de Fender Stratocaster Player a $1.250.000.', time: '15/08/2026 · 09:20', category: 'Catálogo', type: 'ok', unread: false },
  { id: 4, title: 'Error de validación del catálogo', text: 'Intento de carga con EAN-13 inválido en el formulario de nuevo producto.', time: '14/08/2026 · 12:05', category: 'Catálogo', type: 'crit', unread: false },
];

function Alertas_de_stock() {
  const [activeTab, setActiveTab] = useState('reposicion'); // 'reposicion' | 'actividad'
  const [activityFilter, setActivityFilter] = useState('Todas');
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);

  // Toast confirmaciones
  const [toastMessage, setToastMessage] = useState(null);

  // Modal Reposición puntual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);

  const unreadActivityCount = useMemo(() => activities.filter((a) => a.unread).length, [activities]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportExcel = () => {
    showToast('Listado de reposición exportado correctamente en formato Excel.');
  };

  const handleOpenRepositionModal = (item) => {
    setSelectedProduct(item);
    setOrderQty(item.suggested || 5);
    setIsModalOpen(true);
  };

  const handleConfirmReposition = (e) => {
    e.preventDefault();
    setIsModalOpen(false);
    showToast(`Orden de reposición de ${orderQty} unidades generada para ${selectedProduct?.name}.`);
  };

  // Filtrado pestaña actividad
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (activityFilter === 'Todas') return true;
      if (activityFilter === 'No leídas') return act.unread;
      if (activityFilter === 'Stock') return act.title.toLowerCase().includes('stock') || act.text.toLowerCase().includes('stock');
      if (activityFilter === 'Movimientos') return act.category === 'Movimientos';
      if (activityFilter === 'Catálogo') return act.category === 'Catálogo';
      return true;
    });
  }, [activities, activityFilter]);

  return (
    <div>
      {/* ENCABEZADO */}
      <div className="section-heading">
        <div>
          <h2>Alertas y notificaciones</h2>
          <span className="desc">
            Reposición de stock (HU-06) y actividad general del sistema, en una sola pantalla
          </span>
        </div>
      </div>

      {/* BANNER DE CONFIRMACIÓN */}
      {toastMessage && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PESTAÑAS DUALES */}
      <div className="tab-rail">
        <button
          className={`tab-btn ${activeTab === 'reposicion' ? 'active' : ''}`}
          onClick={() => setActiveTab('reposicion')}
        >
          Reposición de stock
          <span className="tab-btn-badge crit">10</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'actividad' ? 'active' : ''}`}
          onClick={() => setActiveTab('actividad')}
        >
          Actividad del sistema
          {unreadActivityCount > 0 && (
            <span className="tab-btn-badge unread">{unreadActivityCount}</span>
          )}
        </button>
      </div>

      {/* ===================== TAB 1: REPOSICIÓN DE STOCK (HU-06) ===================== */}
      {activeTab === 'reposicion' && (
        <div>
          {/* TARJETA RESUMEN */}
          <div className="alert-summary-card">
            <div className="alert-summary-left">
              <div className="alert-summary-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div>
                <div className="alert-summary-title">10 productos requieren atención</div>
                <div className="alert-summary-sub">
                  Revisá el detalle y generá reposiciones para evitar quiebres de stock
                </div>
              </div>
            </div>
            <div className="alert-summary-stats">
              <div className="alert-summary-stat">
                <div className="n">6</div>
                <div className="l">Críticos</div>
              </div>
              <div className="alert-summary-stat">
                <div className="n">4</div>
                <div className="l">Reposición</div>
              </div>
              <div className="alert-summary-stat">
                <div className="n">2</div>
                <div className="l">Depósitos</div>
              </div>
            </div>
          </div>

          {/* FÓRMULA EXPLICATIVA DE REPOSICIÓN */}
          <div className="formula-strip">
            <span className="tag">Stock máximo</span>
            <span className="op">−</span>
            <span className="tag">Stock actual</span>
            <span className="op">=</span>
            <span className="tag" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
              Reposición sugerida
            </span>
          </div>

          {/* TARJETAS DE PRODUCTOS CRÍTICOS */}
          <div className="section-heading">
            <div>
              <h2>Productos críticos</h2>
              <span className="desc">Stock actual por debajo o igual al mínimo configurado</span>
            </div>
          </div>

          <div className="alert-cards">
            {INITIAL_CRITICAL_CARDS.map((card) => (
              <div className="alert-card" key={card.id}>
                <div className="alert-card-head">
                  <div>
                    <div className="alert-card-name">{card.name}</div>
                    <div className="alert-card-sku">{card.code} · {card.sku}</div>
                  </div>
                  <span className="badge badge-red">
                    <span className="badge-dot"></span>Crítico
                  </span>
                </div>

                <div className="alert-card-metrics">
                  <div className="alert-metric crit">
                    <div className="n">{card.actual}</div>
                    <div className="l">Actual</div>
                  </div>
                  <div className="alert-metric">
                    <div className="n">{card.min}</div>
                    <div className="l">Mínimo</div>
                  </div>
                  <div className="alert-metric">
                    <div className="n">{card.max}</div>
                    <div className="l">Máximo</div>
                  </div>
                  <div className="alert-metric suggest">
                    <div className="n">{card.suggested}</div>
                    <div className="l">Reponer</div>
                  </div>
                </div>

                <div className="alert-card-foot">
                  <span className="alert-card-wh">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
                      <path d="M3 8v8l9 5 9-5V8" />
                    </svg>
                    {card.warehouse}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleOpenRepositionModal(card)}
                  >
                    Generar reposición
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* LISTADO COMPLETO Y EXPORTAR A EXCEL */}
          <div className="section-heading">
            <div>
              <h2>Listado completo de reposición sugerida</h2>
              <span className="desc">
                Incluye productos críticos y en reposición — base para generar la orden de compra
              </span>
            </div>
            <button className="btn btn-outline" onClick={handleExportExcel}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="m9 15 3 3 3-3M12 12v6" />
              </svg>
              Exportar a Excel
            </button>
          </div>

          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock actual</th>
                    <th>Mínimo</th>
                    <th>Máximo</th>
                    <th>Reposición sugerida</th>
                    <th>Alcance</th>
                    <th>Prioridad</th>
                  </tr>
                </thead>
                <tbody>
                  {INITIAL_REPLENISHMENT_TABLE.map((row) => (
                    <tr key={row.id}>
                      <td className="cell-strong">{row.name}</td>
                      <td className={`stock-cell ${row.priority === 'Crítico' ? 'crit' : 'low'}`}>
                        {row.actual}
                      </td>
                      <td>{row.min}</td>
                      <td>{row.max}</td>
                      <td className="cell-strong">{row.suggested}</td>
                      <td>{row.scope}</td>
                      <td>
                        <span className={`badge ${row.priorityClass}`}>
                          <span className="badge-dot"></span>
                          {row.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: ACTIVIDAD DEL SISTEMA ===================== */}
      {activeTab === 'actividad' && (
        <div>
          <div className="notif-filter-rail">
            {['Todas', 'No leídas', 'Stock', 'Movimientos', 'Catálogo'].map((cat) => (
              <button
                key={cat}
                className={`category-chip ${activityFilter === cat ? 'active' : ''}`}
                onClick={() => setActivityFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="notif-page-list">
            {filteredActivities.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-500)' }}>
                No hay actividades registradas bajo este filtro.
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className={`notif-page-item ${act.unread ? 'unread' : ''}`}
                  onClick={() => {
                    setActivities(activities.map((a) => (a.id === act.id ? { ...a, unread: false } : a)));
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={`notif-page-icon ${act.type}`}>
                    {act.type === 'ok' && (
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                    {act.type === 'info' && (
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 7h13l-3-3M17 17H4l3 3" />
                      </svg>
                    )}
                    {act.type === 'crit' && (
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="notif-page-body">
                    <div className="notif-page-title">{act.title}</div>
                    <div className="notif-page-text">{act.text}</div>
                    <div className="notif-page-time">{act.time}</div>
                  </div>
                  <span className="notif-page-cat">{act.category}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL GENERAR REPOSICIÓN */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? `Generar Reposición: ${selectedProduct.name}` : 'Orden de Reposición'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmReposition}>
              Confirmar orden
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmReposition}>
          <div className="form-row">
            <div className="form-field full">
              <label>Producto a reponer</label>
              <input type="text" disabled value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.code})` : ''} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Cantidad sugerida / a pedir *</label>
              <input
                type="number"
                min="1"
                required
                value={orderQty}
                onChange={(e) => setOrderQty(Number(e.target.value))}
              />
            </div>
            <div className="form-field">
              <label>Depósito destino</label>
              <select defaultValue="Tienda Central">
                <option>Tienda Central</option>
                <option>Galería Margalef</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Alertas_de_stock;