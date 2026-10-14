import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Wallet, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#8b5cf6'];

const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(val || 0));
const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—';

const DashboardGerencial = () => {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [depositoId, setDepositoId] = useState('');
  const [depositos, setDepositos] = useState([]);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/depositos')
      .then(res => res.json())
      .then(d => setDepositos(d));
  }, []);

  const loadDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const query = new URLSearchParams({ fecha, ...(depositoId && { deposito_id: depositoId }) });
      const res = await fetch(`http://localhost:3001/api/tesoreria/dashboard?${query.toString()}`);
      const result = await res.json();
      setData(result);
      setLastUpdate(new Date().toLocaleTimeString('es-AR'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fecha, depositoId]);

  // Carga inicial y Refresco cada 60s
  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(true), 60000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  if (loading && !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#64748b' }}>
      <RefreshCw size={20} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} /> Cargando Dashboard...
    </div>
  );

  const kpis = data?.kpis || {};
  const ticketPromedio = kpis.cantidad_ventas > 0 ? kpis.total_vendido / kpis.cantidad_ventas : 0;
  const variacion = kpis.total_semana_anterior > 0 ? ((kpis.total_vendido - kpis.total_semana_anterior) / kpis.total_semana_anterior) * 100 : 0;
  const efectivoTotal = data?.cajas?.filter(c => c.estado === 'Abierta').reduce((acc, c) => acc + c.saldo_teorico, 0) || 0;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      
      {/* Header y Filtros */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Dashboard Gerencial</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Última actualización: {lastUpdate} {refreshing && <span style={{ color: '#2563eb' }}>(Refrescando...)</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select value={depositoId} onChange={(e) => setDepositoId(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <option value="">Todas las sucursales</option>
            {depositos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        </div>
      </header>

      {/* Alertas Críticas */}
      {data?.alertas?.length > 0 && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} /> Alertas de Seguridad y Arqueo
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#991b1b', fontSize: '14px' }}>
            {data.alertas.map((a, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                <strong>{a.caja_nombre} ({a.deposito_nombre}):</strong> 
                {a.alerta_limite && ` Supera límite de efectivo (${formatMoney(a.saldo_teorico)}).`}
                {a.alerta_diferencia && ` Diferencia de arqueo anormal (${formatMoney(a.diferencia_arqueo)}).`}
                {a.alerta_turno_viejo && ` Turno abierto de días anteriores.`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPIs Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Vendido', value: formatMoney(kpis.total_vendido), color: '#2563eb' },
          { label: 'Efectivo en Cajas (Abiertas)', value: formatMoney(efectivoTotal), color: '#16a34a' },
          { label: 'Cantidad Ventas', value: kpis.cantidad_ventas, color: '#475569' },
          { label: 'Ticket Promedio', value: formatMoney(ticketPromedio), color: '#475569' },
          { label: 'Vs Semana Anterior', value: `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}%`, color: variacion >= 0 ? '#16a34a' : '#dc2626' }
        ].map((kpi, i) => (
          <div key={i} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{kpi.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Gráficos con Recharts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '300px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Ventas por Hora</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.ventasHora}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hora" tickFormatter={(v) => `${v}hs`} />
              <YAxis tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '300px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Medios de Pago</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data?.mediosPago} dataKey="total" nameKey="metodo" cx="50%" cy="50%" innerRadius={60} outerRadius={80} label>
                {data?.mediosPago?.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tarjetas de Cajas - Reutilizando estilos de Gestion_Cajas.jsx */}
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Monitoreo de Cajas</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {data?.cajas?.map((caja) => {
          const alertaVisual = caja.alerta_limite || caja.alerta_diferencia || caja.alerta_turno_viejo;
          return (
            <article key={caja.sesion_id || caja.caja_id} style={{
              backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', position: 'relative',
              border: alertaVisual ? '2px solid #ef4444' : '1px solid #e2e8f0',
              boxShadow: alertaVisual ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <Wallet size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{caja.caja_nombre}</h3>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{caja.deposito_nombre}</span>
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                  backgroundColor: caja.estado === 'Abierta' ? '#ecfdf5' : '#f1f5f9',
                  color: caja.estado === 'Abierta' ? '#059669' : '#64748b',
                  border: caja.estado === 'Abierta' ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                }}>
                  {caja.estado}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Cajero</span>
                  <strong style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>{caja.cajero_nombre || 'Sin turno'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Apertura</span>
                  <span style={{ fontSize: '12px', color: '#475569' }}>{formatTime(caja.fecha_hora_apertura)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Saldo Efectivo</span>
                <span style={{ fontSize: '24px', fontWeight: '800', color: alertaVisual ? '#dc2626' : '#0f172a' }}>
                  {formatMoney(caja.saldo_teorico)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardGerencial;