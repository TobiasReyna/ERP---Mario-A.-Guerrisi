import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';

function Movimientos() {
  const [movements, setMovements] = useState([]);


  // Filtros
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedWarehouse, setSelectedWarehouse] = useState('Todos');
  const [selectedUser, setSelectedUser] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast confirmación
  const [confirmToast, setConfirmToast] = useState(null);

  // Modal registrar movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Real DB States
  const [dbArticles, setDbArticles] = useState([]);
  const [dbDeposits, setDbDeposits] = useState([]);
  const [dbReasons, setDbReasons] = useState([]);

const [selectedArticleId, setSelectedArticleId] = useState('');
  const [selectedDepositId, setSelectedDepositId] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [baseStock, setBaseStock] = useState(0);

  const [movementType, setMovementType] = useState('entrada');
  const [qty, setQty] = useState(5);
  const [user, setUser] = useState('Juan Pérez');
  const [hasReasonError, setHasReasonError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const fetchHistory = async (articles) => {
    try {
      const allHistories = await Promise.all(
        articles.map(art =>
          fetch(`http://localhost:3001/api/stock/${art.id}/history`)
            .then(res => res.json())
            .then(json => (json.data || []).map(m => ({ ...m, product: art.descripcion })))
            .catch(() => [])
        )
      );

      const combined = allHistories.flat();
      
      const formatted = combined.map((m, i) => {
        const dateObj = new Date(m.fecha);
        const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        
        let typeLabel = m.tipo_movimiento;
        let typeClass = '';
        let qtyStr = '';
        let reason = '';
        let warehouse = '';
        let stockChange = '-';

        if (m.tipo_movimiento === 'AJUSTE') {
           if (m.cantidad_afectada >= 0) {
             typeLabel = 'AJUSTE POS.';
             typeClass = 'type-ajuste-pos';
             qtyStr = `+${m.cantidad_afectada}`;
           } else {
             typeLabel = 'AJUSTE NEG.';
             typeClass = 'type-ajuste-neg';
             qtyStr = `${m.cantidad_afectada}`;
           }
           const motivoMatch = m.detalle.match(/Motivo: (.+?) en (.+?)\. Stock anterior/);
           if (motivoMatch) {
              reason = motivoMatch[1];
              warehouse = motivoMatch[2];
           } else {
              reason = m.detalle;
           }
           const stockMatch = m.detalle.match(/Stock anterior: (.+?) -> Nuevo: (.+)/);
           if (stockMatch) {
              stockChange = `${stockMatch[1]} → ${stockMatch[2]}`;
           }
        } else if (m.tipo_movimiento === 'TRANSFERENCIA') {
           typeLabel = 'TRANSFERENCIA';
           typeClass = 'type-transferencia';
           qtyStr = `${m.cantidad_afectada}`;
           const depMatch = m.detalle.match(/De: (.+?) Hacia: (.+)/);
           if (depMatch) {
             warehouse = `${depMatch[1]} → ${depMatch[2]}`;
           }
           reason = 'Transferencia'; 
           stockChange = '-';
        }

        return {
           id: `hist-${i}-${dateObj.getTime()}`,
           date: dateFormatted,
           rawDate: dateObj,
           product: m.product,
           type: typeLabel,
           typeClass,
           warehouse,
           qty: qtyStr,
           reason,
           user: 'Juan Pérez',
           stockChange
        };
      });

      formatted.sort((a, b) => b.rawDate - a.rawDate);
      setMovements(formatted);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [resArt, resDep, resRea] = await Promise.all([
          fetch('http://localhost:3001/api/articles'),
          fetch('http://localhost:3001/api/deposits'),
          fetch('http://localhost:3001/api/adjustment-reasons')
        ]);
        const art = await resArt.json();
        const dep = await resDep.json();
        const rea = await resRea.json();
        
        setDbArticles(art.data || []);
        setDbDeposits(dep.data || []);
        setDbReasons(rea.data || []);

        if (art.data?.length > 0) setSelectedArticleId(art.data[0].id);
        if (dep.data?.length > 0) setSelectedDepositId(dep.data[0].id);

        if (art.data && art.data.length > 0) {
          await fetchHistory(art.data);
        }
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (selectedArticleId && selectedDepositId) {
      fetch(`http://localhost:3001/api/stock/${selectedArticleId}`)
        .then(res => res.json())
        .then(json => {
          if (json.data && json.data.desglose) {
            const depStock = json.data.desglose.find(d => d.deposito_id === selectedDepositId);
            setBaseStock(depStock ? depStock.cantidad : 0);
          } else {
            setBaseStock(0);
          }
        })
        .catch(err => {
          console.error('Error fetching stock:', err);
          setBaseStock(0);
        });
    }
  }, [selectedArticleId, selectedDepositId]);

  const isAdjustment = movementType === 'ajuste-pos' || movementType === 'ajuste-neg';

  const calculatedResultStock = useMemo(() => {
    const numQty = Number(qty) || 0;
    if (movementType === 'entrada' || movementType === 'ajuste-pos') return baseStock + numQty;
    if (['salida', 'ajuste-neg', 'transferencia'].includes(movementType)) return baseStock - numQty;
    return baseStock;
  }, [baseStock, qty, movementType]);

  const isNegativeStock = calculatedResultStock < 0;

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
    if (dbArticles.length > 0) setSelectedArticleId(dbArticles[0].id);
    if (dbDeposits.length > 0) setSelectedDepositId(dbDeposits[0].id);
    setSelectedReasonId('');
    setMovementType('entrada');
    setQty(5);
    setUser('Juan Pérez');
    setHasReasonError(false);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleConfirmMovement = async (e) => {
    e.preventDefault();

    // Validación HU-02: Motivo obligatorio para ajustes
    if (isAdjustment && !selectedReasonId) {
      setHasReasonError(true);
      return;
    }

    setHasReasonError(false);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      let endpoint = 'http://localhost:3001/api/stock/adjust';
      let payload = {
        articulo_id: selectedArticleId, 
        deposito_id: selectedDepositId,          
        cantidad_anterior: baseStock,
        cantidad_nueva: calculatedResultStock,
        motivo_id: selectedReasonId || null                
      };

      if (!isAdjustment) {
        endpoint = 'http://localhost:3001/api/stock/transfer';
        const targetDeposit = dbDeposits.find(d => d.id !== selectedDepositId);
        const targetId = targetDeposit ? targetDeposit.id : selectedDepositId;
        payload = {
           articulo_id: selectedArticleId,
           deposito_origen_id: selectedDepositId,
           deposito_destino_id: targetId,
           cantidad: Number(qty)
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al registrar el movimiento en el servidor.');
      }

      // -- Actualizamos el historial real --
      await fetchHistory(dbArticles);

      // Limpiamos el formulario y cerramos
      if (dbArticles.length > 0) setSelectedArticleId(dbArticles[0].id);
      if (dbDeposits.length > 0) setSelectedDepositId(dbDeposits[0].id);
      setSelectedReasonId('');
      setMovementType('entrada');
      setQty(5);
      setUser('Juan Pérez');

      setIsModalOpen(false);
      showToast('Movimiento registrado correctamente en la base de datos.');

    } catch (err) {
      setSubmitError(err.message);
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
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmMovement} disabled={isSubmitting || isNegativeStock}>
              {isSubmitting ? 'Registrando...' : 'Registrar movimiento'}
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmMovement}>
          {submitError && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#ffebee', color: 'var(--red)', borderRadius: '4px', fontSize: '13px' }}>
              <strong>Error:</strong> {submitError}
            </div>
          )}
          <div className="form-row">
            <div className="form-field full">
              <label>Producto<span className="req">*</span></label>
              <select
                value={selectedArticleId}
                onChange={(e) => setSelectedArticleId(e.target.value)}
              >
                {dbArticles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion} — {p.codigo_interno}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Depósito<span className="req">*</span></label>
              <select
                value={selectedDepositId}
                onChange={(e) => setSelectedDepositId(e.target.value)}
              >
                {dbDeposits.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
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
                value={selectedReasonId}
                onChange={(e) => {
                  setSelectedReasonId(e.target.value);
                  setHasReasonError(false);
                }}
              >
                <option value="">Seleccionar motivo…</option>
                {dbReasons.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
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
                <div className="n" style={{ color: movementType.includes('neg') || movementType === 'salida' || movementType === 'transferencia' ? 'var(--crit)' : 'var(--green)' }}>
                  {calculatedResultStock}
                </div>
                <div className="l">Stock resultante</div>
              </div>
            </div>
            {isNegativeStock && (
              <span className="field-error" style={{ marginTop: '8px', display: 'block' }}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                Stock insuficiente.
              </span>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Movimientos;