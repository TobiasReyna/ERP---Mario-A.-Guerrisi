import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { formatearFecha, formatearFechaHora, formatearMonto } from '../utils/format';

function badgeClassEstado(estado) {
  switch (estado) {
    case 'Pagada':
      return 'badge-green';
    case 'Mora':
      return 'badge-red';
    default:
      return 'badge-amber';
  }
}

function Cuentas_por_pagar() {
  const [proveedores, setProveedores] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [filtroProveedor, setFiltroProveedor] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [vencimientoDesde, setVencimientoDesde] = useState('');
  const [vencimientoHasta, setVencimientoHasta] = useState('');

  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [historialPagos, setHistorialPagos] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const proveedorById = useMemo(() => new Map(proveedores.map((p) => [p.id, p])), [proveedores]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  const cargarTodo = async () => {
    setLoading(true);
    try {
      // Primero sincronizamos las cuentas a pagar con las ordenes de compra recibidas/parciales
      await fetch('http://localhost:3001/api/accounts-payable/sync', { method: 'POST' });

      const [provsRes, cxpRes] = await Promise.all([
        fetch('http://localhost:3001/api/suppliers'),
        fetch('http://localhost:3001/api/accounts-payable')
      ]);
      const provsJson = await provsRes.json();
      const cxpJson = await cxpRes.json();

      setProveedores(provsJson.data || []);

      const nowStr = new Date().toISOString().split('T')[0];
      const uniqueCxpMap = new Map();
      (cxpJson.data || []).forEach(c => {
        if (!uniqueCxpMap.has(c.orden_compra_id)) {
          uniqueCxpMap.set(c.orden_compra_id, c);
        }
      });

      const cxpMapped = Array.from(uniqueCxpMap.values()).map(c => {
        let estado = c.estado;
        if (estado === 'Pendiente' && c.fecha_vencimiento < nowStr) {
          estado = 'Mora';
        }
        return {
          id: c.id,
          proveedorId: c.proveedor_id,
          numeroOrdenCompra: c.ordenes_compra?.numero_orden,
          ordenCompraId: c.orden_compra_id, // guardamos el ID para usarlo luego
          montoTotal: Number(c.monto_total),
          saldoPendiente: Number(c.saldo_pendiente),
          fechaVencimiento: c.fecha_vencimiento,
          estado: estado,
          pagos_cxp: c.pagos_cxp || []
        };
      });
      setCuentas(cxpMapped);
    } catch (err) {
      console.error('Error al cargar cuentas por pagar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const handleAbrirDetalle = (cuenta) => {
    setCuentaSeleccionada(cuenta);
    setIsDetalleOpen(true);
    setMontoPago('');
    setHistorialPagos(cuenta.pagos_cxp || []);
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    if (!cuentaSeleccionada || registrando) return;
    const monto = Number(montoPago);
    if (!(monto > 0)) return;

    setRegistrando(true);
    try {
      const res = await fetch(`http://localhost:3001/api/accounts-payable/${cuentaSeleccionada.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_pagado: monto })
      });
      if (!res.ok) throw new Error('Falló el registro del pago en el servidor');
      const json = await res.json();
      const actualizada = json.data;

      showToast(
        actualizada.estado === 'Pagada'
          ? `Cuenta cancelada en su totalidad.`
          : `Pago de ${formatearMonto(monto)} registrado. Saldo pendiente: ${formatearMonto(actualizada.saldo_pendiente)}.`
      );
      
      setIsDetalleOpen(false);
      cargarTodo();
    } catch (error) {
      alert(error.message || 'Error al registrar el pago.');
    } finally {
      setRegistrando(false);
    }
  };

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c) => {
      const matchesProveedor = filtroProveedor === 'todos' || c.proveedorId === filtroProveedor;
      const matchesEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
      const matchesDesde = !vencimientoDesde || c.fechaVencimiento >= vencimientoDesde;
      const matchesHasta = !vencimientoHasta || c.fechaVencimiento <= vencimientoHasta;
      return matchesProveedor && matchesEstado && matchesDesde && matchesHasta;
    });
  }, [cuentas, filtroProveedor, filtroEstado, vencimientoDesde, vencimientoHasta]);

  const kpis = useMemo(() => {
    const totalAdeudado = cuentas.filter((c) => c.estado !== 'Pagada').reduce((acc, c) => acc + c.montoTotal, 0);
    const enMora = cuentas.filter((c) => c.estado === 'Mora').length;
    const pendientes = cuentas.filter((c) => c.estado === 'Pendiente').length;
    const pagadas = cuentas.filter((c) => c.estado === 'Pagada').length;
    return { totalAdeudado, enMora, pendientes, pagadas };
  }, [cuentas]);

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

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-black">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{formatearMonto(kpis.totalAdeudado)}</div>
          <div className="stat-label">Total adeudado</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-red">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{kpis.enMora}</div>
          <div className="stat-label">Cuentas en mora</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-amber">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{kpis.pendientes}</div>
          <div className="stat-label">Pendientes (en término)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon tint-green">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{kpis.pagadas}</div>
          <div className="stat-label">Pagadas</div>
        </div>
      </div>

      <div className="catalog-toolbar">
        <div className="select-field">
          Proveedor:
          <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
            <option value="todos">Todos</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.razonSocial}
              </option>
            ))}
          </select>
        </div>
        <div className="select-field">
          Estado:
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Mora">Mora</option>
            <option value="Pagada">Pagada</option>
          </select>
        </div>
        <div className="select-field">
          Vence desde:
          <input
            type="date"
            value={vencimientoDesde}
            onChange={(e) => setVencimientoDesde(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12.5px' }}
          />
        </div>
        <div className="select-field">
          Vence hasta:
          <input
            type="date"
            value={vencimientoHasta}
            onChange={(e) => setVencimientoHasta(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12.5px' }}
          />
        </div>
      </div>

      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>N° Orden de Compra</th>
                <th>Monto total</th>
                <th>Saldo pendiente</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                    Cargando cuentas por pagar…
                  </td>
                </tr>
              ) : cuentasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                    No hay cuentas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                cuentasFiltradas.map((c) => (
                  <tr key={c.id} style={{ background: c.estado === 'Mora' ? 'var(--crit-soft)' : 'transparent' }}>
                    <td className="cell-strong">{proveedorById.get(c.proveedorId)?.razonSocial || '—'}</td>
                    <td className="cell-mono">#{c.numeroOrdenCompra}</td>
                    <td>{formatearMonto(c.montoTotal)}</td>
                    <td>
                      <strong>{formatearMonto(c.saldoPendiente)}</strong>
                    </td>
                    <td>{formatearFecha(c.fechaVencimiento)}</td>
                    <td>
                      <span className={`badge ${badgeClassEstado(c.estado)}`}>
                        <span className="badge-dot"></span>
                        {c.estado}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => handleAbrirDetalle(c)}>
                        {c.estado === 'Pagada' ? 'Ver historial' : 'Registrar pago'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL: DETALLE DE CUENTA + REGISTRO DE PAGO                      */}
      {/* ================================================================ */}
      <Modal
        isOpen={isDetalleOpen}
        onClose={() => setIsDetalleOpen(false)}
        title={cuentaSeleccionada ? `CxP · ${proveedorById.get(cuentaSeleccionada.proveedorId)?.razonSocial || ''}` : 'Cuenta por pagar'}
        wide
        footer={
          <button className="btn btn-outline" onClick={() => setIsDetalleOpen(false)}>
            Cerrar
          </button>
        }
      >
        {cuentaSeleccionada && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', margin: 0 }}>
              <div className="detail-info-item">
                <div className="label">Orden de compra</div>
                <div className="value" style={{ fontSize: '13px' }}>#{cuentaSeleccionada.numeroOrdenCompra}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Monto total</div>
                <div className="value" style={{ fontSize: '13px' }}>{formatearMonto(cuentaSeleccionada.montoTotal)}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Vencimiento</div>
                <div className="value" style={{ fontSize: '13px' }}>{formatearFecha(cuentaSeleccionada.fechaVencimiento)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                Saldo pendiente: <strong style={{ fontSize: '16px', color: 'var(--black)' }}>{formatearMonto(cuentaSeleccionada.saldoPendiente)}</strong>
              </span>
              <span className={`badge ${badgeClassEstado(cuentaSeleccionada.estado)}`}>
                <span className="badge-dot"></span>
                {cuentaSeleccionada.estado}
              </span>
            </div>

            {cuentaSeleccionada.estado !== 'Pagada' && (
              <form onSubmit={handleRegistrarPago} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div className="form-field" style={{ margin: 0, flex: 1 }}>
                  <label>Registrar nuevo pago</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={cuentaSeleccionada.saldoPendiente}
                    placeholder={`Máximo ${formatearMonto(cuentaSeleccionada.saldoPendiente)}`}
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!(Number(montoPago) > 0) || Number(montoPago) > cuentaSeleccionada.saldoPendiente || registrando}
                >
                  {registrando ? 'Registrando…' : 'Registrar pago'}
                </button>
              </form>
            )}

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: 'var(--gray-800)', fontWeight: '600' }}>
                Historial de pagos
              </h4>
              <div className="table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Monto pagado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingHistorial ? (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '16px', color: 'var(--gray-500)' }}>
                            Cargando…
                          </td>
                        </tr>
                      ) : historialPagos.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '16px', color: 'var(--gray-500)' }}>
                            Todavía no se registraron pagos para esta cuenta.
                          </td>
                        </tr>
                      ) : (
                        historialPagos.map((p) => (
                          <tr key={p.id}>
                            <td>{formatearFechaHora(p.fecha_pago)}</td>
                            <td>{formatearMonto(p.monto_pagado)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Cuentas_por_pagar;
