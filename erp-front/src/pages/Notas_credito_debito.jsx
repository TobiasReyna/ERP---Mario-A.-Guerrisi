import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { formatearFechaHora, formatearMonto, hoyISO } from '../utils/format';
import { listarClientes, listarVentasMock } from '../services/clientsService';
import {
  listarArticulosReferencia,
  listarDepositosReferencia,
  listarNotas,
  crearNota,
  obtenerResumenPeriodo,
} from '../services/creditNotesService';

// NOTA: página de HU-23 (Notas de Crédito y Débito). `services/creditNotesService.js`
// y `services/clientsService.js` son MOCKS en memoria: todavía no existe un
// módulo de Ventas/POS real (HU-15) que genere comprobantes de
// ventas_mock_origen de verdad, así que se simulan acá. El catálogo de
// artículos y los depósitos son datos reales (solo lectura).
// La reversión de stock del criterio de aceptación 2 se simula con un aviso;
// no escribe en public.existencias — ver el .md de este sprint para el
// detalle de lo que falta conectar en el backend.

const LINEA_VACIA = () => ({ articuloId: '', depositoId: '', cantidad: 1 });

function Notas_credito_debito() {
  const [notas, setNotas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [filtroTipo, setFiltroTipo] = useState('todas');
  const [resumen, setResumen] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState(hoyISO());

  const [isNuevaOpen, setIsNuevaOpen] = useState(false);
  const [tipo, setTipo] = useState('Nota de Crédito');
  const [facturaOrigenId, setFacturaOrigenId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [afectaInventario, setAfectaInventario] = useState(false);
  const [lineasForm, setLineasForm] = useState([LINEA_VACIA()]);
  const [montoManual, setMontoManual] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clienteById = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const ventaById = useMemo(() => new Map(ventas.map((v) => [v.id, v])), [ventas]);
  const articuloById = useMemo(() => new Map(articulos.map((a) => [a.id, a])), [articulos]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const cargarTodo = () => {
    setLoading(true);
    Promise.all([listarNotas(), listarClientes(), listarVentasMock(), listarArticulosReferencia(), listarDepositosReferencia()])
      .then(([n, c, v, a, d]) => {
        setNotas(n);
        setClientes(c);
        setVentas(v);
        setArticulos(a);
        setDepositos(d);
      })
      .catch((err) => console.error('Error al cargar notas de crédito/débito:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    obtenerResumenPeriodo(fechaDesde || null, fechaHasta || null).then(setResumen);
  }, [notas, fechaDesde, fechaHasta]);

  // ---------------------------------------------------------------------
  // Nueva nota
  // ---------------------------------------------------------------------
  const handleOpenNueva = () => {
    setTipo('Nota de Crédito');
    setFacturaOrigenId('');
    setMotivo('');
    setAfectaInventario(false);
    setLineasForm([LINEA_VACIA()]);
    setMontoManual('');
    setIsNuevaOpen(true);
  };

  const handleAddLinea = () => setLineasForm((prev) => [...prev, LINEA_VACIA()]);
  const handleRemoveLinea = (idx) => setLineasForm((prev) => prev.filter((_, i) => i !== idx));
  const handleChangeLinea = (idx, field, value) => {
    setLineasForm((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: field === 'cantidad' ? Math.max(1, Number(value) || 1) : value } : l))
    );
  };

  const montoCalculadoLineas = useMemo(() => {
    return lineasForm.reduce((acc, l) => {
      const art = articuloById.get(l.articuloId);
      if (!art || !l.cantidad) return acc;
      return acc + art.precioActual * Number(l.cantidad);
    }, 0);
  }, [lineasForm, articuloById]);

  useEffect(() => {
    if (tipo === 'Nota de Crédito' && afectaInventario && montoCalculadoLineas > 0) {
      setMontoManual(String(montoCalculadoLineas));
    }
  }, [montoCalculadoLineas, tipo, afectaInventario]);

  const lineasValidas = lineasForm.filter((l) => l.articuloId && l.depositoId && Number(l.cantidad) > 0);
  const requiereLineas = tipo === 'Nota de Crédito' && afectaInventario;

  const isFormValid =
    !!facturaOrigenId &&
    motivo.trim().length > 0 &&
    Number(montoManual) > 0 &&
    (!requiereLineas || lineasValidas.length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    try {
      const nota = await crearNota({
        tipo,
        facturaOrigenId,
        motivo,
        lineas: [],
        afectaInventario: false,
        montoManual,
      });

      if (nota.afectaInventario) {
        const totalUnidades = nota.lineas.reduce((acc, l) => acc + l.cantidad, 0);
        showToast(
          `${nota.numeroComprobante} registrada. Se revirtieron ${totalUnidades} unidad(es) a depósito de origen (simulado).`
        );
      } else {
        showToast(`${nota.numeroComprobante} registrada correctamente.`);
      }

      setIsNuevaOpen(false);
      cargarTodo();
    } catch (error) {
      alert(error.message || 'Error al registrar la nota.');
    } finally {
      setSubmitting(false);
    }
  };

  const notasFiltradas = useMemo(() => {
    if (filtroTipo === 'todas') return notas;
    return notas.filter((n) => n.tipo === filtroTipo);
  }, [notas, filtroTipo]);

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

      {/* Reporte integrado del período (criterio de aceptación 3) */}
      <div className="catalog-toolbar">
        <div className="select-field">
          Período desde:
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12.5px' }} />
        </div>
        <div className="select-field">
          hasta:
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12.5px' }} />
        </div>
        <div className="select-field">
          Tipo:
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="Nota de Crédito">Notas de Crédito</option>
            <option value="Nota de Débito">Notas de Débito</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNueva} disabled={loading} style={{ marginLeft: 'auto' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva nota
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-value">{resumen?.cantidadNotas ?? 0}</div>
          <div className="stat-label">Notas en el período</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--crit)' }}>
            −{formatearMonto(resumen?.totalNC ?? 0)}
          </div>
          <div className="stat-label">Total Notas de Crédito</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            +{formatearMonto(resumen?.totalND ?? 0)}
          </div>
          <div className="stat-label">Total Notas de Débito</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatearMonto(resumen?.netoAjustes ?? 0)}</div>
          <div className="stat-label">Ajuste neto sobre ventas</div>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Comprobante</th>
                <th>Tipo</th>
                <th>Comprobante origen</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Motivo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                    Cargando notas…
                  </td>
                </tr>
              ) : notasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                    No hay notas registradas todavía.
                  </td>
                </tr>
              ) : (
                notasFiltradas.map((n) => {
                  const venta = ventaById.get(n.facturaOrigenId);
                  const cliente = venta ? clienteById.get(venta.clienteId) : null;
                  return (
                    <tr key={n.id}>
                      <td className="cell-mono">{n.numeroComprobante}</td>
                      <td>
                        <span className={`badge ${n.tipo === 'Nota de Crédito' ? 'badge-red' : 'badge-green'}`}>
                          <span className="badge-dot"></span>
                          {n.tipo === 'Nota de Crédito' ? 'NC' : 'ND'}
                        </span>
                      </td>
                      <td className="cell-mono">{venta?.numeroComprobante || '—'}</td>
                      <td>{cliente?.razonSocial || '—'}</td>
                      <td>{formatearMonto(n.monto)}</td>
                      <td style={{ maxWidth: '220px' }}>{n.motivo}</td>
                      <td>{formatearFechaHora(n.fechaRegistro)}</td>
                      
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL: NUEVA NOTA                                                */}
      {/* ================================================================ */}
      <Modal
        isOpen={isNuevaOpen}
        onClose={() => setIsNuevaOpen(false)}
        title="Nueva nota de crédito / débito"
        wide
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsNuevaOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={!isFormValid || submitting} onClick={handleSubmit}>
              {submitting ? 'Registrando…' : 'Registrar nota'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-notice">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Toda nota debe vincularse obligatoriamente a un comprobante de venta original.
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>
                Tipo de comprobante<span className="req">*</span>
              </label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="Nota de Crédito">Nota de Crédito (devolución)</option>
                <option value="Nota de Débito">Nota de Débito (recargo)</option>
              </select>
            </div>
            <div className="form-field">
              <label>
                Comprobante de venta original<span className="req">*</span>
              </label>
              <select value={facturaOrigenId} onChange={(e) => setFacturaOrigenId(e.target.value)} required>
                <option value="" disabled>
                  Seleccionar comprobante…
                </option>
                {ventas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.numeroComprobante} — {clienteById.get(v.clienteId)?.razonSocial || 'Cliente'} ({formatearMonto(v.montoTotal)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full">
              <label>
                Motivo<span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Devolución por producto defectuoso"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>

         

          

          <div className="form-row">
            <div className="form-field">
              <label>
                Monto de la nota<span className="req">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={montoManual}
                onChange={(e) => setMontoManual(e.target.value)}
                placeholder="Ej: 45000"
              />
              {requiereLineas && montoCalculadoLineas > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                  Sugerido según artículos devueltos: {formatearMonto(montoCalculadoLineas)}
                </span>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Notas_credito_debito;
