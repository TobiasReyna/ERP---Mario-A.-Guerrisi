import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '../components/Modal';
import { formatearMonto } from '../utils/format';
import { listarDepositos } from '../services/ventaService';
import { listarCajas, obtenerSesionActiva, abrirCaja } from '../services/cajaService';
import { USUARIO_ACTUAL_ID } from '../config/sesion';

// Solo se permite volver a rutas internas (evita redirecciones a sitios externos).
function destinoSeguro(valor) {
  return valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/Punto_de_Venta';
}

function parsearMonto(texto) {
  const limpio = String(texto).trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function Apertura_Caja() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destino = destinoSeguro(searchParams.get('redirect'));

  const [verificando, setVerificando] = useState(true);
  const [sesionActiva, setSesionActiva] = useState(null);
  const [depositos, setDepositos] = useState([]);
  const [depositoId, setDepositoId] = useState('');
  const [cajas, setCajas] = useState([]);
  const [cajasListas, setCajasListas] = useState(false); // false mientras se consultan las cajas
  const [cajaId, setCajaId] = useState('');
  const [monto, setMonto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorCritico, setErrorCritico] = useState('');
  const [errorCarga, setErrorCarga] = useState('');

  // Verificación inicial: ¿el usuario ya tiene una caja abierta? + sucursales
  useEffect(() => {
    let cancelado = false;
    Promise.all([obtenerSesionActiva(USUARIO_ACTUAL_ID), listarDepositos()])
      .then(([sesion, deps]) => {
        if (cancelado) return;
        setSesionActiva(sesion);
        setDepositos(deps);
        if (deps.length > 0) setDepositoId(deps[0].id);
        if (sesion) {
          setErrorCritico(`Ya tenés una sesión de caja activa (${sesion.cajaNombre}). Cerrala antes de abrir otra.`);
        }
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
      .finally(() => !cancelado && setVerificando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  const cargarCajas = useCallback(async (idDeposito) => {
    if (!idDeposito) return [];
    try {
      const lista = await listarCajas(idDeposito);
      setCajas(lista);
      return lista;
    } catch (err) {
      setErrorCarga(err.message);
      return [];
    } finally {
      setCajasListas(true);
    }
  }, []);

  // Carga las cajas de la sucursal elegida (ignora respuestas viejas si se cambia de sucursal)
  useEffect(() => {
    if (!depositoId) return undefined;
    let cancelado = false;
    listarCajas(depositoId)
      .then((lista) => {
        if (cancelado) return;
        setCajas(lista);
        if (lista.filter((c) => c.estado === 'Abierta').length >= 2) {
          setErrorCritico('La sucursal ya tiene 2 cajas abiertas. No se puede abrir otra hasta que se cierre una.');
        }
      })
      .catch((err) => !cancelado && setErrorCritico(err.message))
      .finally(() => !cancelado && setCajasListas(true));
    return () => {
      cancelado = true;
    };
  }, [depositoId]);

  const cajasAbiertas = useMemo(() => cajas.filter((c) => c.estado === 'Abierta').length, [cajas]);
  const sucursalLlena = cajasAbiertas >= 2;
  const montoNum = parsearMonto(monto);
  const montoInvalido = monto.trim() !== '' && montoNum === null;
  const cajaElegida = cajas.find((c) => c.cajaId === cajaId);

  const bloqueado = !!sesionActiva || sucursalLlena;
  const puedeEnviar = !bloqueado && !enviando && !!cajaElegida && cajaElegida.estado === 'Cerrada' && montoNum !== null;

  const handleAbrir = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;
    setEnviando(true);
    try {
      await abrirCaja({ cajaId, usuarioId: USUARIO_ACTUAL_ID, montoInicial: montoNum });
      navigate(destino, { replace: true }); // el POS se habilita al instante
    } catch (err) {
      setErrorCritico(err.message);
      // Otro cajero pudo ganarnos de mano: refrescamos el estado real de las cajas.
      cargarCajas(depositoId);
      if (err.codigo === 'USUARIO_CON_CAJA_ABIERTA') {
        obtenerSesionActiva(USUARIO_ACTUAL_ID).then(setSesionActiva).catch(() => {});
      }
    } finally {
      setEnviando(false);
    }
  };

  if (verificando) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>Verificando estado de la caja…</div>;
  }

  if (errorCarga && depositos.length === 0) {
    return (
      <div className="table-panel" style={{ maxWidth: '520px', margin: '60px auto', padding: '28px', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>No se pudo conectar con el servidor</div>
        <div style={{ color: 'var(--gray-500)', fontSize: '13px', marginBottom: '16px' }}>{errorCarga}</div>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '30px auto' }}>
      <form className="table-panel" style={{ padding: '28px' }} onSubmit={handleAbrir}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>Apertura de caja</h2>
        <p style={{ margin: '0 0 22px', color: 'var(--gray-500)', fontSize: '13px' }}>
          Para operar el Punto de Venta primero tenés que abrir tu turno indicando el fondo de caja.
        </p>

        <div className="form-field" style={{ marginBottom: '16px' }}>
          <label>Sucursal</label>
          <select
            value={depositoId}
            onChange={(e) => {
              setDepositoId(e.target.value);
              setCajaId(''); // la caja elegida pertenecía a otra sucursal
              setCajas([]);
              setCajasListas(false);
            }}
            disabled={enviando}
          >
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>
        </div>

        <div className="form-field" style={{ marginBottom: '16px' }}>
          <label>Caja</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {!cajasListas && (
              <div style={{ gridColumn: '1 / -1', color: 'var(--gray-500)', fontSize: '13px' }}>Cargando cajas…</div>
            )}
            {cajas.map((c) => {
              const ocupada = c.estado === 'Abierta';
              const elegida = c.cajaId === cajaId;
              return (
                <button
                  key={c.cajaId}
                  type="button"
                  disabled={ocupada || enviando || !!sesionActiva}
                  onClick={() => setCajaId(c.cajaId)}
                  style={{
                    textAlign: 'left', padding: '14px', borderRadius: '8px', cursor: ocupada ? 'not-allowed' : 'pointer',
                    border: elegida ? '2px solid #111827' : '1px solid var(--gray-200, #e5e7eb)',
                    background: ocupada ? '#f9fafb' : '#fff', opacity: ocupada ? 0.7 : 1,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>{c.nombre}</div>
                  {ocupada ? (
                    <span className="badge badge-red"><span className="badge-dot" />Abierta{c.cajero?.nombre ? ` · ${c.cajero.nombre}` : ''}</span>
                  ) : (
                    <span className="badge badge-green"><span className="badge-dot" />Cerrada · disponible</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-field" style={{ marginBottom: '8px' }}>
          <label>Monto inicial (fondo de caja)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0,00"
              disabled={enviando || !!sesionActiva}
              style={{ paddingLeft: '24px', width: '100%', boxSizing: 'border-box' }}
              autoComplete="off"
            />
          </div>
          {montoInvalido && (
            <span style={{ fontSize: '12px', color: 'var(--crit, #dc2626)' }}>
              Ingresá un número mayor o igual a 0.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px' }}>
          <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
            {cajaElegida && montoNum !== null
              ? `Vas a abrir ${cajaElegida.nombre} con ${formatearMonto(montoNum)}.`
              : `Cajas abiertas en la sucursal: ${cajasAbiertas} de 2.`}
          </span>
          <button type="submit" className="btn btn-primary" disabled={!puedeEnviar}>
            {enviando ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </div>
      </form>

      {/* Error crítico: bloquea la acción hasta que el usuario lo cierre */}
      <Modal
        isOpen={!!errorCritico}
        onClose={() => setErrorCritico('')}
        title="No se puede abrir la caja"
        footer={
          sesionActiva ? (
            <button type="button" className="btn btn-primary" onClick={() => navigate(destino, { replace: true })}>
              Ir al Punto de Venta
            </button>
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => setErrorCritico('')}>Entendido</button>
          )
        }
      >
        <div className="modal-notice" style={{ borderColor: 'var(--crit, #dc2626)' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {errorCritico}
        </div>
      </Modal>
    </div>
  );
}

export default Apertura_Caja;