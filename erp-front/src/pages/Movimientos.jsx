import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { supabase } from '../config/supabaseClient';

function Movimientos() {
  const [allMovements, setAllMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filtros
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedWarehouse, setSelectedWarehouse] = useState('Todos');
  const [selectedUser, setSelectedUser] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast confirmación
  const [confirmToast, setConfirmToast] = useState(null);

  // Modal registrar movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Catálogos maestros
  const [dbFetchProd, setDbFetchProd] = useState([]);
  const [dbFetchDepo, setDbFetchDepo] = useState([]);
  const [dbFetchUsu, setDbFetchUsu] = useState([]);
  const [dbFetchMot, setDbFetchMot] = useState([]);

  // Formulario modal
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [selectedDepositId, setSelectedDepositId] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [selectedDestinationDepositId, setSelectedDestinationDepositId] = useState('');
  const [baseStock, setBaseStock] = useState(0);

  const [movementType, setMovementType] = useState('entrada');
  const [qty, setQty] = useState(5);
  const [user, setUser] = useState('');
  const [hasReasonError, setHasReasonError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // =========================================================================
  // 1. CARGA DE HISTORIAL (AJUSTES + TRANSFERENCIAS)
  // =========================================================================
  const fetchAllMovements = async () => {
    setIsLoading(true);
    try {
      const [artRes, depRes, usuRes, motRes, ajRes, trRes] = await Promise.all([
        supabase.from('articulos').select('id, descripcion, modelo'),
        supabase.from('depositos').select('id, nombre'),
        supabase.from('usuarios').select('id, nombre'),
        supabase.from('motivos_ajustes').select('id, nombre'),
        supabase.from('ajustes_stock').select('*'),
        supabase.from('transferencias_stock').select('*'),
      ]);

      const artMap = new Map((artRes.data || []).map((a) => [a.id, a]));
      const depMap = new Map((depRes.data || []).map((d) => [d.id, d.nombre]));
      const usuMap = new Map((usuRes.data || []).map((u) => [u.id, u.nombre]));
      const motMap = new Map((motRes.data || []).map((m) => [m.id, m.nombre]));

      const lista = [];

      // A. Mapeo de Ajustes (Tienen stock anterior y nuevo)
      if (ajRes.data) {
        ajRes.data.forEach((a) => {
          const dateObj = new Date(a.fecha_hora_registro);
          const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

          const art = artMap.get(a.articulo_id);
          const depNombre = depMap.get(a.deposito_id) || 'Depósito';
          const usuNombre = usuMap.get(a.usuario_id) || 'Administrador de Sistema';
          const motNombre = motMap.get(a.motivo_id) || 'Ajuste de inventario';

          const cantAnt = a.cantidad_anterior ?? 0;
          const cantNue = a.cantidad_nueva ?? 0;
          const delta = cantNue - cantAnt;
          const tipoLabel = delta >= 0 ? 'Ajuste positivo' : 'Ajuste negativo';

          lista.push({
            id: `aj-${a.id}`,
            rawDate: dateObj,
            date: dateFormatted,
            product: art?.descripcion || 'Producto no especificado',
            model: art?.modelo || 'Estándar',
            type: tipoLabel,
            warehouse: depNombre,
            qty: delta >= 0 ? `+${delta}` : `${delta}`,
            reason: motNombre,
            user: usuNombre,
            stockChange: `${cantAnt} → ${cantNue}`,
          });
        });
      }

      // B. Mapeo de Transferencias
      if (trRes.data) {
        trRes.data.forEach((t) => {
          const dateObj = new Date(t.fecha_hora_registro);
          const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

          const art = artMap.get(t.articulo_id);
          const origen = depMap.get(t.deposito_origen_id) || 'Origen';
          const destino = depMap.get(t.deposito_destino_id) || 'Destino';
          const usuNombre = usuMap.get(t.usuario_id) || 'Usuario de Sistema';
          const motNombre = motMap.get(t.motivo_id) || 'Transferencia';

          const isSameWarehouse = t.deposito_origen_id === t.deposito_destino_id;
          const warehouseDisplay = isSameWarehouse ? origen : `${origen} → ${destino}`;

          lista.push({
            id: `tr-${t.id}`,
            rawDate: dateObj,
            date: dateFormatted,
            product: art?.descripcion || 'Producto no especificado',
            model: art?.modelo || 'Estándar',
            type: 'Transferencia',
            warehouse: warehouseDisplay,
            qty: `${t.cantidad}`,
            reason: motNombre,
            user: usuNombre,
            stockChange: '-',
          });
        });
      }

      lista.sort((a, b) => b.rawDate - a.rawDate);
      setAllMovements(lista);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 2. CARGA DE CATÁLOGOS MAESTROS
  // =========================================================================
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [pRes, dRes, uRes, mRes] = await Promise.all([
          supabase.from('articulos').select('*').eq('estado', true),
          supabase.from('depositos').select('*'),
          supabase.from('usuarios').select('*'),
          supabase.from('motivos_ajustes').select('*'),
        ]);

        if (pRes.data && pRes.data.length > 0) {
          setDbFetchProd(pRes.data);
          setSelectedArticleId(pRes.data[0].id);
        }
        if (dRes.data && dRes.data.length > 0) {
          setDbFetchDepo(dRes.data);
          setSelectedDepositId(dRes.data[0].id);
        }
        if (uRes.data && uRes.data.length > 0) {
          setDbFetchUsu(uRes.data);
          setUser(uRes.data[0].id);
        }
        if (mRes.data) {
          setDbFetchMot(mRes.data);
          if (mRes.data.length > 0) setSelectedReasonId(mRes.data[0].id);
        }
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };

    loadCatalogs();
    fetchAllMovements();
  }, []);

  // Obtener stock actual de la combinación Artículo-Depósito
  const fetchCurrentStock = async () => {
    if (!selectedArticleId || !selectedDepositId) return;

    try {
      const { data, error } = await supabase
        .from('existencias')
        .select('cantidad')
        .eq('articulo_id', selectedArticleId)
        .eq('deposito_id', selectedDepositId)
        .maybeSingle();

      if (error) throw error;
      setBaseStock(data?.cantidad ?? 0);
    } catch (err) {
      console.error('Error obteniendo existencias:', err);
      setBaseStock(0);
    }
  };

  useEffect(() => {
    fetchCurrentStock();
  }, [selectedArticleId, selectedDepositId]);

  // =========================================================================
  // 3. CÁLCULO DE STOCK RESULTANTE
  // =========================================================================
  const isAdjustment = movementType === 'ajuste-pos' || movementType === 'ajuste-neg';

  const calculatedResultStock = useMemo(() => {
    const numQty = Number(qty) || 0;
    if (movementType === 'entrada' || movementType === 'ajuste-pos') return baseStock + numQty;
    if (['salida', 'ajuste-neg', 'transferencia'].includes(movementType)) return baseStock - numQty;
    return baseStock;
  }, [baseStock, qty, movementType]);

  const isNegativeStock = calculatedResultStock < 0;

  // =========================================================================
  // 4. FILTRADO REACTIVO
  // =========================================================================
  const filteredMovements = useMemo(() => {
    return allMovements.filter((mov) => {
      const matchesType =
        selectedType === 'Todos' ||
        (selectedType === 'Entrada' && mov.type === 'Ajuste positivo') ||
        (selectedType === 'Salida' && mov.type === 'Ajuste negativo') ||
        mov.type.toLowerCase().includes(selectedType.toLowerCase());

      const matchesWarehouse =
        selectedWarehouse === 'Todos' ||
        mov.warehouse.toLowerCase().includes(selectedWarehouse.toLowerCase());

      const matchesUser =
        selectedUser === 'Todos' || mov.user === selectedUser;

      const matchesSearch =
        searchQuery.trim() === '' ||
        mov.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mov.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mov.model.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesType && matchesWarehouse && matchesUser && matchesSearch;
    });
  }, [allMovements, selectedType, selectedWarehouse, selectedUser, searchQuery]);

  const showToast = (msg) => {
    setConfirmToast(msg);
    setTimeout(() => setConfirmToast(null), 4000);
  };

  const handleOpenModal = () => {
    if (dbFetchProd.length > 0) setSelectedArticleId(dbFetchProd[0].id);
    if (dbFetchDepo.length > 0) setSelectedDepositId(dbFetchDepo[0].id);
    if (dbFetchUsu.length > 0) setUser(dbFetchUsu[0].id);
    if (dbFetchMot.length > 0) setSelectedReasonId(dbFetchMot[0].id);
    setSelectedDestinationDepositId('');
    setMovementType('entrada');
    setQty(5);
    setHasReasonError(false);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  // =========================================================================
  // 5. REGISTRO SEGURO A TRAVÉS DEL BACKEND (Bypasea RLS)
  // =========================================================================
  const handleConfirmMovement = async (e) => {
    e.preventDefault();

    if (isAdjustment && !selectedReasonId) {
      setHasReasonError(true);
      return;
    }
    if (movementType === 'transferencia' && !selectedDestinationDepositId) {
      setSubmitError('Debes seleccionar un depósito destino para la transferencia.');
      return;
    }

    setHasReasonError(false);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const activeUser = user || (dbFetchUsu.length > 0 ? dbFetchUsu[0].id : null);

      if (movementType === 'transferencia') {
        // Transferencia Inter-depósito
        const res = await fetch('http://localhost:3001/api/stock/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articulo_id: selectedArticleId,
            deposito_origen_id: selectedDepositId,
            deposito_destino_id: selectedDestinationDepositId,
            cantidad: Number(qty),
            usuario_id: activeUser,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Error en la transferencia');

        // Actualizar existencias en memoria/base de datos
        await supabase
          .from('existencias')
          .update({ cantidad: baseStock - Number(qty) })
          .eq('articulo_id', selectedArticleId)
          .eq('deposito_id', selectedDepositId);

        const { data: destData } = await supabase
          .from('existencias')
          .select('cantidad')
          .eq('articulo_id', selectedArticleId)
          .eq('deposito_id', selectedDestinationDepositId)
          .maybeSingle();

        if (destData) {
          await supabase
            .from('existencias')
            .update({ cantidad: (destData.cantidad || 0) + Number(qty) })
            .eq('articulo_id', selectedArticleId)
            .eq('deposito_id', selectedDestinationDepositId);
        } else {
          await supabase.from('existencias').insert([
            {
              articulo_id: selectedArticleId,
              deposito_id: selectedDestinationDepositId,
              cantidad: Number(qty),
            },
          ]);
        }
      } else {
        // Ajuste / Entrada / Salida (Se guarda en ajustes_stock vía Backend)
        const res = await fetch('http://localhost:3001/api/stock/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articulo_id: selectedArticleId,
            deposito_id: selectedDepositId,
            cantidad_anterior: Number(baseStock),
            cantidad_nueva: Number(calculatedResultStock),
            motivo_id: selectedReasonId || dbFetchMot[0]?.id,
            usuario_id: activeUser,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Error al registrar ajuste');

        // Actualizar tabla existencias
        const { data: existRecord } = await supabase
          .from('existencias')
          .select('cantidad')
          .eq('articulo_id', selectedArticleId)
          .eq('deposito_id', selectedDepositId)
          .maybeSingle();

        if (existRecord) {
          await supabase
            .from('existencias')
            .update({ cantidad: Number(calculatedResultStock) })
            .eq('articulo_id', selectedArticleId)
            .eq('deposito_id', selectedDepositId);
        } else {
          await supabase.from('existencias').insert([
            {
              articulo_id: selectedArticleId,
              deposito_id: selectedDepositId,
              cantidad: Number(calculatedResultStock),
            },
          ]);
        }
      }

      await fetchAllMovements();
      await fetchCurrentStock();

      setIsModalOpen(false);
      showToast('Movimiento registrado y stock actualizado con éxito.');
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
          <span className="desc">
            Entradas, salidas, ajustes y transferencias entre Tienda Central y Galería Margalef
          </span>
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
            <option value="Todos">Todos los depósitos</option>
            {dbFetchDepo.map((d) => (
              <option key={d.id} value={d.nombre}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="select-field">
          Usuario:
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="Todos">Todos los usuarios</option>
            {dbFetchUsu.map((u) => (
              <option key={u.id} value={u.nombre}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="search-input" style={{ maxWidth: '240px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar producto o modelo..."
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
                <th>Modelo</th>
                <th>Depósito</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
                <th>Stock ant. → nuevo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
                    Cargando movimientos...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
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
                    <td>{mov.model}</td>
                    <td>{mov.warehouse}</td>
                    <td className="cell-strong">{mov.qty}</td>
                    <td>{mov.reason}</td>
                    <td>{mov.user}</td>
                    <td
                      className="cell-mono"
                      style={{
                        fontWeight: '700',
                        color: mov.stockChange !== '-' ? 'var(--gray-900)' : 'var(--gray-400)',
                      }}
                    >
                      {mov.stockChange}
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
                {dbFetchProd.map((p) => (
                  <option key={p.id} value={p.id}>{p.descripcion}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Depósito Origen<span className="req">*</span></label>
              <select
                value={selectedDepositId}
                onChange={(e) => setSelectedDepositId(e.target.value)}
              >
                {dbFetchDepo.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
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
                <option value="entrada">Entrada (+)</option>
                <option value="salida">Salida (-)</option>
                <option value="ajuste-pos">Ajuste positivo (+)</option>
                <option value="ajuste-neg">Ajuste negativo (-)</option>
                <option value="transferencia">Transferencia entre depósitos</option>
              </select>
            </div>
          </div>

          {movementType === 'transferencia' && (
            <div className="form-row">
              <div className="form-field full">
                <label>Depósito Destino<span className="req">*</span></label>
                <select
                  value={selectedDestinationDepositId}
                  onChange={(e) => setSelectedDestinationDepositId(e.target.value)}
                >
                  <option value="" disabled>Selecciona el depósito destino</option>
                  {dbFetchDepo
                    .filter((d) => d.id !== selectedDepositId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                </select>
              </div>
            </div>
          )}

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
              <label>Usuario responsable<span className="req">*</span></label>
              <select value={user} onChange={(e) => setUser(e.target.value)}>
                {dbFetchUsu.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
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
                {dbFetchMot.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>

              {!isAdjustment && (
                <span className="field-hint">Opcional para entradas/transferencias; obligatorio para ajustes.</span>
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
            <label>Vista previa de existencias</label>
            <div className="stock-preview">
              <div className="sp-item">
                <div className="n">{baseStock}</div>
                <div className="l">Stock actual</div>
              </div>
              <div className="sp-arrow">→</div>
              <div className="sp-item">
                <div
                  className="n"
                  style={{
                    color:
                      movementType.includes('neg') || movementType === 'salida' || movementType === 'transferencia'
                        ? 'var(--crit)'
                        : 'var(--green)',
                  }}
                >
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
                Stock insuficiente en el depósito de origen.
              </span>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Movimientos;