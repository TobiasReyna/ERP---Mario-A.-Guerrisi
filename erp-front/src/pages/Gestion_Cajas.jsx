import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, FileText, X, Wallet, Calendar, User } from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import {
  obtenerDashboardCajas,
  obtenerHistorialCierres,
  obtenerDetalleCierre,
  abrirPdfCierre,
} from '../services/gestionCajasService';

const dinero = (valor) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(Number(valor || 0));

const fechaHora = (valor) => {
  if (!valor) return '—';

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
};

function Gestion_Cajas() {
  const [cajas, setCajas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [errorHistorial, setErrorHistorial] = useState('');

  const [cajerosDisponibles, setCajerosDisponibles] = useState([]);
  const [cajeroId, setCajeroId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [cierreSeleccionado, setCierreSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');
  const [errorPdf, setErrorPdf] = useState('');

  const cargarDashboard = useCallback(async (manual = false) => {
    if (manual) setActualizando(true);

    try {
      const data = await obtenerDashboardCajas();
      setCajas(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);

    try {
      const filtros = {};

      if (cajeroId) filtros.cajeroId = cajeroId;

      if (desde) {
        filtros.desde = new Date(`${desde}T00:00:00`).toISOString();
      }

      if (hasta) {
        filtros.hasta = new Date(`${hasta}T23:59:59.999`).toISOString();
      }

      const data = await obtenerHistorialCierres(filtros);
      setHistorial(data);
      setErrorHistorial('');
    } catch (e) {
      setErrorHistorial(e.message);
    } finally {
      setCargandoHistorial(false);
    }
  }, [cajeroId, desde, hasta]);

  useEffect(() => {
    cargarDashboard();

    const actualizar = () => cargarDashboard();

    const canal = supabase
      .channel('hu29-supervision-cajas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cajas' }, actualizar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caja_sesiones' }, actualizar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_venta' }, actualizar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caja_movimientos' }, actualizar)
      .subscribe();

    const intervalo = window.setInterval(() => {
      cargarDashboard();
    }, 60000);

    return () => {
      window.clearInterval(intervalo);
      supabase.removeChannel(canal);
    };
  }, [cargarDashboard]);

  useEffect(() => {
    obtenerHistorialCierres()
      .then((filas) => {
        const unicos = new Map();

        filas.forEach((fila) => {
          if (fila.cajeroId) {
            unicos.set(fila.cajeroId, fila.cajeroNombre);
          }
        });

        setCajerosDisponibles(
          [...unicos.entries()].sort((a, b) =>
            a[1].localeCompare(b[1], 'es')
          )
        );
      })
      .catch((e) => setErrorHistorial(e.message));
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const sucursales = useMemo(() => {
    const grupos = new Map();

    cajas.forEach((caja) => {
      if (!grupos.has(caja.depositoId)) {
        grupos.set(caja.depositoId, {
          id: caja.depositoId,
          nombre: caja.depositoNombre,
          cajas: [],
        });
      }

      grupos.get(caja.depositoId).cajas.push(caja);
    });

    return [...grupos.values()];
  }, [cajas]);

  const verDetalle = async (fila) => {
    setCierreSeleccionado(null);
    setErrorDetalle('');
    setErrorPdf('');
    setCargandoDetalle(true);

    try {
      const data = await obtenerDetalleCierre(fila.sesionId);
      setCierreSeleccionado(data);
    } catch (e) {
      setErrorDetalle(e.message);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirPdf = (sesionId) => {
    try {
      setErrorPdf('');
      abrirPdfCierre(sesionId);
    } catch (e) {
      setErrorPdf(e.message);
    }
  };

  if (cargando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#64748b', fontFamily: 'sans-serif' }}>
        <RefreshCw size={20} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
        Cargando estado de las cajas…
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      
      {/* Header estilo Foodie */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Panel de Control · Cajas</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Supervisión de efectivo en tiempo real y turnos</p>
        </div>

        <button
          type="button"
          onClick={() => cargarDashboard(true)}
          disabled={actualizando}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          <RefreshCw size={15} />
          {actualizando ? 'Actualizando…' : 'Actualizar ahora'}
        </button>
      </header>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Sucursales y Tarjetas de Caja */}
      {sucursales.map((sucursal) => (
        <section key={sucursal.id} style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '20px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{sucursal.nombre}</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {sucursal.cajas.map((caja) => (
              <article
                key={caja.cajaId}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px',
                  border: caja.requiereRetiro ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  boxShadow: caja.requiereRetiro ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#ef4444' }}>
                      <Wallet size={22} style={{ margin: 'auto' }} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{caja.nombre}</h3>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sucursal</span>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: caja.estado === 'Abierta' ? '#ecfdf5' : '#f1f5f9',
                      color: caja.estado === 'Abierta' ? '#059669' : '#64748b',
                      border: caja.estado === 'Abierta' ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                    }}
                  >
                    {caja.estado}
                  </span>
                </div>

                {caja.requiereRetiro && (
                  <div style={{ padding: '10px 12px', backgroundColor: '#ef4444', color: '#ffffff', borderRadius: '10px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <AlertTriangle size={16} />
                    <span>Retiro de Valores Sugerido</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Cajero Activo</span>
                    <strong style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>
                      {caja.estado === 'Abierta' ? caja.cajeroActivo || 'Sin nombre' : 'Sin turno'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Apertura</span>
                    <span style={{ fontSize: '12px', color: '#475569' }}>
                      {caja.fechaHoraApertura ? fechaHora(caja.fechaHoraApertura) : '—'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Saldo Efectivo</span>
                  <span style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{dinero(caja.saldoEfectivo)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* Tabla de Historial de Cierres */}
      <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Historial de Cierres</h2>

        {/* Filtros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Cajero</label>
            <select
              value={cajeroId}
              onChange={(e) => setCajeroId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
            >
              <option value="">Todos los cajeros</option>
              {cajerosDisponibles.map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setCajeroId('');
                setDesde('');
                setHasta('');
              }}
              style={{ width: '100%', padding: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {errorHistorial && <p style={{ color: '#ef4444', fontSize: '12px' }}>{errorHistorial}</p>}

        {/* Tabla estructurada */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAling: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: '11px' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Fecha Cierre</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Sucursal</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Caja</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cajero</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((fila) => (
                <tr
                  key={fila.sesionId}
                  onClick={() => verDetalle(fila)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                >
                  <td style={{ padding: '12px', fontWeight: '600' }}>{fechaHora(fila.cierre)}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{fila.depositoNombre}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{fila.cajaNombre}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{fila.cajeroNombre}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: fila.diferenciaArqueo < 0 ? '#fef2f2' : fila.diferenciaArqueo > 0 ? '#fffbeb' : '#ecfdf5',
                      color: fila.diferenciaArqueo < 0 ? '#ef4444' : fila.diferenciaArqueo > 0 ? '#d97706' : '#10b981'
                    }}>
                      {dinero(fila.diferenciaArqueo)}
                    </span>
                  </td>
                </tr>
              ))}

              {!cargandoHistorial && historial.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron registros de cierres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Detalle */}
      {(cargandoDetalle || cierreSeleccionado || errorDetalle) && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setCierreSeleccionado(null);
              setErrorDetalle('');
            }
          }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Detalle del Cierre</h2>
              <button
                type="button"
                onClick={() => {
                  setCierreSeleccionado(null);
                  setErrorDetalle('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {cierreSeleccionado && (
              <div style={{ fontSize: '13px', color: '#334155' }}>
                <p><strong>Cajero:</strong> {cierreSeleccionado.sesion.cajero}</p>
                <p><strong>Caja:</strong> {cierreSeleccionado.sesion.cajaNombre} ({cierreSeleccionado.sesion.depositoNombre})</p>
                <p><strong>Cierre:</strong> {fechaHora(cierreSeleccionado.sesion.cierre)}</p>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '16px' }}>Resumen de Efectivo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Fondo Inicial</span>
                    <strong>{dinero(cierreSeleccionado.sesion.montoInicial)}</strong>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Efectivo Contado</span>
                    <strong>{dinero(cierreSeleccionado.sesion.montoFisico)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => abrirPdf(cierreSeleccionado.sesion.sesionId)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    <FileText size={16} />
                    Exportar PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Gestion_Cajas;