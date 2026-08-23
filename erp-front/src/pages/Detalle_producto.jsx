import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

function Detalle_producto() {
  const navigate = useNavigate();

  // Estados de datos
  const [stockCentral, setStockCentral] = useState(8);
  const [stockMargalef, setStockMargalef] = useState(3);
  const [stockMin, setStockMin] = useState(5);
  const [stockMax, setStockMax] = useState(12);
  const [stockScope, setStockScope] = useState('Stock consolidado');

  // Modales y confirmaciones
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [confirmBanner, setConfirmBanner] = useState(null);

  // Formulario Transferencia
  const [transferData, setTransferData] = useState({
    origen: 'central',
    destino: 'margalef',
    cantidad: 3,
    motivo: 'Rebalanceo de stock'
  });

  const stockConsolidado = stockCentral + stockMargalef;
  const centralPercent = Math.round((stockCentral / (stockConsolidado || 1)) * 100);
  const margalefPercent = Math.round((stockMargalef / (stockConsolidado || 1)) * 100);

  const showConfirm = (text) => {
    setConfirmBanner(text);
    setTimeout(() => setConfirmBanner(null), 4500);
  };

  const handleSaveStockConfig = (e) => {
    e.preventDefault();
    showConfirm('Niveles de stock mínimo y máximo actualizados correctamente.');
  };

  const handleConfirmTransfer = (e) => {
    e.preventDefault();
    const qty = Number(transferData.cantidad) || 0;

    if (transferData.origen === 'central') {
      if (qty > stockCentral) return alert('No hay suficiente stock en Tienda Central.');
      setStockCentral(stockCentral - qty);
      setStockMargalef(stockMargalef + qty);
    } else {
      if (qty > stockMargalef) return alert('No hay suficiente stock en Galería Margalef.');
      setStockMargalef(stockMargalef - qty);
      setStockCentral(stockCentral + qty);
    }

    setIsTransferModalOpen(false);
    showConfirm(`Transferencia realizada: Tienda Central (${stockCentral - qty}) · Galería Margalef (${stockMargalef + qty}) · Consolidado sin cambios.`);
  };

  return (
    <div>
      {/* BREADCRUMBS */}
      <div className="breadcrumbs">
        <button className="crumb-link" onClick={() => navigate('/Catalogo_de_productos')}>
          Catálogo
        </button>
        <span>/</span>
        <span className="crumb-current">Fender Stratocaster Player</span>
      </div>

      {/* TOAST DE CONFIRMACIÓN */}
      {confirmBanner && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{confirmBanner}</span>
        </div>
      )}

      {/* DETALLE PRINCIPAL */}
      <div className="detail-grid">
        <div className="detail-image">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>

        <div className="detail-panel">
          <div className="detail-top">
            <div>
              <div className="detail-category">Guitarras eléctricas</div>
              <h2 className="detail-title">Fender Stratocaster Player</h2>
              <div className="detail-sub">Marca Fender · Modelo MX23 · Código COD-0001 · EAN-13 7791234500011</div>
            </div>
            <div className="detail-price">$1.250.000</div>
          </div>

          <div className="detail-info-grid">
            <div className="detail-info-item">
              <div className="label">Stock consolidado</div>
              <div className="value">{stockConsolidado} unidades</div>
            </div>
            <div className="detail-info-item">
              <div className="label">Mínimo / Máximo</div>
              <div className="value">{stockMin} / {stockMax}</div>
            </div>
            <div className="detail-info-item">
              <div className="label">Estado</div>
              <div className="value">
                <span className="badge badge-green"><span className="badge-dot"></span>Normal</span>
              </div>
            </div>
          </div>

          <p className="detail-desc" style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: '1.6', marginBottom: '16px' }}>
            Guitarra eléctrica de cuerpo sólido en tilo, mástil de arce, pastillas Player Series Alnico 5 Strat y puente tremolo de 2 puntos. Ideal para estudio y presentaciones en vivo.
          </p>

          <div className="detail-actions">
            <button className="btn btn-outline" onClick={() => setIsTransferModalOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h13l-3-3M17 17H4l3 3" />
              </svg>
              Transferir stock
            </button>
            <button className="btn btn-outline" onClick={() => setIsMoveModalOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Registrar movimiento
            </button>
          </div>
        </div>
      </div>

      {/* DISTRIBUCIÓN DE STOCK POR DEPÓSITO */}
      <div className="section-heading">
        <div>
          <h2>Distribución de stock por depósito</h2>
          <span className="desc">Un mismo producto puede tener cantidades distintas en cada ubicación</span>
        </div>
      </div>

      <div className="consolidated-callout">
        <div>
          <div className="n">{stockConsolidado} unidades</div>
          <div className="l">Stock consolidado (suma de todos los depósitos)</div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="34" height="34" stroke="#E33141">
          <path d="M21 8 12 3 3 8l9 5 9-5Z" />
          <path d="M3 8v8l9 5 9-5V8" />
        </svg>
      </div>

      <div className="panel" style={{ marginBottom: '20px' }}>
        <div className="panel-body">
          <div className="compare-bars">
            <div className="compare-bar-row">
              <span className="compare-bar-label">Tienda Central</span>
              <div className="compare-bar-track">
                <div className="compare-bar-fill" style={{ width: `${centralPercent}%`, transition: 'width 0.4s ease' }}></div>
              </div>
              <span className="compare-bar-value">{stockCentral} uds.</span>
            </div>
            <div className="compare-bar-row">
              <span className="compare-bar-label">Galería Margalef</span>
              <div className="compare-bar-track">
                <div className="compare-bar-fill alt" style={{ width: `${margalefPercent}%`, transition: 'width 0.4s ease' }}></div>
              </div>
              <span className="compare-bar-value">{stockMargalef} uds.</span>
            </div>
          </div>
        </div>
      </div>

      {/* PANELES DE HISTORIAL Y CONFIGURACIÓN */}
      <div className="dashboard-row">
        <div className="panel">
          <div className="panel-header"><h3>Historial de precios</h3></div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Precio</th><th>Vigencia desde</th><th>Usuario</th></tr>
              </thead>
              <tbody>
                <tr><td className="cell-strong">$1.250.000</td><td>15/08/2026</td><td>Admin</td></tr>
                <tr><td>$1.180.000</td><td>02/06/2026</td><td>Admin</td></tr>
                <tr><td>$1.090.000</td><td>14/02/2026</td><td>Juan Pérez</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Especificaciones</h3></div>
          <div className="panel-body">
            <div className="spec-list">
              <div className="spec-row"><span className="k">Cuerpo</span><span className="v">Tilo (Alder)</span></div>
              <div className="spec-row"><span className="k">Mástil</span><span className="v">Arce, perfil "Modern C"</span></div>
              <div className="spec-row"><span className="k">Pastillas</span><span className="v">Player Series Alnico 5 (SSS)</span></div>
              <div className="spec-row"><span className="k">Puente</span><span className="v">Tremolo 2 puntos</span></div>
              <div className="spec-row"><span className="k">Escala</span><span className="v">648 mm (25.5")</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="panel">
          <div className="panel-header"><h3>Historial de movimientos</h3></div>
          <div className="panel-body">
            <div className="move-log-item">
              <div className="move-log-top">
                <span className="type-pill type-ajuste-neg">AJUSTE NEG.</span>
                <span className="move-log-stock">Stock anterior: <b>10</b> → Stock nuevo: <b>8</b></span>
              </div>
              <div className="move-log-meta"><span>Motivo: Rotura</span><span>Juan Pérez · 21/08/2026 09:42</span></div>
            </div>
            <div className="move-log-item">
              <div className="move-log-top">
                <span className="type-pill type-entrada">ENTRADA</span>
                <span className="move-log-stock">Stock anterior: <b>0</b> → Stock nuevo: <b>10</b></span>
              </div>
              <div className="move-log-meta"><span>Motivo: Reposición de proveedor</span><span>Juan Pérez · 15/08/2026 09:14</span></div>
            </div>
            <div className="move-log-item">
              <div className="move-log-top">
                <span className="type-pill type-transferencia">TRANSFERENCIA</span>
                <span className="move-log-stock">Central → Margalef · Cantidad: <b>3</b></span>
              </div>
              <div className="move-log-meta"><span>Motivo: Rebalanceo de stock</span><span>Carlos Ruiz · 03/08/2026 14:10</span></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Configuración de stock</h3></div>
          <div className="panel-body">
            <form onSubmit={handleSaveStockConfig}>
              <div className="stock-config-grid">
  <div className="form-field">
    <label>Stock mínimo</label>
    <input
      type="number"
      value={stockMin}
      onChange={(e) => setStockMin(Number(e.target.value))}
    />
  </div>

  <div className="form-field">
    <label>Stock máximo</label>
    <input
      type="number"
      value={stockMax}
      onChange={(e) => setStockMax(Number(e.target.value))}
    />
  </div>

  <div className="form-field full">
    <label>Aplicar a</label>
    <select
      value={stockScope}
      onChange={(e) => setStockScope(e.target.value)}
    >
      <option>Stock consolidado</option>
      <option>Tienda Central</option>
      <option>Galería Margalef</option>
    </select>
  </div>
</div>
              <div style={{ marginTop: '14px' }}>
                <button className="btn btn-primary" type="submit">Guardar configuración</button>
              </div>
            </form>
          </div>
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
              <label>Producto</label>
              <input type="text" disabled value="Fender Stratocaster Player — COD-0001" />
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
                    destino: orig === 'central' ? 'margalef' : 'central'
                  });
                }}
              >
                <option value="central">Tienda Central ({stockCentral} uds.)</option>
                <option value="margalef">Galería Margalef ({stockMargalef} uds.)</option>
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
              <select>
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
                    ? `${stockCentral} → ${Math.max(0, stockCentral - transferData.cantidad)}`
                    : `${stockMargalef} → ${Math.max(0, stockMargalef - transferData.cantidad)}`}
                </div>
                <div className="l">{transferData.origen === 'central' ? 'Tienda Central' : 'Galería Margalef'}</div>
              </div>
              <div className="sp-arrow">→</div>
              <div className="sp-item">
                <div className="n">
                  {transferData.origen === 'central'
                    ? `${stockMargalef} → ${stockMargalef + Number(transferData.cantidad)}`
                    : `${stockCentral} → ${stockCentral + Number(transferData.cantidad)}`}
                </div>
                <div className="l">{transferData.destino === 'margalef' ? 'Galería Margalef' : 'Tienda Central'}</div>
              </div>
              <div className="sp-arrow">=</div>
              <div className="sp-item">
                <div className="n" style={{ color: 'var(--black)' }}>{stockConsolidado}</div>
                <div className="l">Consolidado (sin cambios)</div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL REGISTRAR MOVIMIENTO */}
      <Modal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        title="Registrar movimiento de stock"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsMoveModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => { setIsMoveModalOpen(false); showConfirm('Movimiento registrado correctamente.'); }}>
              Guardar movimiento
            </button>
          </>
        }
      >
        <form>
          <div className="form-row">
            <div className="form-field full">
              <label>Producto</label>
              <input type="text" disabled value="Fender Stratocaster Player — COD-0001" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Depósito</label>
              <select>
                <option>Tienda Central</option>
                <option>Galería Margalef</option>
              </select>
            </div>
            <div className="form-field">
              <label>Tipo de movimiento</label>
              <select>
                <option>Entrada</option>
                <option>Salida</option>
                <option>Ajuste positivo</option>
                <option>Ajuste negativo</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Cantidad</label>
              <input type="number" defaultValue="2" />
            </div>
            <div className="form-field">
              <label>Motivo</label>
              <select>
                <option>Reposición de proveedor</option>
                <option>Venta mostrador</option>
                <option>Rotura</option>
                <option>Diferencia de recuento</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Detalle_producto;  