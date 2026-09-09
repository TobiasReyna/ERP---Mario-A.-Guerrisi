import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { formatearMonto } from '../utils/format';
import { listarClientes, actualizarLimiteCredito } from '../services/clientsService';

// NOTA: página de HU-24 (Gestión de Límites de Crédito). `services/clientsService.js`
// es un MOCK en memoria: todavía no existe un módulo de Ventas/POS real
// (HU-15/16) que consuma limite_credito/saldo_actual al vender, así que el
// "bloqueo automático" acá es solo informativo (badge "Bloqueado" + aviso).
// Cuando exista el flujo de venta real, ese es el punto donde debería
// consultarse esta misma regla para impedir la operación.

function nivelUtilizacion(pct) {
  if (pct >= 100) return { color: 'var(--crit)', badge: 'badge-red', label: 'Bloqueado' };
  if (pct >= 80) return { color: 'var(--amber)', badge: 'badge-amber', label: 'Por agotarse' };
  return { color: 'var(--green)', badge: 'badge-green', label: 'Disponible' };
}

function Limites_de_credito() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orden, setOrden] = useState('utilizacion'); // utilizacion | nombre

  const [clienteEditar, setClienteEditar] = useState(null);
  const [nuevoLimite, setNuevoLimite] = useState('');
  const [guardando, setGuardando] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  const cargarClientes = () => {
    setLoading(true);
    listarClientes()
      .then(setClientes)
      .catch((err) => console.error('Error al listar clientes:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesConUtilizacion = useMemo(() => {
    return clientes.map((c) => {
      const pct = c.limiteCredito > 0 ? (c.saldoActual / c.limiteCredito) * 100 : c.saldoActual > 0 ? 100 : 0;
      return { ...c, pctUtilizacion: pct, disponible: Math.max(0, c.limiteCredito - c.saldoActual) };
    });
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let lista = clientesConUtilizacion.filter(
      (c) => term.length === 0 || c.razonSocial.toLowerCase().includes(term) || c.cuit.includes(term.replace(/\D/g, ''))
    );
    lista = [...lista].sort((a, b) =>
      orden === 'utilizacion' ? b.pctUtilizacion - a.pctUtilizacion : a.razonSocial.localeCompare(b.razonSocial)
    );
    return lista;
  }, [clientesConUtilizacion, searchTerm, orden]);

  const kpis = useMemo(() => {
    const totalExpuesto = clientesConUtilizacion.reduce((acc, c) => acc + c.saldoActual, 0);
    const totalLimites = clientesConUtilizacion.reduce((acc, c) => acc + c.limiteCredito, 0);
    const bloqueados = clientesConUtilizacion.filter((c) => c.pctUtilizacion >= 100).length;
    return { totalExpuesto, totalLimites, bloqueados };
  }, [clientesConUtilizacion]);

  const handleAbrirEditar = (cliente) => {
    setClienteEditar(cliente);
    setNuevoLimite(String(cliente.limiteCredito));
  };

  const handleGuardarLimite = async (e) => {
    e.preventDefault();
    if (!clienteEditar || guardando) return;
    const valor = Number(nuevoLimite);
    if (!(valor >= 0)) return;

    setGuardando(true);
    try {
      await actualizarLimiteCredito(clienteEditar.id, valor);
      showToast(`Límite de crédito de "${clienteEditar.razonSocial}" actualizado a ${formatearMonto(valor)}.`);
      setClienteEditar(null);
      cargarClientes();
    } catch (error) {
      alert(error.message || 'Error al actualizar el límite.');
    } finally {
      setGuardando(false);
    }
  };

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

      <div className="section-heading">
        <div>
          <h2>Límites de Crédito</h2>
          <span className="desc">Cuentas corrientes de clientes mayoristas (B2B) y exposición crediticia</span>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-value">{formatearMonto(kpis.totalExpuesto)}</div>
          <div className="stat-label">Total expuesto (saldo en cuenta corriente)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatearMonto(kpis.totalLimites)}</div>
          <div className="stat-label">Suma de límites otorgados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: kpis.bloqueados > 0 ? 'var(--crit)' : 'var(--black)' }}>
            {kpis.bloqueados}
          </div>
          <div className="stat-label">Clientes con cuenta bloqueada</div>
        </div>
      </div>

      <div className="catalog-toolbar">
        <div className="search-input">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por razón social o CUIT…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="select-field">
          Ordenar por:
          <select value={orden} onChange={(e) => setOrden(e.target.value)}>
            <option value="utilizacion">Mayor exposición</option>
            <option value="nombre">Razón social</option>
          </select>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>CUIT</th>
                <th>Límite de crédito</th>
                <th>Saldo actual</th>
                <th>Utilización</th>
                <th>Estado de cuenta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                    Cargando clientes…
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                    No se encontraron clientes para la búsqueda.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => {
                  const nivel = nivelUtilizacion(c.pctUtilizacion);
                  const pctClamp = Math.min(100, c.pctUtilizacion);
                  return (
                    <tr key={c.id}>
                      <td className="cell-strong">{c.razonSocial}</td>
                      <td className="cell-mono">{c.cuit}</td>
                      <td>{formatearMonto(c.limiteCredito)}</td>
                      <td>{formatearMonto(c.saldoActual)}</td>
                      <td style={{ minWidth: '160px' }}>
                        <div className="bar-track" style={{ marginBottom: '4px' }}>
                          <div
                            className="bar-fill"
                            style={{ width: `${pctClamp}%`, background: nivel.color }}
                          ></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                          {c.pctUtilizacion.toFixed(0)}% utilizado
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${nivel.badge}`}>
                          <span className="badge-dot"></span>
                          {nivel.label}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => handleAbrirEditar(c)}>
                          Editar límite
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL: EDITAR LÍMITE DE CRÉDITO                                  */}
      {/* ================================================================ */}
      <Modal
        isOpen={!!clienteEditar}
        onClose={() => setClienteEditar(null)}
        title={clienteEditar ? `Límite de crédito: ${clienteEditar.razonSocial}` : 'Límite de crédito'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setClienteEditar(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={!(Number(nuevoLimite) >= 0) || guardando} onClick={handleGuardarLimite}>
              {guardando ? 'Guardando…' : 'Guardar límite'}
            </button>
          </>
        }
      >
        {clienteEditar && (
          <form onSubmit={handleGuardarLimite}>
            <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', margin: '0 0 16px 0', paddingTop: 0, borderTop: 'none' }}>
              <div className="detail-info-item">
                <div className="label">Saldo actual en cuenta corriente</div>
                <div className="value">{formatearMonto(clienteEditar.saldoActual)}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Límite vigente</div>
                <div className="value">{formatearMonto(clienteEditar.limiteCredito)}</div>
              </div>
            </div>
            <div className="form-field">
              <label>
                Nuevo límite de crédito<span className="req">*</span>
              </label>
              <input type="number" min="0" step="1000" value={nuevoLimite} onChange={(e) => setNuevoLimite(e.target.value)} />
            </div>
            {Number(nuevoLimite) < clienteEditar.saldoActual && (
              <div className="modal-notice" style={{ marginTop: '12px', marginBottom: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                El nuevo límite queda por debajo del saldo actual: la cuenta del cliente quedará bloqueada hasta que abone.
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

export default Limites_de_credito;
