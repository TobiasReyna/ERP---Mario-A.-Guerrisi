// =============================================================================
// RegistroComprobanteProveedor.jsx — HU-23
// Módulo: Compras / Tesorería
// Ruta: /registro-comprobantes
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import { formatearMonto, formatearFecha, formatearFechaHora, hoyISO } from '../utils/format';
import { listarComprobantes, listarCxpPendientes, registrarComprobante } from '../services/comprobantesService';
import { listarProveedoresReferencia } from '../services/purchasingService';
import { listarVentasConfirmadas } from '../services/ventaService';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const TIPOS = [
    'Factura A', 
    'Factura B', 
    'Factura C', 
    'Nota de Crédito', 
    'Nota de Débito',
    'Remito'
];

const BADGE_MAP = {
    'Factura A': { label: 'FAC A', cls: 'badge-blue' },
    'Factura B': { label: 'FAC B', cls: 'badge-blue' },
    'Factura C': { label: 'FAC C', cls: 'badge-blue' },
    'Factura':   { label: 'FAC', cls: 'badge-blue' },
    'Nota de Crédito': { label: 'NC', cls: 'badge-red' },
    'Nota de Débito':  { label: 'ND', cls: 'badge-green' },
    'Remito':          { label: 'REM', cls: 'badge-gray' }
};

const BADGE_VENTAS = {
    'Confirmada': { label: 'VTA', cls: 'badge-green' },
    'Pendiente':  { label: 'PEND', cls: 'badge-amber' },
    'Cancelada':  { label: 'CANC', cls: 'badge-red' }
};

const FORM_INICIAL = {
    proveedor_id: '',
    tipo_comprobante: 'Factura A',
    numero_comprobante: '',
    monto_total: '',
    fecha_emision: hoyISO(),
    fecha_vencimiento: '',
    id_cuenta_por_pagar: '',
    orden_compra_id: '',
};

