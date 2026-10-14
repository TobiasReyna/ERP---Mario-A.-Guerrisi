import React, { useState, useEffect, useCallback } from 'react';
import './LibroDiario.css';

const LibroDiario = () => {
  const fechaHoy = new Date().toISOString().split('T')[0];

  // 1. Inicializamos los estados leyendo de sessionStorage (si existen) o usando valores por defecto
  const [fecha, setFecha] = useState(() => sessionStorage.getItem('libroDiario_fecha') || fechaHoy);
  const [depositoId, setDepositoId] = useState(() => sessionStorage.getItem('libroDiario_depositoId') || '');
  const [tipoEvento, setTipoEvento] = useState(() => sessionStorage.getItem('libroDiario_tipoEvento') || '');
  
  const [depositos, setDepositos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filaExpandida, setFilaExpandida] = useState(null);
  const [detalleInfo, setDetalleInfo] = useState(null);

  // 2. Cargar depósitos (sucursales) al montar la pantalla
  useEffect(() => {
    fetch('http://localhost:3001/api/depositos')
      .then(res => res.json())
      .then(data => {
        setDepositos(data);
        // Si no hay depositoId guardado en sessionStorage, selecciona el primero automáticamente
        if (!sessionStorage.getItem('libroDiario_depositoId') && data.length > 0) {
          setDepositoId(data[0].id);
        }
      })
      .catch(err => console.error('Error al cargar sucursales:', err));
  }, []);

  // 3. Cada vez que cambie un filtro, lo guardamos en sessionStorage
  useEffect(() => {
    sessionStorage.setItem('libroDiario_fecha', fecha);
    sessionStorage.setItem('libroDiario_depositoId', depositoId);
    sessionStorage.setItem('libroDiario_tipoEvento', tipoEvento);
  }, [fecha, depositoId, tipoEvento]);

  // 4. Lógica de consulta (envuelta en useCallback para poder usarla en el auto-fetch)
  const consultarLibro = useCallback(async () => {
    if (!depositoId) return;

    setLoading(true);
    setError(null);
    setFilaExpandida(null); // Cerramos el detalle abierto si se actualiza la tabla
    
    const query = new URLSearchParams({
      fecha,
      deposito_id: depositoId,
      ...(tipoEvento && { tipo_evento: tipoEvento })
    });

    try {
      const res = await fetch(`http://localhost:3001/api/tesoreria/libro-diario?${query.toString()}`);
      if (!res.ok) throw new Error('Error al consultar los datos');
      const data = await res.json();
      setMovimientos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fecha, depositoId, tipoEvento]);

  // 5. Carga automática: Se ejecuta cuando se monta el componente o cuando cambian los filtros
  useEffect(() => {
    if (depositoId) {
      consultarLibro();
    }
  }, [consultarLibro, depositoId]);

  const handleRowClick = async (movimiento) => {
    const uniqueId = `${movimiento.evento_id}-${movimiento.tipo_evento}`;

    if (filaExpandida === uniqueId) {
      setFilaExpandida(null);
      return;
    }
    
    setFilaExpandida(uniqueId);
    setDetalleInfo('Cargando detalle...');

    if (movimiento.tipo_evento === 'Venta' || movimiento.tipo_evento === 'Ingreso' || movimiento.tipo_evento === 'Egreso') {
      try {
        const query = new URLSearchParams({
          tipo_evento: movimiento.tipo_evento,
          referencia_id: movimiento.referencia_id
        });
        const res = await fetch(`http://localhost:3001/api/tesoreria/libro-diario/detalle?${query.toString()}`);
        const data = await res.json();
        setDetalleInfo(data);
      } catch (err) {
        setDetalleInfo('Error al cargar detalle');
      }
    } else {
      setDetalleInfo('No hay detalle adicional para este evento.');
    }
  };

  // Calcular totales para las tarjetas (Kpis)
  const totalVentas = movimientos.filter(m => m.tipo_evento === 'Venta').reduce((acc, m) => acc + Number(m.monto), 0);
  const totalIngresos = movimientos.filter(m => m.tipo_evento === 'Ingreso').reduce((acc, m) => acc + Number(m.monto), 0);
  const totalEgresos = movimientos.filter(m => m.tipo_evento === 'Egreso').reduce((acc, m) => acc + Number(m.monto), 0);
  const totalMovimientos = movimientos.length;

  const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  
  const getBadgeClass = (tipo) => {
    const map = {
      'Venta': 'badge-venta',
      'Ingreso': 'badge-ingreso',
      'Egreso': 'badge-egreso',
      'Apertura': 'badge-apertura',
      'Cierre': 'badge-cierre'
    };
    return `badge ${map[tipo] || 'badge-apertura'}`;
  };

  return (
    <div className="libro-diario-container">
      
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-value" style={{ color: '#2563eb' }}>{totalMovimientos}</div>
          <div className="summary-label">Movimientos Registrados</div>
        </div>
        <div className="summary-card">
          <div className="summary-value monto" style={{ color: '#16a34a' }}>{formatMoney(totalVentas + totalIngresos)}</div>
          <div className="summary-label">Total Entradas (Ventas + Ingresos)</div>
        </div>
        <div className="summary-card">
          <div className="summary-value monto" style={{ color: '#dc2626' }}>{formatMoney(totalEgresos)}</div>
          <div className="summary-label">Total Salidas (Egresos)</div>
        </div>
        <div className="summary-card">
          <div className="summary-value monto">{formatMoney(totalVentas + totalIngresos - totalEgresos)}</div>
          <div className="summary-label">Balance del Listado</div>
        </div>
      </div>

      {/* Cambiamos el onSubmit del form a un simple div o conservamos el preventDefault */}
      <div className="filter-bar">
        <div className="form-group">
          <label>Sucursal:</label>
          <select className="form-input" value={depositoId} onChange={(e) => setDepositoId(e.target.value)} required>
            {depositos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Fecha:</label>
          <input 
            className="form-input"
            type="date" 
            value={fecha} 
            max={fechaHoy} 
            onChange={(e) => setFecha(e.target.value)} 
            required 
          />
        </div>
        <div className="form-group">
          <label>Tipo:</label>
          <select className="form-input" value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="Apertura">Apertura</option>
            <option value="Venta">Venta</option>
            <option value="Ingreso">Ingreso Manual</option>
            <option value="Egreso">Egreso Manual</option>
            <option value="Cierre">Cierre</option>
          </select>
        </div>
        
        {/* El botón ahora es de tipo "button" y ejecuta la recarga manual */}
        <button type="button" onClick={consultarLibro} className="btn-consultar" disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>}

      {!loading && movimientos.length === 0 && (
        <div className="msg-vacio">No hay movimientos registrados con los filtros seleccionados.</div>
      )}

      {!loading && movimientos.length > 0 && (
        <div className="table-container">
          <table className="tabla-diario">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Hora</th>
                <th>Caja</th>
                <th>Cajero</th>
                <th>Detalle</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov) => {
                const uniqueId = `${mov.evento_id}-${mov.tipo_evento}`;
                
                return (
                  <React.Fragment key={uniqueId}>
                    <tr className="fila-clickeable" onClick={() => handleRowClick(mov)}>
                      <td>
                        <span className={getBadgeClass(mov.tipo_evento)}>
                          {mov.tipo_evento.toUpperCase()}
                        </span>
                      </td>
                      <td>{new Date(mov.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{mov.caja_nombre}</td>
                      <td>{mov.cajero_nombre}</td>
                      <td>{mov.detalle} {mov.medio_pago ? `(${mov.medio_pago})` : ''}</td>
                      <td style={{ fontWeight: '500' }}>{formatMoney(mov.monto)}</td>
                    </tr>
                    {filaExpandida === uniqueId && (
                      <tr className="detalle-row">
                        <td colSpan="6">
                          <div className="detalle-contenido">
                            {typeof detalleInfo === 'string' ? (
                              <p>{detalleInfo}</p>
                            ) : (
                              <div>
                                {mov.tipo_evento === 'Venta' && detalleInfo?.ventas_detalle && (
                                  <>
                                    <ul>
                                      {detalleInfo.ventas_detalle.map((item, i) => (
                                        <li key={i}>{item.cantidad}x {item.articulos?.descripcion} - {formatMoney(item.importe_linea)}</li>
                                      ))}
                                    </ul>
                                    <p><strong>Cliente:</strong> {detalleInfo.clientes?.razon_social || 'Consumidor Final'}</p>
                                  </>
                                )}
                                {(mov.tipo_evento === 'Ingreso' || mov.tipo_evento === 'Egreso') && (
                                  <p><strong>Observación:</strong> {detalleInfo?.observacion || 'Ninguna registrada.'}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LibroDiario;