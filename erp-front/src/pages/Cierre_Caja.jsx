import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { formatearMonto, formatearFechaHora } from '../utils/format';
import { obtenerContextoArqueo, cerrarCaja, descargarReporteCierre } from '../services/cajaService';
import { USUARIO_ACTUAL_ID } from '../config/sesion';

const SEGUNDOS_REDIRECCION = 10;

function parsearMonto(texto) {
  const limpio = String(texto).trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * HU-28 · Cierre y arqueo ciego.
 * Esta pantalla jamás recibe ni muestra el saldo teórico: el cajero cuenta el efectivo
 * sin conocer cuánto "debería" haber, y el servidor calcula la diferencia.
 */
function Cierre_Caja() {
  const navigate = useNavigate();
  const [contexto, setContexto] = useState(undefined); // undefined = cargando · null = sin caja abierta
  const [errorCarga, setErrorCarga] = useState('');
  const [monto, setMonto] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [errorReporte, setErrorReporte] = useState('');
  const [segundos, setSegundos] = useState(SEGUNDOS_REDIRECCION);
  const [reintento, setReintento] = useState(0);
  const descargado = useRef(false);

  useEffect(() => {
    let cancelado = false;
    obtenerContextoArqueo(USUARIO_ACTUAL_ID)
      .then((c) => {
        if (cancelado) return;
        setErrorCarga('');
        setContexto(c);
      })
      .catch((e) => !cancelado && setErrorCarga(e.message));
    return () => {
      cancelado = true;
    };
  }, [reintento]);

  // Caja cerrada con éxito: se descarga el reporte y se vuelve al dashboard
  const bajarReporte = (sesionId) => {
    setErrorReporte('');
    return descargarReporteCierre(sesionId, USUARIO_ACTUAL_ID).catch((e) => setErrorReporte(e.message));
  };

  useEffect(() => {
    if (!resultado || descargado.current) return;
    descargado.current = true;
    descargarReporteCierre(resultado.sesionId, USUARIO_ACTUAL_ID).catch((e) => setErrorReporte(e.message));
  }, [resultado]);

  useEffect(() => {
    if (!resultado) return undefined;
    const t = setInterval(() => setSegundos((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resultado]);

  useEffect(() => {
    if (resultado && segundos <= 0) navigate('/', { replace: true });
  }, [resultado, segundos, navigate]);

  const montoNum = parsearMonto(monto);
  const montoInvalido = monto.trim() !== '' && montoNum === null;
  const pendientes = contexto?.ventasPendientesConCobros || 0;
  const puedeCerrar = !!contexto && pendientes === 0 && montoNum !== null && !enviando;

  const handleConfirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      const r = await cerrarCaja({ usuarioId: USUARIO_ACTUAL_ID, montoFisico: montoNum });
      setConfirmando(false);
      setResultado(r);
    } catch (e) {
      setConfirmando(false);
      setError(e.message);
      if (e.codigo === 'VENTAS_PENDIENTES' || e.codigo === 'SIN_CAJA_ABIERTA') setReintento((n) => n + 1);
    } finally {
      setEnviando(false);
    }
  };

  // ── Estados de carga / error ──
  if (errorCarga) {
    return (
      <div className="table-panel" style={{ maxWidth: '520px', margin: '60px auto', padding: '28px', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>No se pudo conectar con el servidor</div>
        <div style={{ color: 'var(--gray-500)', fontSize: '13px', marginBottom: '16px' }}>{errorCarga}</div>
        <button type="button" className="btn btn-primary" onClick={() => setReintento((n) => n + 1)}>Reintentar</button>
      </div>
    );
  }
  if (contexto === undefined) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>Verificando estado de la caja…</div>;
  }

  // ── Resultado del cierre ──
  if (resultado) {
    const dif = Number(resultado.diferenciaArqueo);
    const color = dif < 0 ? '#b91c1c' : dif > 0 ? '#b45309' : '#047857';
    return (
      <div className="table-panel" style={{ maxWidth: '560px', margin: '40px auto', padding: '32px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 4px' }}>Caja cerrada</h2>
        <p style={{ margin: '0 0 22px', color: 'var(--gray-500)', fontSize: '13px' }}>
          {resultado.cajaNombre} · {formatearFechaHora(resultado.fechaHoraCierre)}
        </p>
        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Efectivo contado</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>{formatearMonto(resultado.montoFisico)}</div>
        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Resultado del arqueo</div>
        <div data-testid="resultado-arqueo" style={{ fontSize: '1.8rem', fontWeight: 800, color }}>
          {resultado.resultado === 'Sin diferencia' ? 'Sin diferencia' : `${resultado.resultado} ${dif > 0 ? '+' : '-'}${formatearMonto(Math.abs(dif))}`}
        </div>

        {errorReporte && (
          <div role="alert" style={{ marginTop: '16px', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{errorReporte}</div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={() => bajarReporte(resultado.sesionId)}>
            Descargar reporte de cierre (PDF)
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>
            Ir al dashboard
          </button>
        </div>
        <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--gray-500)' }}>
          Volviendo al dashboard en {Math.max(segundos, 0)} s…
        </div>
      </div>
    );
  }

  // ── Sin caja abierta ──
  if (contexto === null) {
    return (
      <div className="table-panel" style={{ maxWidth: '520px', margin: '60px auto', padding: '28px', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>No tenés una caja abierta</div>
        <div style={{ color: 'var(--gray-500)', fontSize: '13px', marginBottom: '16px' }}>Para cerrar una caja primero tenés que abrirla.</div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/Apertura_Caja', { replace: true })}>
          Ir a la apertura de caja
        </button>
      </div>
    );
  }

  // ── Formulario de arqueo ──
  return (
    <div style={{ maxWidth: '640px', margin: '30px auto' }}>
      <form
        className="table-panel"
        style={{ padding: '28px' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (puedeCerrar) setConfirmando(true);
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>Cierre y arqueo de caja</h2>
        <p style={{ margin: '0 0 18px', color: 'var(--gray-500)', fontSize: '13px' }}>
          {contexto.cajaNombre} · {contexto.depositoNombre} · abierta el {formatearFechaHora(contexto.fechaHoraApertura)}
        </p>

        <div className="modal-notice" style={{ marginBottom: '18px' }}>
          Es un arqueo ciego: contá todo el efectivo de la gaveta (billetes y monedas) e ingresá el total. El sistema no
          te muestra el saldo esperado para que el conteo sea independiente, y calcula el faltante o sobrante al confirmar.
        </div>

        {pendientes > 0 && (
          <div role="alert" style={{ marginBottom: '16px', padding: '12px 14px', border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
            Tenés {pendientes} venta{pendientes === 1 ? '' : 's'} con cobros parciales sin confirmar ni cancelar. Resolvela{pendientes === 1 ? '' : 's'} en el
            Punto de Venta antes de cerrar la caja.
            <div style={{ marginTop: '8px' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/Punto_de_Venta')}>Volver al Punto de Venta</button>
            </div>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="efectivo-fisico">Total Efectivo Físico <span style={{ color: '#dc2626' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }}>$</span>
            <input
              id="efectivo-fisico"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              disabled={pendientes > 0 || enviando}
              style={{ paddingLeft: '24px', width: '100%', boxSizing: 'border-box' }}
              autoComplete="off"
              autoFocus
            />
          </div>
          {montoInvalido && <span style={{ fontSize: '12px', color: '#dc2626' }}>Ingresá un número mayor o igual a 0.</span>}
        </div>

        {error && (
          <div role="alert" style={{ marginTop: '14px', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '22px' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/Punto_de_Venta')} disabled={enviando}>
            Volver al Punto de Venta
          </button>
          <button type="submit" className="btn btn-primary" disabled={!puedeCerrar}>Cerrar caja</button>
        </div>
      </form>

      <Modal
        isOpen={confirmando}
        onClose={() => !enviando && setConfirmando(false)}
        title="Confirmar cierre de caja"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setConfirmando(false)} disabled={enviando}>Revisar</button>
            <button type="button" className="btn btn-primary" onClick={handleConfirmar} disabled={enviando}>
              {enviando ? 'Cerrando…' : 'Confirmar cierre'}
            </button>
          </>
        }
      >
        <div className="modal-notice">
          Vas a cerrar {contexto.cajaNombre} con {formatearMonto(montoNum ?? 0)} de efectivo contado. El cierre no se puede
          modificar ni deshacer, y vas a perder el acceso al Punto de Venta hasta abrir una nueva caja.
        </div>
      </Modal>
    </div>
  );
}

export default Cierre_Caja;