function isValidNumeroComprobante(val) {
    return val.trim().length >= 4;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
function RegistroComprobanteProveedor() {
    // ── Estados principales ──────────────────────────────────────────────────
    const [vista, setVista] = useState('compras'); // 'compras' | 'ventas'
    const [comprobantes, setComprobantes] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [loadingVentas, setLoadingVentas] = useState(true);
    const [proveedores, setProveedores] = useState([]);
    const [ordenesCompra, setOrdenesCompra] = useState([]);
    const [loading, setLoading] = useState(true);
    const [articulos, setArticulos] = useState([]);
    const [detalles, setDetalles] = useState([]);
    const [detalleActual, setDetalleActual] = useState({
        articulo_id: '',
        cantidad: '',
        precio_unitario: ''
    });

    // ── Filtros de búsqueda ──────────────────────────────────────────────────
    const [busquedaCompras, setBusquedaCompras] = useState('');
    const [filtroTipoCompras, setFiltroTipoCompras] = useState('todos');

    const [busquedaVentas, setBusquedaVentas] = useState('');
    const [filtroEstadoVentas, setFiltroEstadoVentas] = useState('todos');

    // ── Estados del modal / formulario ───────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(FORM_INICIAL);
    const [cxpPendientes, setCxpPendientes] = useState([]);
    const [loadingCxp, setLoadingCxp] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ── Toast ───────────────────────────────────────────────────────────────
    const [toast, setToast] = useState(null);

    const showToast = useCallback((msg, type = 'ok') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    }, []);

    // ── Carga inicial ───────────────────────────────────────────────────────
    const cargarDatos = useCallback(() => {
        setLoading(true);
        Promise.all([listarComprobantes(), listarProveedoresReferencia()])
            .then(([comps, provs]) => {
                setComprobantes(comps);
                setProveedores(provs);
            })
            .catch((err) => console.error('[HU-23] Error al cargar datos:', err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    // ── Carga de ventas ─────────────────────────────────────────────────────
    useEffect(() => {
        setLoadingVentas(true);
        listarVentasConfirmadas()
            .then(setVentas)
            .catch((err) => console.error('[POS] Error al cargar comprobantes de venta:', err))
            .finally(() => setLoadingVentas(false));
    }, []);

    // ── CxP pendientes para NC ──────────────────────────────────────────────
    useEffect(() => {
        if (form.tipo_comprobante !== 'Nota de Crédito' || !form.proveedor_id) {
            setCxpPendientes([]);
            return;
        }
        setLoadingCxp(true);
        listarCxpPendientes(form.proveedor_id)
            .then(setCxpPendientes)
            .catch((err) => console.error('[HU-23] Error al cargar CxP pendientes:', err))
            .finally(() => setLoadingCxp(false));
    }, [form.proveedor_id, form.tipo_comprobante]);

    // ── Carga de artículos ──────────────────────────────────────────────────
    useEffect(() => {
        fetch('http://localhost:3001/api/articles') 
            .then(res => res.json())
            .then(respuesta => setArticulos(respuesta.data || []))
            .catch(err => console.error("Error al cargar artículos:", err));
    }, []);

    // ── Filtrado de órdenes de compra según proveedor ───────────────────────
    useEffect(() => {
        if (form.proveedor_id) {
            fetch('http://localhost:3001/api/purchase-orders')
                .then(res => res.json())
                .then(respuesta => {
                    const todas = respuesta.data || [];
                    const filtradas = todas.filter(
                        (oc) => oc.proveedor_id === form.proveedor_id && oc.estado !== 'Cancelada'
                    );
                    setOrdenesCompra(filtradas);
                })
                .catch(error => {
                    console.error("Error al obtener órdenes de compra:", error);
                    setOrdenesCompra([]);
                });
        } else {
            setOrdenesCompra([]);
            setForm(prev => ({ ...prev, orden_compra_id: '' }));
        }
    }, [form.proveedor_id]);

    // ── Autocarga de detalles desde Orden de Compra ─────────────────────────
    useEffect(() => {
        if (!form.orden_compra_id) return; 

        fetch(`http://localhost:3001/api/purchase-orders/${form.orden_compra_id}/details`)
            .then(res => res.json())
            .then(respuesta => {
                const itemsOrden = respuesta.data || respuesta;
                const detallesAutocargados = itemsOrden.map(item => {
                    const cant = Number(item.cantidad_solicitada) || 0; 
                    const precio = Number(item.precio_unitario) || 0;
                    return {
                        articulo_id: item.articulo_id,
                        cantidad: cant,
                        precio_unitario: precio,
                        subtotal: cant * precio
                    };
                });

                setDetalles(detallesAutocargados);
                const totalCalculado = detallesAutocargados.reduce((acc, curr) => acc + curr.subtotal, 0);
                setForm(prev => ({ ...prev, monto_total: totalCalculado }));
            })
            .catch(err => console.error("Error al cargar detalles de la orden de compra:", err));
    }, [form.orden_compra_id]);

    // ── Validaciones ────────────────────────────────────────────────────────
    const cxpSeleccionada = useMemo(
        () => cxpPendientes.find((c) => String(c.id) === String(form.id_cuenta_por_pagar)) ?? null,
        [cxpPendientes, form.id_cuenta_por_pagar]
    );
    const maxMontoNC = cxpSeleccionada ? Number(cxpSeleccionada.saldo_pendiente) : undefined;
    const esNC = form.tipo_comprobante === 'Nota de Crédito';

    const errFecha = useMemo(() => {
        if (esNC) return null;
        if (!form.fecha_vencimiento) return null;
        return form.fecha_vencimiento < form.fecha_emision
            ? 'La fecha de vencimiento no puede ser anterior a la de emisión.'
            : null;
    }, [esNC, form.fecha_emision, form.fecha_vencimiento]);

    const isFormValid = useMemo(() => {
        const base =
            !!form.proveedor_id &&
            !!form.tipo_comprobante &&
            isValidNumeroComprobante(form.numero_comprobante) &&
            Number(form.monto_total) > 0 &&
            !!form.fecha_emision &&
            !errFecha;

        if (esNC) {
            const montoOk = maxMontoNC !== undefined ? Number(form.monto_total) <= maxMontoNC : true;
            return base && !!form.id_cuenta_por_pagar && montoOk;
        }
        return base && !!form.fecha_vencimiento;
    }, [form, esNC, errFecha, maxMontoNC]);

    // ── Handlers de formulario ──────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const next = { ...prev };

            if (name === 'numero_comprobante') {
                let soloNumeros = value.replace(/\D/g, '');
                if (soloNumeros.length > 12) soloNumeros = soloNumeros.substring(0, 12);
                if (soloNumeros.length > 4) {
                    next[name] = `${soloNumeros.substring(0, 4)}-${soloNumeros.substring(4)}`;
                } else {
                    next[name] = soloNumeros;
                }
            } else if (name === 'monto_total') {
                let montoLimpio = value.replace(/[^0-9.]/g, '');
                next[name] = montoLimpio.substring(0, 13);
            } else {
                next[name] = value;
            }

            if (name === 'tipo_comprobante') {
                next.id_cuenta_por_pagar = '';
                next.monto_total = '';
                if (value === 'Nota de Crédito') next.fecha_vencimiento = '';
            }
            
            if (name === 'id_cuenta_por_pagar') {
                const cxp = cxpPendientes.find((c) => String(c.id) === value);
                if (cxp && Number(prev.monto_total) > Number(cxp.saldo_pendiente)) {
                    next.monto_total = '';
                }
            }
            return next;
        });
    };

    const handleDetalleChange = (e) => {
        const { name, value } = e.target;
        setDetalleActual(prev => ({ ...prev, [name]: value }));
    };

    // Agregar detalle con recálculo automático de total
    const agregarDetalle = () => {
        const { articulo_id, cantidad, precio_unitario } = detalleActual;
        if (!articulo_id || !cantidad || !precio_unitario) {
            alert("Por favor, complete Artículo, Cantidad y Precio para agregar a la grilla.");
            return;
        }

        const nuevoDetalle = {
            articulo_id,
            cantidad: Number(cantidad),
            precio_unitario: Number(precio_unitario),
            subtotal: Number(cantidad) * Number(precio_unitario)
        };

        const nuevosDetalles = [...detalles, nuevoDetalle];
        setDetalles(nuevosDetalles);

        // Recalcular monto_total del formulario automáticamente
        const nuevoTotal = nuevosDetalles.reduce((acc, curr) => acc + curr.subtotal, 0);
        setForm(prev => ({ ...prev, monto_total: nuevoTotal }));

        setDetalleActual({ articulo_id: '', cantidad: '', precio_unitario: '' });
    };

    // Quitar detalle con recálculo de total
    const eliminarDetalle = (indexToRemove) => {
        if (!window.confirm("¿Deseas quitar este artículo del comprobante?")) return;

        setDetalles((prevDetalles) => {
            const nuevosDetalles = prevDetalles.filter((_, i) => i !== indexToRemove);
            const nuevoTotal = nuevosDetalles.reduce((acc, curr) => acc + curr.subtotal, 0);
            setForm((prevForm) => ({ ...prevForm, monto_total: nuevoTotal }));
            return nuevosDetalles;
        });
    };

    const handleOpenModal = () => {
        setForm(FORM_INICIAL);
        setDetalles([]);
        setCxpPendientes([]);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        if (submitting) return;
        setModalOpen(false);
    };

    // ── Submit limpio ───────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (detalles.length === 0) {
            alert("Debe agregar al menos un artículo al detalle del comprobante.");
            return;
        }

        if (!isFormValid || submitting) return;

        setSubmitting(true);
        try {
            const payload = {
                proveedor_id: form.proveedor_id,
                tipo_comprobante: form.tipo_comprobante,
                numero_comprobante: form.numero_comprobante.trim(),
                monto_total: Number(form.monto_total),
                fecha_emision: form.fecha_emision,
                fecha_vencimiento: esNC ? null : form.fecha_vencimiento,
                id_cuenta_por_pagar: esNC ? form.id_cuenta_por_pagar : null,
                orden_compra_id: form.orden_compra_id || null,
                detalles
            };

            await registrarComprobante(payload);
            setModalOpen(false);
            cargarDatos();
            showToast(`${form.tipo_comprobante} ${form.numero_comprobante} registrada correctamente.`, 'ok');
        } catch (err) {
            if (err.message === 'COMPROBANTE_DUPLICADO') {
                showToast('Comprobante duplicado para este proveedor.', 'err');
            } else {
                showToast(err.message || 'Error al registrar el comprobante.', 'err');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── Filtrado dinámico de tablas ─────────────────────────────────────────
    const comprobantesFiltrados = useMemo(() => {
        const busq = busquedaCompras.trim().toLowerCase();
        return comprobantes.filter((c) => {
            const nro = (c.numero_comprobante || '').toLowerCase();
            const prov = (c.proveedores?.razon_social || '').toLowerCase();
            const coincideTexto = !busq || nro.includes(busq) || prov.includes(busq);

            let coincideTipo = true;
            if (filtroTipoCompras === 'facturas') {
                coincideTipo = c.tipo_comprobante && c.tipo_comprobante.startsWith('Factura');
            } else if (filtroTipoCompras !== 'todos') {
                coincideTipo = c.tipo_comprobante === filtroTipoCompras;
            }

            return coincideTexto && coincideTipo;
        });
    }, [comprobantes, busquedaCompras, filtroTipoCompras]);

    const ventasFiltradas = useMemo(() => {
        const busq = busquedaVentas.trim().toLowerCase();
        return ventas.filter((v) => {
            const nro = (v.numeroComprobante || '').toLowerCase();
            const cli = (v.cliente || '').toLowerCase();
            const coincideTexto = !busq || nro.includes(busq) || cli.includes(busq);

            const estado = v.estado || 'Confirmada';
            const coincideEstado = filtroEstadoVentas === 'todos' || estado === filtroEstadoVentas;

            return coincideTexto && coincideEstado;
        });
    }, [ventas, busquedaVentas, filtroEstadoVentas]);

    // ── KPIs ────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const facturas = comprobantes.filter((c) => c.tipo_comprobante && c.tipo_comprobante.startsWith('Factura'));
        const nc = comprobantes.filter((c) => c.tipo_comprobante === 'Nota de Crédito');
        const nd = comprobantes.filter((c) => c.tipo_comprobante === 'Nota de Débito');
        const remitos = comprobantes.filter((c) => c.tipo_comprobante === 'Remito');
        const totalFacturado = facturas.reduce((a, c) => a + Number(c.monto_total), 0);
        
        return { 
            facturas: facturas.length, 
            nc: nc.length, 
            nd: nd.length, 
            remitos: remitos.length, 
            totalFacturado 
        };
    }, [comprobantes]);

    const kpisVentas = useMemo(() => {
        const confirmadas = ventas.filter(v => (v.estado || 'Confirmada') === 'Confirmada');
        const pendientes = ventas.filter(v => v.estado === 'Pendiente');
        const totalVendido = confirmadas.reduce((a, v) => a + v.total, 0);
        return { 
            cantidad: confirmadas.length, 
            pendientes: pendientes.length, 
            totalVendido 
        };
    }, [ventas]);

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Banner Toast */}
            {toast && (
                <div className={`confirm-banner${toast.type === 'err' ? ' confirm-banner--error' : ''}`}
                    style={toast.type === 'err' ? {
                        background: 'var(--crit, #dc2626)',
                        color: '#fff',
                        borderColor: 'var(--crit, #dc2626)'
                    } : {}}>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {toast.type === 'err'
                            ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                            : <path d="M20 6 9 17l-5-5" />}
                    </svg>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* Selector de vista Compras / Ventas */}
            <div className="catalog-toolbar" style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                    {vista === 'compras'
                        ? `${comprobantes.length} comprobante${comprobantes.length !== 1 ? 's' : ''} de compra registrados`
                        : `${ventas.length} transacción${ventas.length !== 1 ? 'es' : ''} de venta registradas`}
                </span>

                <div className="view-toggle" style={{ marginLeft: 'auto' }}>
                    <button className={vista === 'compras' ? 'active' : ''} onClick={() => setVista('compras')}>
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L22 8H6" />
                        </svg>
                        Compras
                    </button>
                    <button className={vista === 'ventas' ? 'active' : ''} onClick={() => setVista('ventas')}>
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3v4M8 3v4M2 11h20" />
                        </svg>
                        Ventas
                    </button>
                </div>

                {vista === 'compras' ? (
                    <button className="btn btn-primary" onClick={handleOpenModal} disabled={loading}>
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Registrar comprobante
                    </button>
                ) : (
                    <Link to="/Punto_de_Venta" className="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Ir al Punto de Venta
                    </Link>
                )}
            </div>

            {/* ============================================================== */}
            {/* VISTA COMPRAS                                                 */}
            {/* ============================================================== */}
            {vista === 'compras' ? (
                <>
                    {/* KPIs Compras */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        <div className="stat-card">
                            <div className="stat-value">{kpis.facturas}</div>
                            <div className="stat-label">Facturas</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--crit)' }}>{kpis.nc}</div>
                            <div className="stat-label">Notas de Crédito</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--green)' }}>{kpis.nd}</div>
                            <div className="stat-label">Notas de Débito</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--info, #3b82f6)' }}>{kpis.remitos}</div>
                            <div className="stat-label">Remitos</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{formatearMonto(kpis.totalFacturado)}</div>
                            <div className="stat-label">Total facturado</div>
                        </div>
                    </div>

                    {/* Barra de Filtros de Compras */}
                    <div className="catalog-toolbar" style={{ marginTop: '14px', background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color, #e5e7eb)' }}>
                        <div className="search-input" style={{ flex: 1 }}>
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por número o proveedor…"
                                value={busquedaCompras}
                                onChange={(e) => setBusquedaCompras(e.target.value)}
                            />
                        </div>

                        <div className="select-field" style={{ marginLeft: '12px' }}>
                            Tipo:
                            <select
                                value={filtroTipoCompras}
                                onChange={(e) => setFiltroTipoCompras(e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', marginLeft: '6px', fontWeight: '500' }}
                            >
                                <option value="todos">Todos los tipos</option>
                                <option value="facturas">Facturas (A, B, C)</option>
                                <option value="Nota de Crédito">Notas de Crédito</option>
                                <option value="Nota de Débito">Notas de Débito</option>
                                <option value="Remito">Remitos</option>
                            </select>
                        </div>
                    </div>

                    {/* Tabla Compras */}
                    <div className="table-panel" style={{ marginTop: '12px' }}>
                        <div className="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Número</th>
                                        <th>Proveedor</th>
                                        <th>Monto</th>
                                        <th>Emisión</th>
                                        <th>Vencimiento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                                                Cargando comprobantes…
                                            </td>
                                        </tr>
                                    ) : comprobantesFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                                                {comprobantes.length === 0 
                                                    ? 'No hay comprobantes registrados todavía.' 
                                                    : 'No hay comprobantes que coincidan con la búsqueda.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        comprobantesFiltrados.map((c) => {
                                            const badge = BADGE_MAP[c.tipo_comprobante] ?? { label: c.tipo_comprobante, cls: '' };
                                            return (
                                                <tr key={c.id}>
                                                    <td>
                                                        <span className={`badge ${badge.cls}`}>
                                                            <span className="badge-dot" />
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="cell-mono">{c.numero_comprobante}</td>
                                                    <td>{c.proveedores?.razon_social ?? '—'}</td>
                                                    <td>{formatearMonto(c.monto_total)}</td>
                                                    <td>{formatearFecha(c.fecha_emision)}</td>
                                                    <td>{c.fecha_vencimiento ? formatearFecha(c.fecha_vencimiento) : <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* ========================================================== */
                /* VISTA VENTAS                                               */
                /* ========================================================== */
                <>
                    {/* KPIs Ventas */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="stat-card">
                            <div className="stat-value">{kpisVentas.cantidad}</div>
                            <div className="stat-label">Ventas confirmadas</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--amber, #f59e0b)' }}>{kpisVentas.pendientes}</div>
                            <div className="stat-label">Pendientes de cobro</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--green)' }}>{formatearMonto(kpisVentas.totalVendido)}</div>
                            <div className="stat-label">Total vendido</div>
                        </div>
                    </div>

                    {/* Barra de Filtros de Ventas */}
                    <div className="catalog-toolbar" style={{ marginTop: '14px', background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color, #e5e7eb)' }}>
                        <div className="search-input" style={{ flex: 1 }}>
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por número (ej: VTA-00001) o cliente…"
                                value={busquedaVentas}
                                onChange={(e) => setBusquedaVentas(e.target.value)}
                            />
                        </div>

                        <div className="select-field" style={{ marginLeft: '12px' }}>
                            Estado:
                            <select
                                value={filtroEstadoVentas}
                                onChange={(e) => setFiltroEstadoVentas(e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', marginLeft: '6px', fontWeight: '500' }}
                            >
                                <option value="todos">Todos los estados</option>
                                <option value="Pendiente">Pendientes de cobro</option>
                                <option value="Confirmada">Confirmadas</option>
                            </select>
                        </div>
                    </div>

                    {/* Tabla Ventas */}
                    <div className="table-panel" style={{ marginTop: '12px' }}>
                        <div className="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Cliente</th>
                                        <th>Tienda</th>
                                        <th>Total</th>
                                        <th>Fecha / Hora</th>
                                        <th>Estado / Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingVentas ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                                                Cargando ventas…
                                            </td>
                                        </tr>
                                    ) : ventasFiltradas.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                                                {ventas.length === 0 
                                                    ? 'No se registraron ventas en el Punto de Venta.' 
                                                    : 'No hay ventas que coincidan con los filtros aplicados.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        ventasFiltradas.map((v) => {
                                            const estado = v.estado || 'Confirmada';
                                            const badge = BADGE_VENTAS[estado] || { label: estado, cls: 'badge-gray' };
                                            const esPendiente = estado === 'Pendiente';

                                            return (
                                                <tr key={v.ventaId || v.id}>
                                                    <td>
                                                        <span className={`badge ${badge.cls}`}>
                                                            <span className="badge-dot" />
                                                            {badge.label}
                                                        </span>{' '}
                                                        <span className="cell-mono" style={{ fontWeight: '600' }}>
                                                            {v.numeroComprobante || v.numero_comprobante}
                                                        </span>
                                                    </td>
                                                    <td>{v.cliente || 'Consumidor final'}</td>
                                                    <td>{v.deposito || '—'}</td>
                                                    <td style={{ fontWeight: '500' }}>{formatearMonto(v.total)}</td>
                                                    <td>{formatearFechaHora(v.fechaHoraRegistro || v.fechaHoraReserva)}</td>
                                                    <td>
                                                        {esPendiente ? (
                                                            <span style={{ color: 'var(--amber, #f59e0b)', fontWeight: '500', fontSize: '12px' }}>
                                                                Esperando cobro en caja
                                                            </span>
                                                        ) : (
                                                            (v.metodosPago && v.metodosPago.length > 0) ? v.metodosPago.join(', ') : 'Contado'
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ============================================================== */}
            {/* MODAL: REGISTRAR COMPROBANTE DE PROVEEDOR                     */}
            {/* ============================================================== */}
            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title="Registrar comprobante de proveedor"
                wide
                footer={
                    <>
                        <button className="btn btn-outline" onClick={handleCloseModal} disabled={submitting}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
                            {submitting ? (
                                <>
                                    <span className="spinner" style={{
                                        display: 'inline-block',
                                        width: '14px', height: '14px',
                                        border: '2px solid rgba(255,255,255,0.4)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite',
                                        marginRight: '6px',
                                        verticalAlign: 'middle',
                                    }} />
                                    Guardando…
                                </>
                            ) : 'Guardar comprobante'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} noValidate>
                    {/* Fila 1: Proveedor + Tipo */}
                    <div className="form-row">
                        <div className="form-field">
                            <label>Proveedor <span className="req">*</span></label>
                            <select name="proveedor_id" value={form.proveedor_id} onChange={handleChange} required>
                                <option value="" disabled>Seleccionar proveedor…</option>
                                {proveedores.map((p) => (
                                    <option key={p.id} value={p.id}>{p.razonSocial}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Tipo de comprobante <span className="req">*</span></label>
                            <select name="tipo_comprobante" value={form.tipo_comprobante} onChange={handleChange} required>
                                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Orden de Compra */}
                    <div className="form-field">
                        <label>Orden de Compra</label>
                        <select 
                            name="orden_compra_id" 
                            value={form.orden_compra_id || ''} 
                            onChange={handleChange}
                            disabled={!form.proveedor_id}
                        >
                            <option value="">-- Opcional (Asociar a Orden de Compra) --</option>
                            {ordenesCompra?.map((oc) => (
                                <option key={oc.id} value={oc.id}>
                                    OC #{oc.numero_oc || oc.id.slice(0, 8)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fila 2 (solo NC): Selección de factura pendiente */}
                    {esNC && (
                        <div className="form-row">
                            <div className="form-field full">
                                <label>Factura pendiente a aplicar <span className="req">*</span></label>
                                {!form.proveedor_id ? (
                                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '4px 0 0' }}>
                                        Seleccioná primero un proveedor para ver sus facturas pendientes.
                                    </p>
                                ) : loadingCxp ? (
                                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '4px 0 0' }}>
                                        Cargando facturas…
                                    </p>
                                ) : cxpPendientes.length === 0 ? (
                                    <p style={{ fontSize: '12px', color: 'var(--crit)', margin: '4px 0 0' }}>
                                        Este proveedor no tiene facturas pendientes con saldo.
                                    </p>
                                ) : (
                                    <select
                                        name="id_cuenta_por_pagar"
                                        value={form.id_cuenta_por_pagar}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="" disabled>Seleccionar factura…</option>
                                        {cxpPendientes.map((cxp) => (
                                            <option key={cxp.id} value={cxp.id}>
                                                {cxp.comprobantes_proveedores?.numero_comprobante ?? `CxP #${cxp.id}`}
                                                {' — '}Saldo: {formatearMonto(cxp.saldo_pendiente)}
                                                {' — '}Vto: {formatearFecha(cxp.fecha_vencimiento)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Fila 3: Número + Monto */}
                    <div className="form-row">
                        <div className="form-field">
                            <label>Número de comprobante <span className="req">*</span></label>
                            <input
                                type="text"
                                name="numero_comprobante"
                                value={form.numero_comprobante}
                                onChange={handleChange}
                                placeholder="Ej: 0001-00001234"
                                maxLength="13"
                                pattern="\d{4}-\d{8}"
                                title="El formato debe ser 0000-00000000"
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label>
                                Monto total <span className="req">*</span>
                                {esNC && cxpSeleccionada && (
                                    <span style={{ fontSize: '11px', color: 'var(--gray-500)', marginLeft: '6px' }}>
                                        máx. {formatearMonto(maxMontoNC)}
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                name="monto_total"
                                value={form.monto_total}
                                onChange={handleChange}
                                min="0.01"
                                step="0.01"
                                max={esNC && maxMontoNC !== undefined ? maxMontoNC : undefined}
                                placeholder="Ej: 150000"
                                required
                            />
                            {esNC && cxpSeleccionada && Number(form.monto_total) > maxMontoNC && (
                                <span style={{ fontSize: '11px', color: 'var(--crit)' }}>
                                    El monto supera el saldo pendiente ({formatearMonto(maxMontoNC)}).
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Fila 4: Fechas */}
                    <div className="form-row">
                        <div className="form-field">
                            <label>Fecha de emisión <span className="req">*</span></label>
                            <input
                                type="date"
                                name="fecha_emision"
                                value={form.fecha_emision}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        {!esNC && (
                            <div className="form-field">
                                <label>Fecha de vencimiento <span className="req">*</span></label>
                                <input
                                    type="date"
                                    name="fecha_vencimiento"
                                    value={form.fecha_vencimiento}
                                    onChange={handleChange}
                                    min={form.fecha_emision}
                                    required
                                />
                                {errFecha && (
                                    <span style={{ fontSize: '11px', color: 'var(--crit)' }}>
                                        {errFecha}
                                    </span>
                                )}
                            </div>
                        )}
                        {esNC && (
                            <div className="form-field" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                                <label>Fecha de vencimiento</label>
                                <input type="date" disabled placeholder="N/A — Las NC no vencen" />
                                <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                                    Las Notas de Crédito no tienen fecha de vencimiento.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Detalle de Artículos */}
                    <div className="detalle-section" style={{ marginTop: '20px', padding: '20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', color: '#333' }}>Detalle de Artículos</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 2fr) 1fr 1fr auto', gap: '15px', alignItems: 'end', marginBottom: '20px', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '0.9rem', color: '#555' }}>Artículo</label>
                                <select 
                                    name="articulo_id" 
                                    value={detalleActual.articulo_id} 
                                    onChange={handleDetalleChange} 
                                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                                >
                                    <option value="">Seleccionar artículo...</option>
                                    {articulos.map(art => (
                                        <option key={art.id} value={art.id}>
                                            {art.codigo_interno} - {art.descripcion}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '0.9rem', color: '#555' }}>Cantidad</label>
                                <input 
                                    type="number" 
                                    name="cantidad" 
                                    value={detalleActual.cantidad} 
                                    onChange={handleDetalleChange} 
                                    min="1" 
                                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '0.9rem', color: '#555' }}>Precio Unit.</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    name="precio_unitario" 
                                    value={detalleActual.precio_unitario} 
                                    onChange={handleDetalleChange} 
                                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
                                />
                            </div>

                            <div>
                                <button 
                                    type="button" 
                                    onClick={agregarDetalle} 
                                    style={{ padding: '8px 16px', height: '35px', cursor: 'pointer', backgroundColor: '#e42e2e', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '500', whiteSpace: 'nowrap' }}
                                >
                                    + Agregar
                                </button>
                            </div>
                        </div>

                        {detalles.length > 0 && (
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '0.95rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                                            <th style={{ padding: '8px' }}>Artículo</th>
                                            <th style={{ padding: '8px' }}>Cant.</th>
                                            <th style={{ padding: '8px' }}>Precio U.</th>
                                            <th style={{ padding: '8px' }}>Subtotal</th>
                                            <th style={{ padding: '8px', textAlign: 'center' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detalles.map((det, index) => {
                                            const articulo = articulos.find(a => String(a.id) === String(det.articulo_id));
                                            const nombreArticulo = articulo ? (articulo.nombre || articulo.descripcion) : 'Artículo Desconocido';
                                            
                                            return (
                                                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '8px' }}>{nombreArticulo}</td>
                                                    <td style={{ padding: '8px' }}>{det.cantidad}</td>
                                                    <td style={{ padding: '8px' }}>${det.precio_unitario.toFixed(2)}</td>
                                                    <td style={{ padding: '8px' }}>${det.subtotal.toFixed(2)}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                                        <button type="button" onClick={() => eliminarDetalle(index)} style={{ color: '#ef4444', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 'bold' }}>
                                                            Quitar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 8px' }}>Total Calculado:</td>
                                            <td style={{ fontWeight: 'bold', padding: '12px 8px', color: '#047857' }}>
                                                ${detalles.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Avisos contextuales */}
                    {form.tipo_comprobante.startsWith('Factura') && (
                        <div className="modal-notice">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                            </svg>
                            Al guardar se generará automáticamente una nueva Cuenta por Pagar por {Number(form.monto_total) > 0 ? formatearMonto(form.monto_total) : 'el monto total'}.
                        </div>
                    )}
                    {form.tipo_comprobante === 'Nota de Débito' && (
                        <div className="modal-notice">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                            </svg>
                            Al guardar se generará una nueva Cuenta por Pagar independiente por el monto de la Nota de Débito.
                        </div>
                    )}
                    {esNC && cxpSeleccionada && (
                        <div className="modal-notice">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                            </svg>
                            Se descontarán {Number(form.monto_total) > 0 ? formatearMonto(form.monto_total) : '…'} del saldo de la factura seleccionada (saldo actual: {formatearMonto(cxpSeleccionada.saldo_pendiente)}).
                        </div>
                    )}
                </form>

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </Modal>
        </div>
    );
}

export default RegistroComprobanteProveedor;