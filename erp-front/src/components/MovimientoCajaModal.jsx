import { useState, useEffect, useMemo, useId } from 'react';
import Modal from './Modal';
import { formatearMonto, formatearFechaHora } from '../utils/format';
import { imprimirComprobanteMovimiento } from '../utils/imprimirMovimiento';
import { listarConceptosCaja, listarMovimientosCaja, registrarMovimientoCaja } from '../services/cajaService';

function parsearMonto(texto) {
  const limpio = String(texto).trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * HU-27 · Registro de ingresos / egresos manuales de efectivo.
 * Los movimientos no se editan ni se borran: un error se corrige con un contra-asiento.
 */
function MovimientoCajaModal({ isOpen, onClose, usuarioId, resumen, onResumenActualizado }) {
  const uid = useId();
  const idMonto = `${uid}-monto`;
  const idConcepto = `${uid}-concepto`;
  const idObs = `${uid}-obs`;
  const [conceptos, setConceptos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [tipo, setTipo] = useState('Egreso');
  const [monto, setMonto] = useState('');
  const [conceptoId, setConceptoId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [compensando, setCompensando] = useState(null); // movimiento original, si es un contra-asiento
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [limiteSuperado, setLimiteSuperado] = useState(null); // monto del límite si hace falta autorización

  const recargarMovimientos = () =>
    listarMovimientosCaja(usuarioId).then(setMovimientos).catch((e) => setError(e.message));

  // Al abrir: catálogo de conceptos + historial del turno
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelado = false;
    Promise.all([listarConceptosCaja(), listarMovimientosCaja(usuarioId)])
      .then(([cs, ms]) => {
        if (cancelado) return;
        setConceptos(cs);
        setMovimientos(ms);
      })
      .catch((e) => !cancelado && setError(e.message));
    return () => {
      cancelado = true;
    };
  }, [isOpen, usuarioId]);

  const conceptoCorreccion = useMemo(() => conceptos.find((c) => c.esCorreccion), [conceptos]);
  const conceptosVisibles = useMemo(
    () => conceptos.filter((c) => !c.esCorreccion && (c.aplicaA === 'Ambos' || c.aplicaA === tipo)),
    [conceptos, tipo]
  );

  const montoNum = parsearMonto(monto);
  const montoInvalido = monto.trim() !== '' && montoNum === null;
  const formularioValido = montoNum !== null && !!conceptoId;

  const limpiarFormulario = () => {
    setMonto('');
    setConceptoId('');
    setObservacion('');
    setCompensando(null);
    setError('');
  };

  const cambiarTipo = (nuevo) => {
    if (compensando) return; // el tipo de un contra-asiento queda fijo (opuesto al original)
    setTipo(nuevo);
    setConceptoId('');
  };

  const iniciarCompensacion = (mov) => {
    setCompensando(mov);
    setTipo(mov.tipo === 'Egreso' ? 'Ingreso' : 'Egreso');
    setMonto(String(mov.monto));
    setConceptoId(conceptoCorreccion ? conceptoCorreccion.id : '');
    setObservacion(`Corrige ${mov.tipo.toLowerCase()} de ${formatearMonto(mov.monto)} (${mov.concepto})`);
    setError('');
    setExito('');
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formularioValido || enviando) return;
    setEnviando(true);
    setError('');
    setExito('');
    try {
      const data = await registrarMovimientoCaja({
        usuarioId,
        tipo,
        monto: montoNum,
        conceptoId,
        observacion: observacion.trim() || undefined,
        contraAsientoDe: compensando ? compensando.movimientoId : undefined,
      });
      // HTTP 200: se actualiza el saldo sin recargar y se dispara el comprobante no fiscal
      onResumenActualizado(data.resumen);
      imprimirComprobanteMovimiento(data);
      setExito(`${data.tipo} registrado por ${formatearMonto(data.monto)}.`);
      limpiarFormulario();
      recargarMovimientos();
    } catch (err) {
      if (err.codigo === 'REQUIERE_AUTORIZACION') {
        setLimiteSuperado(err.limite);
      } else {
        setError(err.message);
        if (err.codigo === 'YA_COMPENSADO') recargarMovimientos();
      }
    } finally {
      setEnviando(false);
    }
  };

  const etiquetaMonto = { fontSize: '12px', color: 'var(--gray-500)' };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Movimientos de caja"
        wide
        footer={<button type="button" className="btn btn-outline" onClick={onClose}>Cerrar (Esc)</button>}
      >
        {/* Saldo actual: se actualiza al instante con cada movimiento */}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}
        >
          <div>
            <div style={etiquetaMonto}>Saldo actual en efectivo</div>
            <div data-testid="saldo-efectivo" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>
              {resumen ? formatearMonto(resumen.saldoEfectivo) : '—'}
            </div>
          </div>
          {resumen && (
            <div style={{ ...etiquetaMonto, textAlign: 'right', lineHeight: 1.6 }}>
              Fondo {formatearMonto(resumen.fondoInicial)} · Ventas {formatearMonto(resumen.ventasEfectivo)}<br />
              Ingresos {formatearMonto(resumen.ingresos)} · Egresos {formatearMonto(resumen.egresos)}
            </div>
          )}
        </div>

        <form onSubmit={handleGuardar}>
          {compensando && (
            <div className="modal-notice" style={{ marginBottom: '12px' }}>
              Estás compensando un {compensando.tipo.toLowerCase()} de {formatearMonto(compensando.monto)} ({compensando.concepto}).
              <button type="button" onClick={limpiarFormulario} style={{ marginLeft: '10px', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
                Cancelar corrección
              </button>
            </div>
          )}

          <div style={{ display: 'inline-flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
            {['Egreso', 'Ingreso'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => cambiarTipo(t)}
                disabled={!!compensando && tipo !== t}
                aria-pressed={tipo === t}
                style={{
                  padding: '7px 18px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: compensando ? 'default' : 'pointer',
                  background: tipo === t ? (t === 'Egreso' ? '#b91c1c' : '#047857') : '#fff',
                  color: tipo === t ? '#fff' : '#374151',
                }}
              >
                {t === 'Egreso' ? 'Egreso (retiro)' : 'Ingreso'}
              </button>
            ))}
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
            <div className="form-field">
              <label htmlFor={idMonto}>Monto <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }}>$</span>
                <input
                  id={idMonto}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  disabled={enviando || !!compensando}
                  style={{ paddingLeft: '24px', width: '100%', boxSizing: 'border-box' }}
                  autoComplete="off"
                />
              </div>
              {montoInvalido && <span style={{ fontSize: '12px', color: '#dc2626' }}>El monto debe ser mayor a 0.</span>}
            </div>
            <div className="form-field">
              <label htmlFor={idConcepto}>Concepto <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                id={idConcepto}
                value={conceptoId}
                onChange={(e) => setConceptoId(e.target.value)}
                disabled={enviando || !!compensando}
              >
                <option value="">Seleccioná un concepto…</option>
                {(compensando && conceptoCorreccion ? [conceptoCorreccion] : conceptosVisibles).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field" style={{ marginTop: '10px' }}>
            <label htmlFor={idObs}>Observación <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}>(opcional)</span></label>
            <textarea
              id={idObs}
              rows={2}
              maxLength={500}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              disabled={enviando}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {error && (
            <div role="alert" style={{ marginTop: '10px', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</div>
          )}
          {exito && !error && (
            <div role="status" style={{ marginTop: '10px', color: '#047857', fontSize: '13px', fontWeight: 600 }}>{exito}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button type="submit" className="btn btn-primary" disabled={!formularioValido || enviando}>
              {enviando ? 'Guardando…' : compensando ? 'Registrar contra-asiento' : `Registrar ${tipo.toLowerCase()}`}
            </button>
          </div>
        </form>

        {/* Historial del turno: solo lectura */}
        <div style={{ marginTop: '20px', fontWeight: 700, fontSize: '13px' }}>Movimientos de este turno</div>
        <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: '6px', marginTop: '8px' }}>
          {movimientos.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '13px' }}>
              Todavía no registraste movimientos manuales.
            </div>
          ) : (
            movimientos.map((m) => (
              <div key={m.movimientoId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '12.5px' }}>
                <span className={`badge ${m.tipo === 'Egreso' ? 'badge-red' : 'badge-green'}`}>
                  <span className="badge-dot" />{m.tipo}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {m.concepto}
                    {m.esContraAsiento && <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}> · corrección</span>}
                    {m.compensado && <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}> · compensado</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                    {formatearFechaHora(m.fechaHora)}{m.observacion ? ` — ${m.observacion}` : ''}
                  </div>
                </div>
                <div className="cell-mono" style={{ fontWeight: 700, color: m.tipo === 'Egreso' ? '#b91c1c' : '#047857' }}>
                  {m.tipo === 'Egreso' ? '-' : '+'}{formatearMonto(m.monto)}
                </div>
                {!m.esContraAsiento && !m.compensado && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => iniciarCompensacion(m)} disabled={enviando}>
                    Compensar
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Egreso por encima del límite: aquí iría el PIN del Encargado (pendiente) */}
      <Modal
        isOpen={limiteSuperado !== null}
        onClose={() => setLimiteSuperado(null)}
        title="Autorización requerida"
        footer={<button type="button" className="btn btn-primary" onClick={() => setLimiteSuperado(null)}>Entendido</button>}
      >
        <div className="modal-notice" style={{ borderColor: '#dc2626' }}>
          Este egreso supera el límite de retiro de {formatearMonto(limiteSuperado ?? 0)} y requiere la autorización de un Encargado.
          La validación por PIN todavía no está habilitada, por lo que el movimiento no se registró.
        </div>
      </Modal>
    </>
  );
}

export default MovimientoCajaModal;