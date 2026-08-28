import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { exportToExcel } from '../utils/exportExcel';

function Alertas_de_stock() {
  const [alertas, setAlertas] = useState([]);
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  const [errorAlertas, setErrorAlertas] = useState(null);

  const [activeTab, setActiveTab] = useState('reposicion'); // 'reposicion' | 'actividad'
  const [activityFilter, setActivityFilter] = useState('Todas');
  const [activities, setActivities] = useState([]);
  
  const [ultimaLectura, setUltimaLectura] = useState('0');

  useEffect(() => {
    // 1. Sincronizá el estado inicial leyendo la clave al montar
    const storedLastRead = localStorage.getItem('alertasLeidas') || '0';
    setUltimaLectura(storedLastRead);

    const fetchAlertas = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/stock/alerts');
        if (!res.ok) throw new Error('Error al obtener alertas');
        const json = await res.json();
        setAlertas(json.data || []);
      } catch (err) {
        setErrorAlertas(err.message);
      } finally {
        setLoadingAlertas(false);
      }
    };

    const fetchActivities = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/system/activity');
        if (res.ok) {
          const json = await res.json();
          const mapped = (json.data || []).map((a) => {
            const dateObj = new Date(a.fecha);
            const timeStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} · ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            const id = `act-${a.id}`;
            return {
              id: id,
              title: a.titulo,
              text: a.descripcion,
              time: timeStr,
              category: a.tipo === 'MOVIMIENTOS' ? 'Movimientos' : 'Catálogo',
              type: a.typeLabel,
              rawDate: dateObj,
            };
          });
          setActivities(mapped);
        }
      } catch (err) {
        console.error('Error fetching activities:', err);
      }
    };

    fetchAlertas();
    fetchActivities();
  }, []);

  // Toast confirmaciones
  const [toastMessage, setToastMessage] = useState(null);

  // Modal Reposición puntual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const unreadActivityCount = useMemo(() => {
    return activities.filter((a) => a.rawDate.getTime() > parseInt(ultimaLectura, 10)).length;
  }, [activities, ultimaLectura]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportExcel = () => {
    if (!alertas || alertas.length === 0) {
      showToast('No hay productos que requieran reposición para exportar.');
      return;
    }

    try {
      setIsExporting(true);

      const formattedItems = alertas.map((row) => {
        const stockActual = Number(row.stock_actual ?? 0);
        const stockMin = Number(row.stock_minimo ?? 0);
        const isCrit = stockActual <= stockMin / 2;

        // Priorizar el código interno real del artículo
        const codigoInterno =
          row.codigo_interno ||
          row.codigo ||
          row.code ||
          row.articulo_codigo ||
          (row.articulo_id ? String(row.articulo_id).substring(0, 8) : 'S/C');

        return {
          codigo: codigoInterno,
          nombre: row.articulo_nombre || row.descripcion || 'Sin descripción',
          stockActual: stockActual,
          stockMin: stockMin,
          stockMax: Number(row.stock_maximo ?? 0),
          sugerido: Number(row.cantidad_sugerida ?? 0),
          deposito: row.deposito_nombre || 'Depósito Central',
          prioridad: isCrit ? 'Crítico' : 'Reposición',
        };
      });

      const today = new Date().toISOString().slice(0, 10);
      exportToExcel(formattedItems, `Reposicion_Stock_${today}.xlsx`);
      showToast('Listado exportado correctamente en formato tabla con estilos.');
    } catch (err) {
      console.error('Error exportando a Excel:', err);
      showToast('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setIsExporting(false);
    }
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
      const isUnread = act.rawDate.getTime() > parseInt(ultimaLectura, 10);
      if (activityFilter === 'Todas') return true;
      if (activityFilter === 'No leídas') return isUnread;
      if (activityFilter === 'Stock') return act.title.toLowerCase().includes('stock') || act.text.toLowerCase().includes('stock');
      if (activityFilter === 'Movimientos') return act.category === 'Movimientos';
      if (activityFilter === 'Catálogo') return act.category === 'Catálogo';
      return true;
    });
  }, [activities, activityFilter, ultimaLectura]);

  return (
    <div>
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
          {alertas.length > 0 && <span className="tab-btn-badge crit">{alertas.length}</span>}
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

      {/* ===================== TAB 1: REPOSICIÓN DE STOCK ===================== */}
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
                <div className="alert-summary-title">{alertas.length} productos requieren atención</div>
                <div className="alert-summary-sub">
                  Revisá el detalle y generá reposiciones para evitar quiebres de stock
                </div>
              </div>
            </div>
            <div className="alert-summary-stats">
              <div className="alert-summary-stat">
                <div className="n">{alertas.filter((a) => a.stock_actual <= a.stock_minimo / 2).length}</div>
                <div className="l">Críticos</div>
              </div>
              <div className="alert-summary-stat">
                <div className="n">{alertas.filter((a) => a.stock_actual > a.stock_minimo / 2).length}</div>
                <div className="l">Reposición</div>
              </div>
              <div className="alert-summary-stat">
                <div className="n">{new Set(alertas.map((a) => a.deposito_id)).size}</div>
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
            {loadingAlertas && <div style={{ padding: '20px', color: 'var(--gray-500)' }}>Cargando alertas críticas...</div>}
            {errorAlertas && <div style={{ padding: '20px', color: 'var(--red)' }}>Error: {errorAlertas}</div>}
            {!loadingAlertas && !errorAlertas && alertas.filter((a) => a.stock_actual <= a.stock_minimo / 2).length === 0 && (
              <div style={{ padding: '20px', color: 'var(--gray-500)' }}>No hay productos en estado crítico.</div>
            )}
            {!loadingAlertas && !errorAlertas && alertas.filter((a) => a.stock_actual <= a.stock_minimo / 2).map((card) => {
              const codigoCard = card.codigo_interno || card.codigo || card.code || card.articulo_codigo || (card.articulo_id ? String(card.articulo_id).substring(0, 8) : 'S/C');
              return (
                <div className="alert-card" key={`${card.articulo_id}_${card.deposito_id}`}>
                  <div className="alert-card-head">
                    <div>
                      <div className="alert-card-name">{card.articulo_nombre}</div>
                      <div className="alert-card-sku">Cód: {codigoCard}</div>
                    </div>
                    <span className="badge badge-red">
                      <span className="badge-dot"></span>Crítico
                    </span>
                  </div>

                  <div className="alert-card-metrics">
                    <div className="alert-metric crit">
                      <div className="n">{card.stock_actual}</div>
                      <div className="l">Actual</div>
                    </div>
                    <div className="alert-metric">
                      <div className="n">{card.stock_minimo}</div>
                      <div className="l">Mínimo</div>
                    </div>
                    <div className="alert-metric">
                      <div className="n">{card.stock_maximo}</div>
                      <div className="l">Máximo</div>
                    </div>
                    <div className="alert-metric suggest">
                      <div className="n">{card.cantidad_sugerida}</div>
                      <div className="l">Reponer</div>
                    </div>
                  </div>

                  <div className="alert-card-foot">
                    <span className="alert-card-wh">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
                        <path d="M3 8v8l9 5 9-5V8" />
                      </svg>
                      {card.deposito_nombre}
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenRepositionModal({
                        name: card.articulo_nombre,
                        code: codigoCard,
                        suggested: card.cantidad_sugerida,
                      })}
                    >
                      Generar reposición
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* LISTADO COMPLETO Y EXPORTAR A EXCEL */}
          <div className="section-heading">
            <div>
              <h2>Listado completo de reposición sugerida</h2>
              <span className="desc">
                Incluye productos críticos y en reposición — base para generar la orden de compra
              </span>
            </div>
            <button 
              className="btn btn-outline" 
              onClick={handleExportExcel}
              disabled={loadingAlertas || alertas.length === 0 || isExporting}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="m9 15 3 3 3-3M12 12v6" />
              </svg>
              {isExporting ? 'Exportando...' : 'Exportar a Excel'}
            </button>
          </div>

          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
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
                  {loadingAlertas && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>Cargando datos...</td>
                    </tr>
                  )}
                  {errorAlertas && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--red)' }}>Error: {errorAlertas}</td>
                    </tr>
                  )}
                  {!loadingAlertas && !errorAlertas && alertas.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>No hay productos que requieran reposición.</td>
                    </tr>
                  )}
                  {!loadingAlertas && !errorAlertas && alertas.map((row) => {
                    const isCrit = row.stock_actual <= row.stock_minimo / 2;
                    const cod = row.codigo_interno || row.codigo || row.code || row.articulo_codigo || (row.articulo_id ? String(row.articulo_id).substring(0, 8) : 'S/C');
                    return (
                      <tr key={`${row.articulo_id}_${row.deposito_id}`}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--gray-600)' }}>{cod}</td>
                        <td className="cell-strong">{row.articulo_nombre}</td>
                        <td className={`stock-cell ${isCrit ? 'crit' : 'low'}`}>
                          {row.stock_actual}
                        </td>
                        <td>{row.stock_minimo}</td>
                        <td>{row.stock_maximo}</td>
                        <td className="cell-strong">{row.cantidad_sugerida_reposicion}</td>
                        <td>{row.deposito_nombre}</td>
                        <td>
                          <span className={`badge ${isCrit ? 'badge-red' : 'badge-amber'}`}>
                            <span className="badge-dot"></span>
                            {isCrit ? 'Crítico' : 'Reposición'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
                No hay actividad reciente
              </div>
            ) : (
              filteredActivities.map((act) => {
                const isUnread = act.rawDate.getTime() > parseInt(ultimaLectura, 10);
                return (
                  <div
                    key={act.id}
                    className={`notif-page-item ${isUnread ? 'unread' : ''}`}
                  >
                    <div className={`notif-page-icon ${!isUnread ? 'ok' : act.type}`}>
                      {(!isUnread || act.type === 'ok') && (
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                      {isUnread && act.type === 'info' && (
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 7h13l-3-3M17 17H4l3 3" />
                        </svg>
                      )}
                      {isUnread && act.type === 'crit' && (
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
              );
            })
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