import React, { useState, useEffect, useCallback } from 'react';
import './ResumenDiario.css';
import { FileText } from 'lucide-react';

const ResumenDiario = () => {
  const fechaHoy = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(() => sessionStorage.getItem('resumen_fecha') || fechaHoy);
  const [depositoId, setDepositoId] = useState(() => sessionStorage.getItem('resumen_depositoId') || '');
  const [depositos, setDepositos] = useState([]);
  const [resumenes, setResumenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/depositos')
      .then(res => res.json())
      .then(data => {
        setDepositos(data);
        if (!sessionStorage.getItem('resumen_depositoId') && data.length > 0) {
          setDepositoId(data[0].id);
        }
      })
      .catch(err => console.error('Error al cargar sucursales:', err));
  }, []);

  useEffect(() => {
    sessionStorage.setItem('resumen_fecha', fecha);
    sessionStorage.setItem('resumen_depositoId', depositoId);
  }, [fecha, depositoId]);

  const consultarResumen = useCallback(async () => {
    if (!depositoId) return;
    setLoading(true);
    setError(null);
    
    const query = new URLSearchParams({ fecha, deposito_id: depositoId });

    try {
      const res = await fetch(`http://localhost:3001/api/tesoreria/resumen-diario?${query.toString()}`);
      if (!res.ok) throw new Error('Error al consultar los datos');
      const data = await res.json();
      setResumenes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fecha, depositoId]);

  useEffect(() => {
    if (depositoId) consultarResumen();
  }, [consultarResumen, depositoId]);

  const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(amount) || 0);
  
  const renderDiferencia = (diff, estado) => {
    if (estado === 'En curso') return '-';
    const numDiff = Number(diff);
    if (numDiff === 0) return <span className="diff-ok">{formatMoney(numDiff)}</span>;
    if (numDiff > 0) return <span className="diff-sobrante">{formatMoney(numDiff)}</span>;
    return <span className="diff-faltante">{formatMoney(numDiff)}</span>;
  };

  const descargarPDF = (sesionId) => {
    // Aquí conectarías con tu lógica real de generación de PDF
    alert(`Generando Reporte de Cierre (PDF) para el turno: ${sesionId}`);
  };

  // Cálculo de totales (AC2)
  const totales = resumenes.reduce((acc, curr) => ({
    fondo: acc.fondo + Number(curr.fondo_inicial),
    vEfectivo: acc.vEfectivo + Number(curr.ventas_efectivo),
    vDebito: acc.vDebito + Number(curr.ventas_debito),
    vCredito: acc.vCredito + Number(curr.ventas_credito),
    vTransf: acc.vTransf + Number(curr.ventas_transferencia),
    ingresos: acc.ingresos + Number(curr.ingresos),
    egresos: acc.egresos + Number(curr.egresos),
    saldoTeorico: acc.saldoTeorico + Number(curr.saldo_teorico),
    contado: acc.contado + Number(curr.efectivo_contado || 0),
    diferencia: acc.diferencia + Number(curr.diferencia || 0)
  }), { fondo: 0, vEfectivo: 0, vDebito: 0, vCredito: 0, vTransf: 0, ingresos: 0, egresos: 0, saldoTeorico: 0, contado: 0, diferencia: 0 });

  const totalVentasPagos = totales.vEfectivo + totales.vDebito + totales.vCredito + totales.vTransf;


    const exportarPDF = async () => {
  try {
    // Si tu sistema usa JWT en localStorage, lo obtenemos:
    const token = localStorage.getItem('token'); 
    
    const query = new URLSearchParams({ fecha, ...(depositoId && { deposito_id: depositoId }) });
    
    const res = await fetch(`http://localhost:3001/api/tesoreria/reporte-pdf?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}` // Requisito de la HU para validar permisos
      }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al generar el PDF');
    }

    // Convertir respuesta a Blob para forzar descarga sin abrir una pestaña muerta
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimiento-caja-${fecha}.pdf`; // Fallback, el backend manda su propio header
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

  return (
    <div className="resumen-diario-container">
      <div className="filter-bar">
        <div className="form-group">
          <label>Sucursal:</label>
          <select className="form-input" value={depositoId} onChange={(e) => setDepositoId(e.target.value)}>
            {depositos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Fecha:</label>
          <input className="form-input" type="date" value={fecha} max={fechaHoy} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <button type="button" onClick={consultarResumen} className="btn-consultar" disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
        <button 
            type="button" 
            onClick={exportarPDF} 
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444', // Rojo distintivo para PDFs
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FileText size={16} /> Exportar PDF
          </button>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>}

      {!loading && resumenes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
          No hay turnos registrados en esta fecha.
        </div>
      )}

      {!loading && resumenes.length > 0 && (
        <div className="table-container">
          <table className="tabla-resumen">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Caja / Cajero</th>
                <th>Horario</th>
                <th>Fondo Inic.</th>
                <th>Ventas (Efec)</th>
                <th>Ventas (Elec)</th>
                <th>Ingresos</th>
                <th>Egresos</th>
                <th>S. Teórico</th>
                <th>Físico Contado</th>
                <th>Diferencia</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {resumenes.map((res) => {
                const isAbierto = res.estado === 'En curso';
                const ventasElectronicas = Number(res.ventas_debito) + Number(res.ventas_credito) + Number(res.ventas_transferencia);
                
                return (
                  <tr key={res.sesion_id}>
                    <td>
                      <span className={`badge-estado ${isAbierto ? 'estado-abierto' : 'estado-cerrado'}`}>
                        {res.estado.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{res.caja_nombre}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{res.cajero_nombre}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {new Date(res.hora_apertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      <br/>
                      {isAbierto ? '---' : new Date(res.hora_cierre).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{formatMoney(res.fondo_inicial)}</td>
                    
                    {/* Aplicamos color azul a las ventas */}
                    <td className="monto-venta">{formatMoney(res.ventas_efectivo)}</td>
                    <td className="monto-venta" title="Débito, Crédito y Transferencia">{formatMoney(ventasElectronicas)}</td>
                    
                    {/* Aplicamos verde a ingresos y rojo a egresos con un símbolo */}
                    <td><span className="monto-ingreso">+ {formatMoney(res.ingresos)}</span></td>
                    <td><span className="monto-egreso">- {formatMoney(res.egresos)}</span></td>
                    
                    <td style={{ fontWeight: 600 }}>{formatMoney(res.saldo_teorico)}</td>
                    <td>{isAbierto ? '-' : formatMoney(res.efectivo_contado)}</td>
                    <td>{renderDiferencia(res.diferencia, res.estado)}</td>
                    <td>
                      {!isAbierto && (
                        <button className="btn-pdf" onClick={() => descargarPDF(res.sesion_id)}>
                          Ver / PDF
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ textAlign: 'right', paddingRight: '20px' }}>TOTALES DEL DÍA:</td>
                <td>{formatMoney(totales.fondo)}</td>
                <td className="monto-venta">{formatMoney(totales.vEfectivo)}</td>
                <td className="monto-venta">{formatMoney(totales.vDebito + totales.vCredito + totales.vTransf)}</td>
                
                {/* Colores también en los totales */}
                <td><span className="monto-ingreso">+ {formatMoney(totales.ingresos)}</span></td>
                <td><span className="monto-egreso">- {formatMoney(totales.egresos)}</span></td>
                
                <td>{formatMoney(totales.saldoTeorico)}</td>
                <td>{formatMoney(totales.contado)}</td>
                <td>{renderDiferencia(totales.diferencia, 'Cerrado')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <div style={{ padding: '12px 16px', fontSize: '12px', color: '#4b5563', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
            <strong>Conciliación:</strong> El total de ventas por medios de pago registrados asciende a <strong>{formatMoney(totalVentasPagos)}</strong>.
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumenDiario;