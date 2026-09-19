// =============================================================================
// RegistroComprobanteProveedor.jsx — HU-23
// Módulo: Compras / Tesorería
// Ruta: /registro-comprobantes
// =============================================================================
// Criterios de aceptación implementados:
//   CA-1: campos obligatorios con validación en tiempo real
//   CA-2: HTTP 409 → toast rojo "Comprobante duplicado para este proveedor"
//   CA-3: Factura / ND → genera CxP nueva (lo hace el backend)
//   CA-4: NC → aplica descuento sobre la CxP seleccionada (backend)
// Reglas arquitectónicas:
//   R2: NC muestra select de facturas pendientes, limita monto y oculta vto.
//   R3: validación de fechas (vto >= emisión) en frontend + backend
//   R5: ruta kebab-case /registro-comprobantes
//   R6: botón disabled hasta forma válida + spinner durante submit
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
    'Factura': { label: 'FAC', cls: 'badge-blue' }, // Por si queda algún registro viejo
    'Nota de Crédito': { label: 'NC', cls: 'badge-red' },
    'Nota de Débito': { label: 'ND', cls: 'badge-green' },
    'Remito': { label: 'REM', cls: 'badge-gray' }
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isValidNumeroComprobante(val) {
    // Acepta formatos: 0001-00001234 o texto libre (mínimo 4 chars)
    return val.trim().length >= 4;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
function RegistroComprobanteProveedor() {
    // ── Estado principal ────────────────────────────────────────────────────
    const [vista, setVista] = useState('compras'); // 'compras' | 'ventas'
    const [comprobantes, setComprobantes] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [loadingVentas, setLoadingVentas] = useState(true);
    const [proveedores, setProveedores] = useState([]);
    const [ordenesCompra, setOrdenesCompra] = useState([]);
    const [loading, setLoading] = useState(true);
    const [articulos, setArticulos] = useState([]); // Deberás cargar esto desde tu backend igual que los proveedores
    const [detalles, setDetalles] = useState([]); // Aquí se guardará el array final
    const [detalleActual, setDetalleActual] = useState({
        articulo_id: '',
        cantidad: '',
        precio_unitario: ''
    });

    // ── Estado del modal / formulario ───────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(FORM_INICIAL);
    const [cxpPendientes, setCxpPendientes] = useState([]);
    const [loadingCxp, setLoadingCxp] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ── Toast ───────────────────────────────────────────────────────────────
    const [toast, setToast] = useState(null); // { msg, type: 'ok'|'err' }

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

    // ── Carga de comprobantes de venta (pestaña "Ventas") ──────────────────
    useEffect(() => {
        setLoadingVentas(true);
        listarVentasConfirmadas()
            .then(setVentas)
            .catch((err) => console.error('[POS] Error al cargar comprobantes de venta:', err))
            .finally(() => setLoadingVentas(false));
    }, []);

    // ── Cuando cambia proveedor + tipo=NC, carga CxP pendientes ────────────
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


    useEffect(() => {
        // Reemplaza esta URL por la ruta real de tu backend que trae los artículos
        fetch('http://localhost:3001/api/articles') 
            .then(res => res.json())
            .then(respuesta => {
                console.log("Lo que llegó del backend:", respuesta); // <--- MIRA ESTO EN LA CONSOLA
            
            // Probemos adaptarlo según lo que veas aquí:
            setArticulos(respuesta.data || []);
            })
            .catch(err => console.error("Error al cargar artículos:", err));
    }, []); // El array vacío significa que se ejecuta una sola vez al abrir la pantalla

    useEffect(() => {
    if (form.proveedor_id) {
        // Llamamos al endpoint getAllPurchaseOrders que me pasaste
        fetch('http://localhost:3001/api/purchase-orders')
            .then(res => res.json())
            .then(respuesta => {
                // Tu backend devuelve { data: result }, así que leemos "respuesta.data"
                const todasLasOrdenes = respuesta.data || [];
                
                // Filtramos SOLO las que pertenecen al proveedor seleccionado
                // (Asegúrate de que la propiedad se llame 'proveedor_id' en la base de datos)
                const ordenesFiltradas = todasLasOrdenes.filter(
                    (oc) => oc.proveedor_id === form.proveedor_id && oc.estado !== 'Cancelada' // Opcional: ignorar las canceladas
                );
                
                setOrdenesCompra(ordenesFiltradas);
            })
            .catch(error => {
                console.error("Error al obtener las órdenes de compra:", error);
                setOrdenesCompra([]);
            });
    } else {
        // Si no hay proveedor seleccionado, limpiamos la lista
        setOrdenesCompra([]);
        setForm(prev => ({ ...prev, orden_compra_id: '' }));
    }
}, [form.proveedor_id]);

                // Cada vez que el usuario seleccione una Orden de Compra...
useEffect(() => {
    if (!form.orden_compra_id) {
        // Si la deselecciona, podemos vaciar la grilla o dejarla libre
        return; 
    }

    // Hacemos el fetch para traer los ítems de esa Orden de Compra específica
    fetch(`http://localhost:3001/api/purchase-orders/${form.orden_compra_id}/details`)
        .then(res => res.json())
        .then(respuesta => {
            const itemsOrden = respuesta.data || respuesta;
            
            // Transformamos los ítems de la orden al formato que usa nuestra grilla de comprobantes
            const detallesAutocargados = itemsOrden.map(item => {
                // 1. Imprimimos el ítem para ver cómo se llaman realmente sus campos
                console.log("Ítem recibido de la OC:", item); 
                        
                // 2. Forzamos a que sean números reales. Si vienen vacíos, les ponemos 0.
                // OJO: Si al ver la consola notas que la cantidad viene bajo otro nombre (ej: item.cantidad_pedida), cambialo aquí.
                const cant = Number(item.cantidad_solicitada) || 0; 
                const precio = Number(item.precio_unitario) || 0;
                        
                return {
                    articulo_id: item.articulo_id,
                    cantidad: cant,
                    precio_unitario: precio,
                    subtotal: cant * precio
                };
            });

            // Inyectamos los detalles automáticamente en la grilla
            setDetalles(detallesAutocargados);
            
            // Opcional: Podrías autocompletar el monto total sumando todo de forma automática
            const totalCalculado = detallesAutocargados.reduce((acc, curr) => acc + curr.subtotal, 0);
            setForm(prev => ({ ...prev, monto_total: totalCalculado }));
        })
        .catch(err => console.error("Error al cargar detalles de la orden de compra:", err));

}, [form.orden_compra_id]); // Se dispara mágicamente al cambiar de orden de compra





    // ── Monto máximo para NC (saldo de la CxP seleccionada) ────────────────
    const cxpSeleccionada = useMemo(
        () => cxpPendientes.find((c) => String(c.id) === String(form.id_cuenta_por_pagar)) ?? null,
        [cxpPendientes, form.id_cuenta_por_pagar]
    );
    const maxMontoNC = cxpSeleccionada ? Number(cxpSeleccionada.saldo_pendiente) : undefined;

    // ── Validación del formulario (Regla 6 + CA-1 + R3) ────────────────────
    const esNC = form.tipo_comprobante === 'Nota de Crédito';

    const errFecha = useMemo(() => {
        if (esNC) return null; // NC no tiene fecha de vencimiento
        if (!form.fecha_vencimiento) return null; // el campo vacío lo captura el required
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
        // ── Handlers de formulario ──────────────────────────────────────────────
                // ── Handlers de formulario ──────────────────────────────────────────────
const handleChange = (e) => {
    const { name, value } = e.target;
    
    setForm((prev) => {
        const next = { ...prev };

        // 1. Formatear el número de comprobante
        if (name === 'numero_comprobante') {
            let soloNumeros = value.replace(/\D/g, '');
            if (soloNumeros.length > 12) soloNumeros = soloNumeros.substring(0, 12);
            
            if (soloNumeros.length > 4) {
                next[name] = `${soloNumeros.substring(0, 4)}-${soloNumeros.substring(4)}`;
            } else {
                next[name] = soloNumeros;
            }
        } 
        // 2. NUEVA LÓGICA: Limitar el monto a 13 dígitos
        else if (name === 'monto_total') {
            // Permite solo números y un punto decimal, limitando la longitud a 13
            let montoLimpio = value.replace(/[^0-9.]/g, '');
            next[name] = montoLimpio.substring(0, 13);
        } 
        // 3. Comportamiento normal para el resto
        else {
            next[name] = value;
        }

        // Al cambiar tipo, limpiar campos que no aplican
        if (name === 'tipo_comprobante') {
            next.id_cuenta_por_pagar = '';
            next.monto_total = '';
            if (value === 'Nota de Crédito') {
                next.fecha_vencimiento = '';
            }
        }
        
        // Al cambiar la CxP, ajustar monto si supera el saldo
        if (name === 'id_cuenta_por_pagar') {
            const cxp = cxpPendientes.find((c) => String(c.id) === value);
            if (cxp && Number(prev.monto_total) > Number(cxp.saldo_pendiente)) {
                next.monto_total = '';
            }
        }
        
        return next;
    });
};

    // Maneja los cambios de los inputs de la fila de detalle
    const handleDetalleChange = (e) => {
        const { name, value } = e.target;
        setDetalleActual(prev => ({ ...prev, [name]: value }));
    };

    // Agrega la fila temporal al array de detalles
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

        setDetalles(prev => [...prev, nuevoDetalle]);

        // Limpiamos los inputs para cargar el siguiente
        setDetalleActual({ articulo_id: '', cantidad: '', precio_unitario: '' });
    };

    // Elimina una fila si el usuario se equivocó
    // Elimina una fila previa confirmación del usuario
const eliminarDetalle = (indexToRemove) => {
    // 1. Mostrar la ventana de confirmación
    const estaSeguro = window.confirm("¿Estás seguro de que deseas quitar este artículo del comprobante?");
    
    // 2. Si el usuario hace clic en "Cancelar", detenemos la función aquí mismo
    if (!estaSeguro) {
        return; 
    }

    // 3. Si hace clic en "Aceptar", procedemos a borrar y recalcular
    setDetalles((prevDetalles) => {
        const nuevosDetalles = prevDetalles.filter((_, i) => i !== indexToRemove);
        const nuevoTotal = nuevosDetalles.reduce((acc, curr) => acc + curr.subtotal, 0);
        
        setForm((prevForm) => ({ ...prevForm, monto_total: nuevoTotal }));
        
        return nuevosDetalles;
    });
};

    const handleOpenModal = () => {
        setForm(FORM_INICIAL);
        setCxpPendientes([]);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        if (submitting) return;
        setModalOpen(false);
    };

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log("Estado del form:", form);
    console.log("¿Es válido?:", isFormValid);


            // 1. NUEVA VALIDACIÓN: Asegurar que hay detalles cargados
    if (detalles.length === 0) {
        alert("Debe agregar al menos un artículo al detalle del comprobante.");
        return;
    }

    const esNC = form.tipo_comprobante === 'Nota de Crédito';

    // 2. INYECTAR DETALLES AL PAYLOAD
    const payload = {
        proveedor_id: form.proveedor_id,
        tipo_comprobante: form.tipo_comprobante,
        numero_comprobante: form.numero_comprobante.trim(),
        monto_total: Number(form.monto_total),
        fecha_emision: form.fecha_emision,
        fecha_vencimiento: esNC ? null : form.fecha_vencimiento,
        id_cuenta_por_pagar: esNC ? form.id_cuenta_por_pagar : null,
        orden_compra_id: form.orden_compra_id || null,
        detalles: detalles // <--- SE ENVÍA EL ARRAY AL BACKEND
    };

        if (!isFormValid || submitting) {

            console.log("Bloqueado por validación. Saliendo...");
            return;}
            
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
                detalles: detalles
            };

            await registrarComprobante(payload);

            setModalOpen(false);
            cargarDatos();
            showToast(
                `${form.tipo_comprobante} ${form.numero_comprobante} registrada correctamente.`,
                'ok'
            );
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

    // ── KPIs de resumen ─────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const facturas = comprobantes.filter((c) => c.tipo_comprobante && c.tipo_comprobante.startsWith('Factura'));
        const nc = comprobantes.filter((c) => c.tipo_comprobante === 'Nota de Crédito');
        const nd = comprobantes.filter((c) => c.tipo_comprobante === 'Nota de Débito');
        const remitos = comprobantes.filter((c) => c.tipo_comprobante === 'Remito'); // <-- Agregado
        
        const totalFacturado = facturas.reduce((a, c) => a + Number(c.monto_total), 0);
        
        return { 
            facturas: facturas.length, 
            nc: nc.length, 
            nd: nd.length, 
            remitos: remitos.length, // <-- Lo devolvemos para mostrarlo si lo deseas
            totalFacturado 
        };
        }, [comprobantes]);

    const kpisVentas = useMemo(() => {
        const totalVendido = ventas.reduce((a, v) => a + v.total, 0);
        const metodosUsados = new Set(ventas.flatMap((v) => v.metodosPago));
        return { cantidad: ventas.length, totalVendido, metodosUsados: metodosUsados.size };
    }, [ventas]);

   
    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Toast */}
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

            {/* Toolbar */}
            <div className="catalog-toolbar">
                <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                    {vista === 'compras'
                        ? `${comprobantes.length} comprobante${comprobantes.length !== 1 ? 's' : ''} de compra registrado${comprobantes.length !== 1 ? 's' : ''}`
                        : `${ventas.length} comprobante${ventas.length !== 1 ? 's' : ''} de venta confirmado${ventas.length !== 1 ? 's' : ''}`}
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
                    <button
                        className="btn btn-primary"
                        onClick={handleOpenModal}
                        disabled={loading}
                    >
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

            {vista === 'compras' ? (
                <>
                    {/* KPIs — Compras */}
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

                    {/* Tabla — Compras */}
                    <div className="table-panel">
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
                                                Cargando…
                                            </td>
                                        </tr>
                                    ) : comprobantes.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                                                No hay comprobantes registrados todavía.
                                            </td>
                                        </tr>
                                    ) : (
                                        comprobantes.map((c) => {
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
                <>
                    {/* KPIs — Ventas */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="stat-card">
                            <div className="stat-value">{kpisVentas.cantidad}</div>
                            <div className="stat-label">Ventas confirmadas</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--green)' }}>{formatearMonto(kpisVentas.totalVendido)}</div>
                            <div className="stat-label">Total vendido</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{kpisVentas.metodosUsados}</div>
                            <div className="stat-label">Métodos de pago distintos usados</div>
                        </div>
                    </div>

                    {/* Tabla — Ventas */}
                    <div className="table-panel">
                        <div className="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Cliente</th>
                                        <th>Tienda</th>
                                        <th>Total</th>
                                        <th>Fecha</th>
                                        <th>Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingVentas ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                                                Cargando…
                                            </td>
                                        </tr>
                                    ) : ventas.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                                                Todavía no se confirmó ninguna venta desde el Punto de Venta.
                                            </td>
                                        </tr>
                                    ) : (
                                        ventas.map((v) => (
                                            <tr key={v.ventaId}>
                                                <td>
                                                    <span className="badge badge-green">
                                                        <span className="badge-dot" />
                                                        VTA
                                                    </span>{' '}
                                                    <span className="cell-mono">{v.numeroComprobante}</span>
                                                </td>
                                                <td>{v.cliente}</td>
                                                <td>{v.deposito}</td>
                                                <td>{formatearMonto(v.total)}</td>
                                                <td>{formatearFechaHora(v.fechaHoraRegistro)}</td>
                                                <td>{v.metodosPago.join(', ') || '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ================================================================ */}
            {/* MODAL: REGISTRAR COMPROBANTE                                     */}
            {/* ================================================================ */}
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
                        <button
                            className="btn btn-primary"
                            disabled={submitting}
                            onClick={handleSubmit}
                        >
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
                                    <option key={p.id} value={p.id}>
                                        {p.razonSocial}
                                        </option>
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
                    {/* NUEVO CAMPO: Orden de Compra */}
    <div className="form-field">
        <label>Orden de Compra</label>
        <select 
            name="orden_compra_id" 
            value={form.orden_compra_id || ''} 
            onChange={handleChange}
            disabled={!form.proveedor_id} /* Se habilita solo si hay un proveedor seleccionado */
        >
            <option value="">-- Opcional --</option>
            
            {/* Aquí debes mapear tu estado de órdenes de compra filtradas */}
            {ordenesCompra?.map((oc) => (
                <option key={oc.id} value={oc.id}>
                    OC #{oc.numero_oc || oc.id.slice(0,8)}
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
                                maxLength="13" /* 12 números + 1 guion */
                                pattern="\d{4}-\d{8}" /* Validación nativa de HTML5 */
                                title="El formato debe ser 0000-00000000 (4 dígitos, un guion, 8 dígitos)"
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

                    {/* Fila 4: Fecha emisión + Fecha vencimiento (oculta para NC) */}
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

                        {/* ================= SECCIÓN DE DETALLE DE ARTÍCULOS ================= */}
<div className="detalle-section" style={{ marginTop: '20px', padding: '20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }}>
    <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', color: '#333' }}>Detalle de Artículos</h3>
    
    {/* Fila de inputs usando CSS Grid para evitar desbordes */}
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

    {/* Tabla de visualización de los detalles agregados */}
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

                    {/* Info visual según tipo */}
                    {form.tipo_comprobante === 'Factura' && (
                        <div className="modal-notice">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                            </svg>
                            Al guardar se generará automáticamente una nueva Cuenta por Pagar por {Number(form.monto_total) > 0 ? formatearMonto(form.monto_total) : 'el monto ingresado'}.
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
                            Se descontarán {Number(form.monto_total) > 0 ? formatearMonto(form.monto_total) : '…'}
                            {' '}del saldo de la factura seleccionada (saldo actual: {formatearMonto(cxpSeleccionada.saldo_pendiente)}).
                        </div>
                    )}

                </form>

                {/* Keyframe inline para el spinner (una sola vez) */}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </Modal>
        </div>
    );
}

export default RegistroComprobanteProveedor;

