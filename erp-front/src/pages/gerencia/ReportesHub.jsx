import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Building2,
  FileDown,
  Calendar,
  Filter,
  AlertTriangle,
  Eye,
  X,
  RefreshCw,
  Scale,
  Truck,
  Store,
  Globe,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import './ReportesHub.css';

const API_BASE = 'http://localhost:3001/api';
const TZ_AR = 'America/Argentina/Buenos_Aires';
const CHART_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

const formatARS = (val) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(Number(val || 0));

const formatFechaCorta = (yyyyMmDd) => {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return '—';
  const parts = yyyyMmDd.split('-');
  if (parts.length !== 3) return yyyyMmDd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const obtenerHoyArgentina = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_AR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const calcularRangoPreset = (preset) => {
  const hoyStr = obtenerHoyArgentina();
  const [anio, mes, dia] = hoyStr.split('-').map(Number);

  if (preset === 'hoy') {
    return { desde: hoyStr, hasta: hoyStr };
  }

  if (preset === 'semana') {
    const ref = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
    const dayOfWeek = ref.getUTCDay() || 7; // Lunes = 1
    ref.setUTCDate(ref.getUTCDate() - dayOfWeek + 1);
    const lAnio = ref.getUTCFullYear();
    const lMes = String(ref.getUTCMonth() + 1).padStart(2, '0');
    const lDia = String(ref.getUTCDate()).padStart(2, '0');
    return { desde: `${lAnio}-${lMes}-${lDia}`, hasta: hoyStr };
  }

  // Por defecto: 'mes' (Este mes)
  const primerDiaMes = `${anio}-${String(mes).padStart(2, '0')}-01`;
  return { desde: primerDiaMes, hasta: hoyStr };
};

const ReportesHub = () => {
  const { user } = useAuth();
  const rolUsuario = String(user?.rol || '').trim();
  const esAdmin = rolUsuario.toLowerCase() === ROLES.ADMIN.toLowerCase();
  const esTesorero = rolUsuario.toLowerCase() === ROLES.TESORERO.toLowerCase();

  // Si es Tesorero, únicamente puede acceder a la pestaña de egresos
  const [activeTab, setActiveTab] = useState(() => (esTesorero && !esAdmin ? 'egresos' : 'ingresos'));

  useEffect(() => {
    if (esTesorero && !esAdmin && activeTab !== 'egresos') {
      setActiveTab('egresos');
    }
  }, [esTesorero, esAdmin, activeTab]);

  // Rango temporal compartido con presets ('hoy' | 'semana' | 'mes' | 'personalizado')
  const [presetFecha, setPresetFecha] = useState('mes');
  const [desde, setDesde] = useState(() => calcularRangoPreset('mes').desde);
  const [hasta, setHasta] = useState(() => calcularRangoPreset('mes').hasta);
  const [agrupacion, setAgrupacion] = useState('dia');

  // Filtros específicos de Ingresos (HU-50 / HU-51)
  const [canalVenta, setCanalVenta] = useState('Todos');
  const [depositoId, setDepositoId] = useState('');
  const [medioPago, setMedioPago] = useState('');

  // Filtros específicos de Egresos (HU-52)
  const [proveedorId, setProveedorId] = useState('');

  // Switch de comparativa en Balance (HU-53)
  const [compararPeriodoAnterior, setCompararPeriodoAnterior] = useState(true);

  // Catálogos maestros para selectores
  const [depositos, setDepositos] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  // Estados de datos y carga
  const [ingresosData, setIngresosData] = useState(null);
  const [egresosData, setEgresosData] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Modales de detalle (HU-51 Criterio 3 y HU-52 Criterio 3)
  const [ventaModal, setVentaModal] = useState(null);
  const [proveedorModal, setProveedorModal] = useState(null);

  // Cargar sucursales y proveedores para filtros
  useEffect(() => {
    axios
      .get(`${API_BASE}/depositos`, { withCredentials: true })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setDepositos(list);
      })
      .catch((err) => console.error('Error cargando sucursales:', err));

    axios
      .get(`${API_BASE}/suppliers`, { withCredentials: true })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setProveedores(list);
      })
      .catch((err) => console.error('Error cargando proveedores:', err));
  }, []);

  const handleSelectPreset = (nuevoPreset) => {
    setPresetFecha(nuevoPreset);
    if (nuevoPreset !== 'personalizado') {
      const rango = calcularRangoPreset(nuevoPreset);
      setDesde(rango.desde);
      setHasta(rango.hasta);
    }
  };

  const validarRangoCliente = useCallback(() => {
    if (!desde || !hasta) {
      return 'Debe seleccionar la fecha inicial y la fecha final.';
    }
    if (desde > hasta) {
      return 'La fecha final no puede ser anterior a la fecha inicial.';
    }
    const d1 = new Date(`${desde}T00:00:00-03:00`);
    const d2 = new Date(`${hasta}T23:59:59-03:00`);
    const diffDias = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias > 366) {
      return 'El rango de fechas no puede superar el máximo de 12 meses.';
    }
    return null;
  }, [desde, hasta]);

  const cargarReporteActivo = useCallback(async () => {
    const errorValidacion = validarRangoCliente();
    if (errorValidacion) {
      setErrorMsg(errorValidacion);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (activeTab === 'ingresos' && esAdmin) {
        const res = await axios.get(`${API_BASE}/reportes/ingresos`, {
          params: {
            desde,
            hasta,
            canal_venta: canalVenta,
            ...(depositoId && { deposito_id: depositoId }),
            ...(medioPago && { medio_pago: medioPago }),
            agrupacion,
          },
          withCredentials: true,
        });
        setIngresosData(res.data);
      } else if (activeTab === 'egresos') {
        const res = await axios.get(`${API_BASE}/reportes/egresos`, {
          params: {
            desde,
            hasta,
            ...(proveedorId && { proveedor_id: proveedorId }),
            agrupacion,
          },
          withCredentials: true,
        });
        setEgresosData(res.data);
      } else if (activeTab === 'balance' && esAdmin) {
        const res = await axios.get(`${API_BASE}/reportes/balance`, {
          params: {
            desde,
            hasta,
            ...(depositoId && { deposito_id: depositoId }),
            agrupacion,
          },
          withCredentials: true,
        });
        setBalanceData(res.data);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Error al obtener los datos del reporte gerencial.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    esAdmin,
    desde,
    hasta,
    canalVenta,
    depositoId,
    medioPago,
    proveedorId,
    agrupacion,
    validarRangoCliente,
  ]);

  useEffect(() => {
    cargarReporteActivo();
  }, [cargarReporteActivo]);

  // HU-54: Descarga de PDF vía Axios con responseType: 'blob'
  const handleExportarPdf = async () => {
    const errorValidacion = validarRangoCliente();
    if (errorValidacion) {
      setErrorMsg(errorValidacion);
      return;
    }

    setExportingPdf(true);
    setErrorMsg(null);

    try {
      const params = {
        tipo: activeTab,
        desde,
        hasta,
        agrupacion,
      };

      if (activeTab === 'ingresos') {
        params.canal_venta = canalVenta;
        if (depositoId) params.deposito_id = depositoId;
        if (medioPago) params.medio_pago = medioPago;
      } else if (activeTab === 'egresos') {
        if (proveedorId) params.proveedor_id = proveedorId;
      } else if (activeTab === 'balance') {
        if (depositoId) params.deposito_id = depositoId;
      }

      const response = await axios.get(`${API_BASE}/reportes/exportar-pdf`, {
        params,
        responseType: 'blob',
        withCredentials: true,
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte-${activeTab}-${desde}-a-${hasta}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let mensajeError = 'No se pudo exportar el documento PDF.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.error) mensajeError = parsed.error;
        } catch (_) {}
      } else if (err.response?.data?.error) {
        mensajeError = err.response.data.error;
      }
      setErrorMsg(mensajeError);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="reportes-hub max-w-7xl mx-auto">
      {/* ── NAVEGACIÓN DE PESTAÑAS (RBAC: Admin ve las 3, Tesorero solo Egresos) ── */}
      <div className="rh-tabs flex items-center justify-between border-b border-zinc-200 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {esAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('ingresos')}
              className={`rh-tab-btn ${activeTab === 'ingresos' ? 'active' : ''}`}
            >
              <TrendingUp size={17} />
              <span>Ingresos por Ventas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('egresos')}
            className={`rh-tab-btn ${activeTab === 'egresos' ? 'active' : ''}`}
          >
            <Truck size={17} />
            <span>Egresos a Proveedores</span>
          </button>

          {esAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('balance')}
              className={`rh-tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
            >
              <Scale size={17} />
              <span>Balance Financiero</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 py-2">
          <button
            type="button"
            onClick={cargarReporteActivo}
            disabled={loading}
            className="btn btn-outline btn-sm flex items-center gap-1.5"
            title="Recalcular reporte"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportarPdf}
            disabled={exportingPdf || loading}
            className="rh-btn-pdf"
          >
            <FileDown size={16} />
            <span>{exportingPdf ? 'Generando PDF...' : 'Exportar PDF'}</span>
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTROS TRANSVERSALES Y ESPECÍFICOS POR PESTAÑA ── */}
      <div className="rh-filter-card bg-white rounded-xl border border-zinc-200 p-4 mb-5 shadow-sm">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          {/* Selector de Presets Temporales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#71717a',
                letterSpacing: '0.4px',
              }}
            >
              Período Rápido (Zona Horaria AR)
            </label>
            <div className="rh-preset-group">
              {[
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: 'Esta semana' },
                { id: 'mes', label: 'Este mes' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`rh-preset-btn ${presetFecha === p.id ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas Desde / Hasta */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>Desde</label>
              <input
                type="date"
                value={desde}
                max={hasta || obtenerHoyArgentina()}
                onChange={(e) => {
                  setPresetFecha('personalizado');
                  setDesde(e.target.value);
                }}
                className="rh-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>Hasta</label>
              <input
                type="date"
                value={hasta}
                min={desde}
                max={obtenerHoyArgentina()}
                onChange={(e) => {
                  setPresetFecha('personalizado');
                  setHasta(e.target.value);
                }}
                className="rh-input"
              />
            </div>

            {/* Agrupación de Serie Temporal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>
                Agrupación
              </label>
              <select
                value={agrupacion}
                onChange={(e) => setAgrupacion(e.target.value)}
                className="rh-select"
              >
                <option value="dia">Por Día</option>
                <option value="semana">Por Semana</option>
                <option value="mes">Por Mes</option>
              </select>
            </div>

            {/* Filtros exclusivos de Ingresos */}
            {activeTab === 'ingresos' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>
                    Canal de Venta
                  </label>
                  <select
                    value={canalVenta}
                    onChange={(e) => setCanalVenta(e.target.value)}
                    className="rh-select"
                  >
                    <option value="Todos">Todos los canales</option>
                    <option value="Caja">Caja (Presencial)</option>
                    <option value="Ecommerce">Ecommerce (Tienda Web)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>
                    Sucursal
                  </label>
                  <select
                    value={depositoId}
                    onChange={(e) => setDepositoId(e.target.value)}
                    className="rh-select"
                  >
                    <option value="">Todas las sucursales</option>
                    {depositos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>
                    Medio de Pago
                  </label>
                  <select
                    value={medioPago}
                    onChange={(e) => setMedioPago(e.target.value)}
                    className="rh-select"
                  >
                    <option value="">Todos los medios</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta_debito">Tarjeta de Débito</option>
                    <option value="tarjeta_credito">Tarjeta de Crédito</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </>
            )}

            {/* Filtros exclusivos de Egresos */}
            {activeTab === 'egresos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>
                  Proveedor
                </label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="rh-select"
                >
                  <option value="">Todos los proveedores</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.razon_social}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtros y Switch exclusivos de Balance */}
            {activeTab === 'balance' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b' }}>
                    Sucursal (Ingresos)
                  </label>
                  <select
                    value={depositoId}
                    onChange={(e) => setDepositoId(e.target.value)}
                    className="rh-select"
                  >
                    <option value="">Consolidado (Todas)</option>
                    {depositos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    background: compararPeriodoAnterior ? '#fef2f2' : '#f4f4f5',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: compararPeriodoAnterior ? '#be123c' : '#52525b',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={compararPeriodoAnterior}
                    onChange={(e) => setCompararPeriodoAnterior(e.target.checked)}
                    style={{ accentColor: '#e11d48', width: '15px', height: '15px' }}
                  />
                  <span>Comparar con período anterior</span>
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── ALERTA DE ERROR DE VALIDACIÓN O RED ── */}
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '18px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 1: INGRESOS POR VENTAS (HU-50 & HU-51)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ingresos' && esAdmin && (
        <div>
          {/* Tarjetas de KPIs */}
          <div className="rh-kpi-grid">
            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}>
                  Total de Ingresos
                </span>
                <div className="stat-icon tint-green">
                  <DollarSign size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#047857',
                  marginTop: '10px',
                }}
              >
                {formatARS(ingresosData?.kpis?.totalIngresos)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                Ventas confirmadas ({formatFechaCorta(desde)} al {formatFechaCorta(hasta)})
              </span>
            </div>

            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}>
                  Cantidad de Ventas
                </span>
                <div className="stat-icon tint-black">
                  <ShoppingBag size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#18181b',
                  marginTop: '10px',
                }}
              >
                {ingresosData?.kpis?.cantidadTransacciones ?? 0}
              </div>
              <span style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                Transacciones facturadas y cobradas
              </span>
            </div>

            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}>
                  Ticket Promedio
                </span>
                <div className="stat-icon tint-amber">
                  <CreditCard size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#18181b',
                  marginTop: '10px',
                }}
              >
                {formatARS(ingresosData?.kpis?.ticketPromedio)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                Promedio por operación confirmada
              </span>
            </div>

            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}>
                  Desglose por Canal (HU-50)
                </span>
                <div className="stat-icon tint-red">
                  <Store size={18} />
                </div>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: '#52525b', fontWeight: 600 }}>
                    Caja ({ingresosData?.kpis?.porCanal?.Caja?.cantidad || 0}):
                  </span>
                  <strong style={{ color: '#18181b' }}>
                    {formatARS(ingresosData?.kpis?.porCanal?.Caja?.monto)} (
                    {ingresosData?.kpis?.porCanal?.Caja?.porcentaje || 0}%)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>
                    Ecommerce ({ingresosData?.kpis?.porCanal?.Ecommerce?.cantidad || 0}):
                  </span>
                  <strong style={{ color: '#2563eb' }}>
                    {formatARS(ingresosData?.kpis?.porCanal?.Ecommerce?.monto)} (
                    {ingresosData?.kpis?.porCanal?.Ecommerce?.porcentaje || 0}%)
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos de Evolución Temporal y Distribución */}
          <div className="rh-charts-grid">
            <div className="rh-panel" style={{ marginBottom: 0 }}>
              <div className="rh-panel-header">
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                    Evolución Temporal de Ingresos
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#71717a' }}>
                    Agrupado por {agrupacion === 'dia' ? 'día' : agrupacion === 'semana' ? 'semana' : 'mes'}
                  </span>
                </div>
              </div>
              <div className="rh-panel-body" style={{ height: '300px' }}>
                {(ingresosData?.serieTemporal || []).length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#71717a',
                      fontSize: '13px',
                    }}
                  >
                    Sin ingresos en el período para graficar.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ingresosData.serieTemporal}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(value) => formatARS(value)} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total Ingresos"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorIngresos)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rh-panel" style={{ marginBottom: 0 }}>
              <div className="rh-panel-header">
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                    Medios de Pago y Sucursales
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#71717a' }}>
                    Participación sobre el total cobrado
                  </span>
                </div>
              </div>
              <div className="rh-panel-body">
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#71717a',
                      marginBottom: '8px',
                    }}
                  >
                    Por Medio de Pago
                  </div>
                  {(ingresosData?.distribucionMedioPago || []).length === 0 ? (
                    <p style={{ fontSize: '12.5px', color: '#71717a' }}>Sin datos en el período.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ingresosData.distribucionMedioPago.map((m, idx) => (
                        <div key={m.metodo}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '12.5px',
                              marginBottom: '3px',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{m.etiqueta}</span>
                            <span>
                              <strong>{formatARS(m.monto)}</strong> ({m.porcentaje}%)
                            </span>
                          </div>
                          <div
                            style={{
                              height: '7px',
                              background: '#f4f4f5',
                              borderRadius: '99px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, m.porcentaje)}%`,
                                height: '100%',
                                background: CHART_COLORS[idx % CHART_COLORS.length],
                                borderRadius: '99px',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '14px' }}>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#71717a',
                      marginBottom: '8px',
                    }}
                  >
                    Ventas por Sucursal
                  </div>
                  {(ingresosData?.ventasPorSucursal || []).length === 0 ? (
                    <p style={{ fontSize: '12.5px', color: '#71717a' }}>Sin ventas registradas.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ingresosData.ventasPorSucursal.map((s) => (
                        <div
                          key={s.deposito_id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#18181b' }}>{s.sucursal}</strong>
                            <span style={{ color: '#71717a', marginLeft: '6px' }}>
                              ({s.cantidad} ventas)
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, color: '#047857' }}>
                            {formatARS(s.monto)} ({s.porcentaje}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Detalle de Ventas con Modal al hacer clic */}
          <div className="rh-panel">
            <div className="rh-panel-header">
              <div>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700 }}>
                  Listado de Ventas Confirmadas
                </h3>
                <span style={{ fontSize: '12px', color: '#71717a' }}>
                  Haga clic en cualquier fila para inspeccionar los artículos, lista de precios y medios de pago
                </span>
              </div>
              <span className="badge badge-gray">
                {(ingresosData?.ventas || []).length} registros
              </span>
            </div>

            <div className="table-scroll">
              {(ingresosData?.ventas || []).length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#71717a', fontSize: '13.5px' }}>
                  Sin ingresos en el período para los filtros seleccionados.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Comprobante</th>
                      <th>Canal</th>
                      <th>Sucursal</th>
                      <th>Cliente</th>
                      <th>Medio de Pago</th>
                      <th style={{ textAlign: 'right' }}>Monto Computado</th>
                      <th style={{ textAlign: 'center' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingresosData.ventas.map((v) => (
                      <tr
                        key={v.id}
                        className="rh-clickable-row"
                        onClick={() => setVentaModal(v)}
                      >
                        <td className="cell-mono">
                          {formatFechaCorta(v.fecha)} · {v.hora}
                        </td>
                        <td className="cell-strong">{v.numero_comprobante}</td>
                        <td>
                          <span
                            className={`badge ${
                              v.canal_venta === 'Ecommerce' ? 'badge-blue' : 'badge-green'
                            }`}
                          >
                            {v.canal_venta === 'Ecommerce' ? (
                              <>
                                <Globe size={11} /> Ecommerce
                              </>
                            ) : (
                              <>
                                <Store size={11} /> Caja
                              </>
                            )}
                          </span>
                        </td>
                        <td>{v.sucursal}</td>
                        <td>
                          <div className="cell-strong">{v.cliente}</div>
                          {v.cliente_documento && v.cliente_documento !== '—' && (
                            <div className="cell-sub">Doc: {v.cliente_documento}</div>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: '#52525b' }}>
                          {v.medio_pago_resumen}
                        </td>
                        <td
                          className="cell-mono"
                          style={{ textAlign: 'right', fontWeight: 700, color: '#047857' }}
                        >
                          {formatARS(v.monto)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ margin: '0 auto', width: '30px', height: '30px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setVentaModal(v);
                            }}
                            title="Ver detalle de venta"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 2: EGRESOS A PROVEEDORES (HU-52)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'egresos' && (
        <div>
          {/* KPIs de Egresos */}
          <div className="rh-kpi-grid">
            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}>
                  Total Pagado a Proveedores
                </span>
                <div className="stat-icon tint-red">
                  <DollarSign size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#dc2626',
                  marginTop: '10px',
                }}
              >
                {formatARS(egresosData?.kpis?.totalPagado)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                Criterio de caja (pagos efectivos en Cuentas por Pagar)
              </span>
            </div>

            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}>
                  Cantidad de Pagos
                </span>
                <div className="stat-icon tint-black">
                  <CreditCard size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#18181b',
                  marginTop: '10px',
                }}
              >
                {egresosData?.kpis?.cantidadPagos ?? 0}
              </div>
              <span style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                Desembolsos registrados en el período
              </span>
            </div>

            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}>
                  Pago Promedio
                </span>
                <div className="stat-icon tint-amber">
                  <TrendingDown size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#18181b',
                  marginTop: '10px',
                }}
              >
                {formatARS(egresosData?.kpis?.pagoPromedio)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                Importe medio por orden de pago
              </span>
            </div>

            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}>
                  Mayor Proveedor del Período
                </span>
                <div className="stat-icon tint-green">
                  <Building2 size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '15.5px',
                  fontWeight: 800,
                  color: '#18181b',
                  marginTop: '10px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={egresosData?.kpis?.proveedorPrincipal?.razon_social || 'Sin registros'}
              >
                {egresosData?.kpis?.proveedorPrincipal?.razon_social || 'Sin pagos en el período'}
              </div>
              <span style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                {egresosData?.kpis?.proveedorPrincipal
                  ? `${formatARS(egresosData.kpis.proveedorPrincipal.monto)} (${egresosData.kpis.proveedorPrincipal.porcentaje}%)`
                  : `${egresosData?.kpis?.cantidadProveedores || 0} proveedores activos`}
              </span>
            </div>
          </div>

          {/* Gráfico Temporal y Ranking de Proveedores */}
          <div className="rh-charts-grid">
            <div className="rh-panel" style={{ marginBottom: 0 }}>
              <div className="rh-panel-header">
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                    Evolución Temporal de Egresos a Proveedores
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#71717a' }}>
                    Desembolsos por fecha de pago ({agrupacion})
                  </span>
                </div>
              </div>
              <div className="rh-panel-body" style={{ height: '300px' }}>
                {(egresosData?.serieTemporal || []).length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#71717a',
                      fontSize: '13px',
                    }}
                  >
                    Sin pagos a proveedores en el período seleccionado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={egresosData.serieTemporal}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(value) => formatARS(value)} />
                      <Legend />
                      <Bar
                        dataKey="total"
                        name="Pagos a Proveedores"
                        fill="#dc2626"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Ranking de Proveedores de Mayor a Menor */}
            <div className="rh-panel" style={{ marginBottom: 0 }}>
              <div className="rh-panel-header">
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                    Ranking por Proveedor (Mayor a Menor)
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#71717a' }}>
                    Haga clic en un proveedor para ver sus pagos imputados
                  </span>
                </div>
              </div>
              <div className="rh-panel-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {(egresosData?.rankingProveedores || []).length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#71717a', padding: '32px 0', fontSize: '13px' }}>
                    Sin pagos registrados en el período.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {egresosData.rankingProveedores.map((prov, index) => (
                      <div
                        key={prov.proveedor_id + index}
                        onClick={() => setProveedorModal(prov)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid #e4e4e7',
                          cursor: 'pointer',
                          background: '#fafafa',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                background: index === 0 ? '#e11d48' : '#18181b',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#18181b' }}>
                                {prov.razon_social}
                              </div>
                              <div style={{ fontSize: '11px', color: '#71717a' }}>
                                CUIT: {prov.cuit} · {prov.cantidad_pagos} pago(s)
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#dc2626' }}>
                              {formatARS(prov.monto)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#71717a' }}>
                              {prov.porcentaje}% del total
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            height: '6px',
                            background: '#e4e4e7',
                            borderRadius: '99px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, prov.porcentaje)}%`,
                              height: '100%',
                              background: '#e11d48',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabla Cronológica de Pagos a Proveedores */}
          <div className="rh-panel">
            <div className="rh-panel-header">
              <div>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700 }}>
                  Detalle de Pagos Registrados (Cuentas por Pagar)
                </h3>
                <span style={{ fontSize: '12px', color: '#71717a' }}>
                  Excluye egresos manuales de caja y órdenes/facturas aún no pagadas
                </span>
              </div>
              <span className="badge badge-gray">
                {(egresosData?.pagos || []).length} pagos
              </span>
            </div>

            <div className="table-scroll">
              {(egresosData?.pagos || []).length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#71717a', fontSize: '13.5px' }}>
                  Sin pagos a proveedores en el período seleccionado.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Fecha de Pago</th>
                      <th>Proveedor (Razón Social)</th>
                      <th>CUIT</th>
                      <th>Comprobante / Cuenta Imputada</th>
                      <th>Orden de Compra</th>
                      <th>Registrado Por</th>
                      <th style={{ textAlign: 'right' }}>Monto Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {egresosData.pagos.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-mono">
                          {formatFechaCorta(p.fecha)} · {p.hora}
                        </td>
                        <td className="cell-strong">{p.razon_social}</td>
                        <td className="cell-mono">{p.cuit}</td>
                        <td>
                          <span className="badge badge-gray">{p.comprobante}</span>
                        </td>
                        <td className="cell-mono">{p.orden_compra}</td>
                        <td>{p.usuario_nombre}</td>
                        <td
                          className="cell-mono"
                          style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}
                        >
                          {formatARS(p.monto_pagado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PESTAÑA 3: BALANCE FINANCIERO (HU-53)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'balance' && esAdmin && (
        <div>
          {/* Alerta visual destacada si el Resultado Neto es negativo (HU-53) */}
          {balanceData?.kpis?.esNegativo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #ef4444',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '18px',
                color: '#991b1b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={22} color="#dc2626" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#b91c1c' }}>
                    Atención: Saldo Neto Negativo en el Período Seleccionado
                  </div>
                  <div style={{ fontSize: '12.5px' }}>
                    Los desembolsos por pagos a proveedores superaron a los ingresos por ventas en{' '}
                    <strong>{formatARS(Math.abs(balanceData.kpis.resultadoNeto))}</strong>.
                  </div>
                </div>
              </div>
              <span className="badge badge-red">Déficit de Caja</span>
            </div>
          )}

          {/* Tarjetas de Indicadores Netos y Comparativa vs Período Anterior */}
          <div className="rh-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {/* Ingresos Consolidados */}
            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#71717a' }}>
                  Total de Ingresos (Ventas)
                </span>
                <div className="stat-icon tint-green">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div style={{ fontSize: '25px', fontWeight: 800, color: '#047857', marginTop: '10px' }}>
                {formatARS(balanceData?.kpis?.totalIngresos)}
              </div>
              <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                {balanceData?.kpis?.cantidadVentas || 0} ventas confirmadas (Caja + Ecommerce)
              </div>

              {compararPeriodoAnterior && balanceData?.comparativa?.ingresos && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px dashed #e4e4e7',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#71717a' }}>
                    Previo: {formatARS(balanceData.comparativa.ingresos.anterior)}
                  </span>
                  <span
                    className={`badge ${
                      balanceData.comparativa.ingresos.variacionAbsoluta >= 0
                        ? 'badge-green'
                        : 'badge-red'
                    }`}
                  >
                    {balanceData.comparativa.ingresos.variacionAbsoluta >= 0 ? '+' : ''}
                    {formatARS(balanceData.comparativa.ingresos.variacionAbsoluta)} (
                    {balanceData.comparativa.ingresos.variacionPorcentual >= 0 ? '+' : ''}
                    {balanceData.comparativa.ingresos.variacionPorcentual}%)
                  </span>
                </div>
              )}
            </div>

            {/* Egresos Consolidados */}
            <div className="rh-kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#71717a' }}>
                  Total de Egresos (Proveedores)
                </span>
                <div className="stat-icon tint-red">
                  <TrendingDown size={18} />
                </div>
              </div>
              <div style={{ fontSize: '25px', fontWeight: 800, color: '#dc2626', marginTop: '10px' }}>
                {formatARS(balanceData?.kpis?.totalEgresos)}
              </div>
              <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                {balanceData?.kpis?.cantidadPagos || 0} pagos registrados en CxP
              </div>

              {compararPeriodoAnterior && balanceData?.comparativa?.egresos && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px dashed #e4e4e7',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#71717a' }}>
                    Previo: {formatARS(balanceData.comparativa.egresos.anterior)}
                  </span>
                  <span
                    className={`badge ${
                      balanceData.comparativa.egresos.variacionAbsoluta <= 0
                        ? 'badge-green'
                        : 'badge-amber'
                    }`}
                  >
                    {balanceData.comparativa.egresos.variacionAbsoluta >= 0 ? '+' : ''}
                    {formatARS(balanceData.comparativa.egresos.variacionAbsoluta)} (
                    {balanceData.comparativa.egresos.variacionPorcentual >= 0 ? '+' : ''}
                    {balanceData.comparativa.egresos.variacionPorcentual}%)
                  </span>
                </div>
              )}
            </div>

            {/* Resultado Neto = Ingresos - Egresos */}
            <div className={`rh-kpi-card ${balanceData?.kpis?.esNegativo ? 'negativo' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: balanceData?.kpis?.esNegativo ? '#b91c1c' : '#18181b',
                  }}
                >
                  Resultado Neto (Ingresos − Egresos)
                </span>
                <div className={`stat-icon ${balanceData?.kpis?.esNegativo ? 'tint-red' : 'tint-green'}`}>
                  <Scale size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 900,
                  color: balanceData?.kpis?.esNegativo ? '#dc2626' : '#047857',
                  marginTop: '10px',
                }}
              >
                {formatARS(balanceData?.kpis?.resultadoNeto)}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: balanceData?.kpis?.esNegativo ? '#991b1b' : '#71717a',
                  marginTop: '4px',
                  fontWeight: balanceData?.kpis?.esNegativo ? 600 : 400,
                }}
              >
                {balanceData?.kpis?.esNegativo
                  ? 'Saldo neto negativo — Egresos superan ingresos'
                  : 'Saldo neto positivo de flujo de caja'}
              </div>

              {compararPeriodoAnterior && balanceData?.comparativa?.neto && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px dashed #cbd5e1',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#52525b' }}>
                    Previo: {formatARS(balanceData.comparativa.neto.anterior)}
                  </span>
                  <span
                    className={`badge ${
                      balanceData.comparativa.neto.variacionAbsoluta >= 0
                        ? 'badge-green'
                        : 'badge-red'
                    }`}
                  >
                    {balanceData.comparativa.neto.variacionAbsoluta >= 0 ? '+' : ''}
                    {formatARS(balanceData.comparativa.neto.variacionAbsoluta)} (
                    {balanceData.comparativa.neto.variacionPorcentual >= 0 ? '+' : ''}
                    {balanceData.comparativa.neto.variacionPorcentual}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Barras Comparativo y Desglose por Canal / Top 10 Proveedores */}
          <div className="rh-charts-grid">
            <div className="rh-panel" style={{ marginBottom: 0 }}>
              <div className="rh-panel-header">
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                    Gráfico Comparativo: Ingresos vs. Egresos
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#71717a' }}>
                    Comparación por intervalo ({agrupacion})
                  </span>
                </div>
              </div>
              <div className="rh-panel-body" style={{ height: '320px' }}>
                {(balanceData?.serieComparativa || []).length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#71717a',
                      fontSize: '13px',
                    }}
                  >
                    Sin movimientos de ingresos ni egresos en el período.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={balanceData.serieComparativa}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(value) => formatARS(value)} />
                      <Legend />
                      <Bar
                        dataKey="ingresos"
                        name="Ingresos (Ventas)"
                        fill="#16a34a"
                        radius={[5, 5, 0, 0]}
                      />
                      <Bar
                        dataKey="egresos"
                        name="Egresos (Proveedores)"
                        fill="#dc2626"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rh-panel" style={{ marginBottom: 0 }}>
              <div className="rh-panel-header">
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                    Desglose de Orígenes y Destinos (HU-53)
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#71717a' }}>
                    Ingresos por canal y Top 10 proveedores
                  </span>
                </div>
              </div>
              <div className="rh-panel-body" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '14px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#71717a',
                      marginBottom: '6px',
                    }}
                  >
                    Ingresos por Canal
                  </div>
                  {(balanceData?.desglose?.ingresosPorCanal || []).map((c) => (
                    <div
                      key={c.canal}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        borderBottom: '1px solid #f4f4f5',
                        fontSize: '12.5px',
                      }}
                    >
                      <span>
                        <strong>{c.etiqueta}</strong> ({c.cantidad} op.)
                      </span>
                      <span style={{ fontWeight: 700, color: '#047857' }}>
                        {formatARS(c.monto)} ({c.porcentaje}%)
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#71717a',
                      marginBottom: '6px',
                    }}
                  >
                    Egresos por Proveedor (Top 10 + Resto)
                  </div>
                  {(balanceData?.desglose?.egresosPorProveedor || []).length === 0 ? (
                    <p style={{ fontSize: '12.5px', color: '#71717a' }}>
                      Sin pagos a proveedores en el período.
                    </p>
                  ) : (
                    balanceData.desglose.egresosPorProveedor.map((p, idx) => (
                      <div
                        key={p.proveedor_id + idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 0',
                          borderBottom: '1px solid #f4f4f5',
                          fontSize: '12.5px',
                        }}
                      >
                        <span>
                          <strong>{p.razon_social}</strong> ({p.cantidad_pagos} pagos)
                        </span>
                        <span style={{ fontWeight: 700, color: '#dc2626' }}>
                          {formatARS(p.monto)} ({p.porcentaje}%)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla Acumulada de Balance Financiero */}
          <div className="rh-panel">
            <div className="rh-panel-header">
              <div>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700 }}>
                  Tabla de Evolución y Saldo Neto Acumulado
                </h3>
                <span style={{ fontSize: '12px', color: '#71717a' }}>
                  Los saldos netos negativos se destacan en rojo
                </span>
              </div>
            </div>

            <div className="table-scroll">
              {(balanceData?.serieComparativa || []).length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#71717a', fontSize: '13.5px' }}>
                  Sin actividad registrada en el rango seleccionado.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Período / Intervalo</th>
                      <th style={{ textAlign: 'right' }}>Ingresos por Ventas</th>
                      <th style={{ textAlign: 'right' }}>Egresos a Proveedores</th>
                      <th style={{ textAlign: 'right' }}>Resultado Neto del Período</th>
                      <th style={{ textAlign: 'right' }}>Saldo Neto Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceData.serieComparativa.map((row) => (
                      <tr key={row.periodo}>
                        <td className="cell-strong">{row.etiqueta}</td>
                        <td
                          className="cell-mono"
                          style={{ textAlign: 'right', color: '#047857', fontWeight: 600 }}
                        >
                          {formatARS(row.ingresos)}
                        </td>
                        <td
                          className="cell-mono"
                          style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}
                        >
                          {formatARS(row.egresos)}
                        </td>
                        <td
                          className="cell-mono"
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: row.neto < 0 ? '#dc2626' : '#047857',
                          }}
                        >
                          {formatARS(row.neto)}
                        </td>
                        <td
                          className="cell-mono"
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: row.netoAcumulado < 0 ? '#dc2626' : '#18181b',
                            background: row.netoAcumulado < 0 ? '#fef2f2' : '#f8fafc',
                          }}
                        >
                          {formatARS(row.netoAcumulado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Leyenda obligatoria HU-53 */}
            <div
              style={{
                padding: '12px 20px',
                background: '#f8fafc',
                borderTop: '1px solid #e4e4e7',
                fontSize: '12px',
                color: '#52525b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <span>
                {balanceData?.leyenda ||
                  'Flujo de caja simplificado: incluye únicamente ingresos por ventas confirmadas (Presencial y E-commerce) menos pagos efectivos a proveedores (Cuentas por Pagar). No incluye otros gastos operativos ni costo de mercadería.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL DE DETALLE DE VENTA (HU-51 Criterio 3)
         ═══════════════════════════════════════════════════════════════════════ */}
      {ventaModal && (
        <div className="modal-overlay" onClick={() => setVentaModal(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '680px', padding: '0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 22px',
                borderBottom: '1px solid #e4e4e7',
                background: '#18181b',
                color: '#ffffff',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Detalle de Venta — {ventaModal.numero_comprobante}
                </h3>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  {formatFechaCorta(ventaModal.fecha)} a las {ventaModal.hora} hs (AR) · Canal:{' '}
                  {ventaModal.canal_venta}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVentaModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', overflowY: 'auto', maxHeight: '75vh' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  background: '#f8fafc',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  marginBottom: '18px',
                  fontSize: '12.5px',
                }}
              >
                <div>
                  <span style={{ color: '#71717a', display: 'block' }}>Cliente</span>
                  <strong style={{ color: '#18181b' }}>{ventaModal.cliente}</strong>
                  {ventaModal.cliente_documento && ventaModal.cliente_documento !== '—' && (
                    <span style={{ color: '#71717a', marginLeft: '6px' }}>
                      ({ventaModal.cliente_documento})
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ color: '#71717a', display: 'block' }}>Sucursal / Depósito</span>
                  <strong style={{ color: '#18181b' }}>{ventaModal.sucursal}</strong>
                </div>
                <div>
                  <span style={{ color: '#71717a', display: 'block' }}>Lista de Precios Aplicada</span>
                  <strong style={{ color: '#18181b' }}>{ventaModal.lista_precio}</strong>
                </div>
                <div>
                  <span style={{ color: '#71717a', display: 'block' }}>Registrado por</span>
                  <strong style={{ color: '#18181b' }}>{ventaModal.vendedor}</strong>
                </div>
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                Artículos de la Operación
              </h4>
              <div
                style={{
                  border: '1px solid #e4e4e7',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '18px',
                }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th style={{ textAlign: 'right' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>P. Unitario</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ventaModal.items || []).map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="cell-mono">{it.codigo_interno}</td>
                        <td className="cell-strong">{it.descripcion}</td>
                        <td className="cell-mono" style={{ textAlign: 'right' }}>
                          {it.cantidad}
                        </td>
                        <td className="cell-mono" style={{ textAlign: 'right' }}>
                          {formatARS(it.precio_unitario)}
                        </td>
                        <td
                          className="cell-mono"
                          style={{ textAlign: 'right', fontWeight: 700 }}
                        >
                          {formatARS(it.importe_linea)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                Desglose de Cobros por Medio de Pago
              </h4>
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e4e4e7',
                  padding: '12px 14px',
                }}
              >
                {(ventaModal.medios_pago || []).length === 0 ? (
                  <div style={{ fontSize: '12.5px', color: '#52525b' }}>
                    Pago confirmado vía {ventaModal.canal_venta} ({formatARS(ventaModal.total_venta)})
                  </div>
                ) : (
                  ventaModal.medios_pago.map((pm, idx) => (
                    <div
                      key={pm.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '5px 0',
                        fontSize: '13px',
                        borderBottom:
                          idx < ventaModal.medios_pago.length - 1 ? '1px solid #e4e4e7' : 'none',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{pm.etiqueta}</span>
                      <strong style={{ color: '#047857' }}>{formatARS(pm.monto)}</strong>
                    </div>
                  ))
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '2px solid #d4d4d8',
                    fontSize: '14.5px',
                    fontWeight: 800,
                  }}
                >
                  <span>Total de la Venta</span>
                  <span style={{ color: '#047857' }}>{formatARS(ventaModal.total_venta)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL DE DETALLE DE PAGOS POR PROVEEDOR (HU-52 Criterio 3)
         ═══════════════════════════════════════════════════════════════════════ */}
      {proveedorModal && (
        <div className="modal-overlay" onClick={() => setProveedorModal(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '680px', padding: '0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 22px',
                borderBottom: '1px solid #e4e4e7',
                background: '#18181b',
                color: '#ffffff',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Pagos Imputados — {proveedorModal.razon_social}
                </h3>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  CUIT: {proveedorModal.cuit} · {proveedorModal.cantidad_pagos} pago(s) en el período
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProveedorModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', overflowY: 'auto', maxHeight: '75vh' }}>
              <div
                style={{
                  border: '1px solid #e4e4e7',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Comprobante / Cuenta</th>
                      <th>Usuario</th>
                      <th style={{ textAlign: 'right' }}>Monto Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(proveedorModal.pagos || []).map((p) => (
                      <tr key={p.id}>
                        <td className="cell-mono">
                          {formatFechaCorta(p.fecha)} · {p.hora}
                        </td>
                        <td className="cell-strong">{p.comprobante}</td>
                        <td>{p.usuario_nombre}</td>
                        <td
                          className="cell-mono"
                          style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}
                        >
                          {formatARS(p.monto_pagado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '14px',
                  padding: '12px 16px',
                  background: '#fef2f2',
                  borderRadius: '10px',
                  border: '1px solid #fecaca',
                  fontSize: '14px',
                  fontWeight: 800,
                }}
              >
                <span>Total Pagado al Proveedor</span>
                <span style={{ color: '#dc2626' }}>{formatARS(proveedorModal.monto)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesHub;
