import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { formatearMonto, formatearFechaHora } from '../utils/format';
import {
  listarDepositos,
  obtenerCatalogoPOS,
  crearVentaPendiente,
  obtenerVenta,
  agregarPago,
  confirmarVenta,
  cancelarVenta,
} from '../services/ventaService';
import { buscarClientes } from '../services/clientsService';

// Mismo hardcodeo que ya usa Detalle_producto.jsx mientras no exista
// una historia de usuario de login/roles de sesión.
const USUARIO_ACTUAL_ID = '00000000-0000-0000-0000-000000000001';

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
];

function Punto_de_Venta() {
  const [depositos, setDepositos] = useState([]);
  const [activeDepositId, setActiveDepositId] = useState(null);

  const [catalogo, setCatalogo] = useState([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);

  const [venta, setVenta] = useState(null); // null = todavía armando el carrito
  const [procesando, setProcesando] = useState(false);
  const [pagoForm, setPagoForm] = useState({ metodo: 'efectivo', monto: '' });
  const [toast, setToast] = useState(null);

  // Cargar depósitos una vez, y elegir el primero por defecto
  useEffect(() => {
    listarDepositos().then((data) => {
      setDepositos(data);
      if (data.length > 0) setActiveDepositId(data[0].id);
    });
  }, []);

  // Recargar catálogo cada vez que cambia el depósito activo
  useEffect(() => {
    if (!activeDepositId) return;
    setCatalogoLoading(true);
    obtenerCatalogoPOS(activeDepositId)
      .then(setCatalogo)
      .catch((err) => {
        console.error(err);
        setCatalogo([]);
      })
      .finally(() => setCatalogoLoading(false));
  }, [activeDepositId]);

  // Autodescarte del banner de confirmación
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const categorias = useMemo(() => {
    const set = new Set(catalogo.map((a) => a.categoria).filter(Boolean));
    return Array.from(set);
  }, [catalogo]);

  const catalogoFiltrado = useMemo(() => {
    const texto = searchTerm.trim().toLowerCase();
    return catalogo.filter((a) => {
      const coincideTexto =
        !texto || a.descripcion.toLowerCase().includes(texto) || (a.codigoEan13 || '').includes(texto);
      const coincideCategoria = categoriaFiltro === 'todas' || a.categoria === categoriaFiltro;
      return coincideTexto && coincideCategoria;
    });
  }, [catalogo, searchTerm, categoriaFiltro]);

  const totalCarrito = carrito.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0);

  const handleAgregarAlCarrito = (articulo) => {
    if (articulo.disponible <= 0) return;
    setCarrito((prev) => {
      const existente = prev.find((it) => it.articuloId === articulo.id);
      if (existente) {
        if (existente.cantidad >= articulo.disponible) return prev;
        return prev.map((it) =>
          it.articuloId === articulo.id ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      }
      return [
        ...prev,
        {
          articuloId: articulo.id,
          descripcion: articulo.descripcion,
          cantidad: 1,
          precioUnitario: articulo.precioActual,
          disponible: articulo.disponible,
        },
      ];
    });
  };

  const handleCambiarCantidad = (articuloId, delta) => {
    setCarrito((prev) =>
      prev
        .map((it) => {
          if (it.articuloId !== articuloId) return it;
          const nuevaCantidad = Math.min(it.disponible, Math.max(0, it.cantidad + delta));
          return { ...it, cantidad: nuevaCantidad };
        })
        .filter((it) => it.cantidad > 0)
    );
  };

  const handleQuitarItem = (articuloId) => {
    setCarrito((prev) => prev.filter((it) => it.articuloId !== articuloId));
  };

  // --- Cliente ---
  useEffect(() => {
    if (!isClientModalOpen) return;
    const texto = clientQuery.trim();
    if (texto.length < 2) {
      setClientResults([]);
      return;
    }
    setClientSearchLoading(true);
    const t = setTimeout(() => {
      buscarClientes(texto)
        .then(setClientResults)
        .finally(() => setClientSearchLoading(false));
    }, 300); // debounce simple
    return () => clearTimeout(t);
  }, [clientQuery, isClientModalOpen]);

  const handleSeleccionarCliente = (c) => {
    setCliente(c);
    setIsClientModalOpen(false);
    setClientQuery('');
    setClientResults([]);
  };

  // --- Flujo de venta ---
  const handleIniciarCobro = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    try {
      const nuevaVenta = await crearVentaPendiente({
        depositoId: activeDepositId,
        usuarioId: USUARIO_ACTUAL_ID,
        clienteId: cliente?.id || null,
        items: carrito.map((it) => ({
          articuloId: it.articuloId,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
        })),
      });
      setVenta(nuevaVenta);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const saldoPendiente = venta
    ? venta.total - (venta.pagos || []).reduce((acc, p) => acc + p.monto, 0)
    : 0;

  const handleAgregarPago = async (e) => {
    e.preventDefault();
    const monto = Number(pagoForm.monto);
    if (!monto || monto <= 0) {
      alert('Ingresá un monto mayor a 0.');
      return;
    }
    setProcesando(true);
    try {
      await agregarPago(venta.id, { metodo: pagoForm.metodo, monto });
      const ventaActualizada = await obtenerVenta(venta.id);
      setVenta(ventaActualizada);
      setPagoForm({ metodo: 'efectivo', monto: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarVenta = async () => {
    setProcesando(true);
    try {
      const ventaConfirmada = await confirmarVenta(venta.id);
      setVenta(ventaConfirmada);
      setToast(`Venta confirmada — comprobante ${ventaConfirmada.numeroComprobante}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelarVenta = async () => {
    if (!window.confirm('¿Cancelar esta venta? Se libera el stock reservado.')) return;
    setProcesando(true);
    try {
      await cancelarVenta(venta.id);
      setVenta(null);
      setCarrito([]);
      setCliente(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleNuevaVenta = () => {
    setVenta(null);
    setCarrito([]);
    setCliente(null);
  };

  const enCobro = venta && venta.estado === 'Pendiente';
  const confirmada = venta && venta.estado === 'Confirmada';

  return (
    <div>
      {toast && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{toast}</span>
        </div>
      )}

      {/* Selector de depósito: fila propia porque no hay filtros/tabs debajo mientras se arma el carrito */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="warehouse-tabs" style={{ marginBottom: 0 }}>
          {depositos.map((d) => (
            <button
              key={d.id}
              className={`warehouse-tab ${activeDepositId === d.id ? 'active' : ''}`}
              disabled={!!venta}
              onClick={() => setActiveDepositId(d.id)}
            >
              {d.nombre}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '18px', alignItems: 'start', marginTop: '18px' }}>
        {/* COLUMNA IZQUIERDA: catálogo */}
        <div>
          <div className="catalog-toolbar">
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre o EAN…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!!venta}
              />
            </div>
            <div className="select-field">
              Categoría:
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                disabled={!!venta}
                style={{ border: 'none', outline: 'none', background: 'transparent' }}
              >
                <option value="todas">Todas</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Precio</th>
                    <th>Disponible</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {catalogoLoading ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>Cargando catálogo…</td></tr>
                  ) : catalogoFiltrado.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>No se encontraron artículos para los filtros seleccionados.</td></tr>
                  ) : (
                    catalogoFiltrado.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="cell-strong">{a.descripcion}</div>
                          <div className="cell-sub">{a.categoria}</div>
                        </td>
                        <td className="cell-mono">{formatearMonto(a.precioActual)}</td>
                        <td>
                          <span className={`badge ${a.disponible <= 0 ? 'badge-red' : a.disponible <= 3 ? 'badge-amber' : 'badge-green'}`}>
                            <span className="badge-dot"></span>
                            {a.disponible}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={!!venta || a.disponible <= 0}
                            onClick={() => handleAgregarAlCarrito(a)}
                          >
                            + Agregar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: cliente + carrito + cobro */}
        <div>
          {/* Cliente */}
          <div className="table-panel" style={{ padding: '16px 18px', marginBottom: '14px' }}>
            {cliente ? (
              <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', margin: 0, padding: 0, border: 'none' }}>
                <div className="detail-info-item">
                  <div className="label">Cliente</div>
                  <div className="value">{cliente.razonSocial}</div>
                </div>
                <div className="detail-info-item">
                  <div className="label">{cliente.dni ? 'DNI' : 'CUIT'}</div>
                  <div className="value">{cliente.dni || cliente.cuit}</div>
                </div>
                {!venta && (
                  <button className="btn btn-outline btn-sm" style={{ marginTop: '10px' }} onClick={() => setCliente(null)}>
                    Quitar cliente
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="cell-sub" style={{ marginBottom: '10px' }}>Consumidor final (sin cliente asociado)</div>
                <button className="btn btn-outline btn-sm" disabled={!!venta} onClick={() => setIsClientModalOpen(true)}>
                  Buscar cliente
                </button>
              </>
            )}
          </div>

          {/* Carrito */}
          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Cant.</th>
                    <th>Subtotal</th>
                    {!venta && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {(venta ? venta.items : carrito).length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>El carrito está vacío.</td></tr>
                  ) : (
                    (venta ? venta.items : carrito).map((it) => (
                      <tr key={it.articuloId}>
                        <td className="cell-strong">{it.descripcion}</td>
                        <td>
                          {venta ? (
                            it.cantidad
                          ) : (
                            <div className="row-actions">
                              <button className="icon-btn" onClick={() => handleCambiarCantidad(it.articuloId, -1)}>−</button>
                              <span>{it.cantidad}</span>
                              <button className="icon-btn" onClick={() => handleCambiarCantidad(it.articuloId, 1)}>+</button>
                            </div>
                          )}
                        </td>
                        <td className="cell-mono">{formatearMonto((it.importeLinea ?? it.cantidad * it.precioUnitario))}</td>
                        {!venta && (
                          <td>
                            <div className="row-actions">
                              <button className="icon-btn" onClick={() => handleQuitarItem(it.articuloId)}>
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="stat-card" style={{ marginTop: '14px' }}>
            <div className="stat-value">{formatearMonto(venta ? venta.total : totalCarrito)}</div>
            <div className="stat-label">Total de la venta</div>
          </div>

          {/* Acción según el estado */}
          {!venta && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '14px' }}
              disabled={carrito.length === 0 || procesando}
              onClick={handleIniciarCobro}
            >
              {procesando ? 'Reservando stock…' : 'Iniciar cobro'}
            </button>
          )}

          {enCobro && (
            <div style={{ marginTop: '14px' }}>
              <div className="modal-notice">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                <span>Stock reservado hasta las {formatearFechaHora(venta.fechaHoraExpiracion)}.</span>
              </div>

              <div className="stat-card" style={{ marginBottom: '14px' }}>
                <div className="stat-value" style={{ color: saldoPendiente > 0.01 ? 'var(--crit)' : 'var(--green)' }}>
                  {formatearMonto(saldoPendiente)}
                </div>
                <div className="stat-label">Saldo pendiente</div>
              </div>

              {(venta.pagos || []).length > 0 && (
                <div className="table-panel" style={{ marginBottom: '14px' }}>
                  <div className="table-scroll">
                    <table>
                      <thead><tr><th>Método</th><th>Monto</th></tr></thead>
                      <tbody>
                        {venta.pagos.map((p) => (
                          <tr key={p.pagoId}>
                            <td>{METODOS_PAGO.find((m) => m.value === p.metodo)?.label || p.metodo}</td>
                            <td className="cell-mono">{formatearMonto(p.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {saldoPendiente > 0.01 && (
                <form onSubmit={handleAgregarPago} className="form-row" style={{ marginBottom: 0 }}>
                  <div className="form-field">
                    <label>Método de pago</label>
                    <select
                      value={pagoForm.metodo}
                      onChange={(e) => setPagoForm({ ...pagoForm, metodo: e.target.value })}
                    >
                      {METODOS_PAGO.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Monto</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={saldoPendiente.toFixed(2)}
                      value={pagoForm.monto}
                      onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
                    />
                  </div>
                  <div className="form-field full">
                    <button type="submit" className="btn btn-outline" disabled={procesando}>
                      + Agregar pago
                    </button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  className="btn btn-outline"
                  style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                  disabled={procesando}
                  onClick={handleCancelarVenta}
                >
                  Cancelar venta
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={procesando || saldoPendiente > 0.01}
                  onClick={handleConfirmarVenta}
                >
                  Confirmar venta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de búsqueda de cliente (HU-20) */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Buscar cliente"
      >
        <div className="search-input" style={{ marginBottom: '14px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Nombre, DNI o CUIT…"
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            autoFocus
          />
        </div>
        {clientSearchLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>Buscando…</div>
        ) : clientResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
            {clientQuery.trim().length < 2 ? 'Escribí al menos 2 caracteres.' : 'Sin resultados.'}
          </div>
        ) : (
          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <tbody>
                  {clientResults.map((c) => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => handleSeleccionarCliente(c)}>
                      <td className="cell-strong">{c.razonSocial}</td>
                      <td className="cell-mono">{c.dni || c.cuit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Ticket final, tras confirmar */}
      <Modal
        isOpen={!!confirmada}
        onClose={handleNuevaVenta}
        title={`Comprobante ${confirmada ? venta.numeroComprobante : ''}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => window.print()}>Imprimir</button>
            <button className="btn btn-primary" onClick={handleNuevaVenta}>Nueva venta</button>
          </>
        }
      >
        {confirmada && (
          <div>
            <div className="cell-sub" style={{ marginBottom: '12px' }}>
              {formatearFechaHora(venta.fechaHoraRegistro)} · {cliente ? cliente.razonSocial : 'Consumidor final'}
            </div>
            <div className="table-panel">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Ítem</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {venta.items.map((it) => (
                      <tr key={it.articuloId}>
                        <td>{it.descripcion}</td>
                        <td>{it.cantidad}</td>
                        <td className="cell-mono">{formatearMonto(it.importeLinea)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="stat-card" style={{ marginTop: '14px' }}>
              <div className="stat-value">{formatearMonto(venta.total)}</div>
              <div className="stat-label">Total pagado</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Punto_de_Venta;
