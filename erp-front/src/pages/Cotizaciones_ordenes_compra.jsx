import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { formatearFecha, formatearMonto } from '../utils/format';
// No purchasingService mock required anymore

// NOTA: página de HU-12 (Solicitud de Cotizaciones y Órdenes de Compra).
// `services/purchasingService.js` es un MOCK en memoria (se reinicia al
// recargar) — las tablas que modela (cotizaciones*, ordenes_compra*) ya
// existen en el SQL real de Supabase. Solo el catálogo de artículos y el
// listado de proveedores son datos reales (GET a erp-backend, solo lectura).
// Ver docs/sprint2/HU-12-14-23-24-frontend.md para el detalle de qué
// endpoints debería exponer el backend para reemplazar este mock.

function badgeClassCotizacion(estado) {
  switch (estado) {
    case 'Aprobada':
      return 'badge-green';
    case 'Enviada':
      return 'badge-blue';
    case 'Cancelada':
      return 'badge-red';
    default:
      return 'badge-amber';
  }
}

function badgeClassOC(estado) {
  switch (estado) {
    case 'Recibida':
      return 'badge-green';
    case 'Parcial':
      return 'badge-blue';
    case 'Cancelada':
      return 'badge-red';
    default:
      return 'badge-amber';
  }
}

const LINEA_VACIA = () => ({ articuloId: '', cantidadSolicitada: 1 });

function Cotizaciones_ordenes_compra() {
  const [activeTab, setActiveTab] = useState('cotizaciones');
  const [toast, setToast] = useState(null);

  const [articulos, setArticulos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loadingRef, setLoadingRef] = useState(true);

  const [cotizaciones, setCotizaciones] = useState([]);
  const [loadingCot, setLoadingCot] = useState(true);
  const [filtroEstadoCot, setFiltroEstadoCot] = useState('todas');
  const [kpiCot, setKpiCot] = useState({ total: 0, enviadas: 0, aprobadas: 0 });

  const [ordenes, setOrdenes] = useState([]);
  const [loadingOC, setLoadingOC] = useState(true);
  const [filtroEstadoOC, setFiltroEstadoOC] = useState('todas');
  const [filtroProveedorOC, setFiltroProveedorOC] = useState('todos');

  // Modal: nueva cotización
  const [isNuevaCotOpen, setIsNuevaCotOpen] = useState(false);
  const [lineasForm, setLineasForm] = useState([LINEA_VACIA()]);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState([]);
  const [submittingCot, setSubmittingCot] = useState(false);

  // Modal: detalle de cotización
  const [isDetalleCotOpen, setIsDetalleCotOpen] = useState(false);
  const [cotizacionDetalle, setCotizacionDetalle] = useState(null);
  const [proveedorGanadorSel, setProveedorGanadorSel] = useState('');
  const [procesandoCot, setProcesandoCot] = useState(false);

  // Modal: detalle de OC / recepción
  const [isDetalleOCOpen, setIsDetalleOCOpen] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [cantidadesRecepcion, setCantidadesRecepcion] = useState({});
  const [procesandoRecepcion, setProcesandoRecepcion] = useState(false);
  const [ordenACancelar, setOrdenACancelar] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  const articuloById = useMemo(() => new Map(articulos.map((a) => [a.id, a])), [articulos]);
  const proveedorById = useMemo(() => new Map(proveedores.map((p) => [p.id, p])), [proveedores]);

  const cargarReferencia = () => {
    setLoadingRef(true);
    Promise.all([
      fetch('http://localhost:3001/api/articles').then((res) => res.json()),
      fetch('http://localhost:3001/api/suppliers').then((res) => res.json()),
    ])
      .then(([artsRes, provsRes]) => {
        const arts = (artsRes.data || []).map((a) => ({
          id: a.id,
          descripcion: a.descripcion,
          modelo: a.modelo,
          codigoEan13: a.codigo_ean13,
        }));
        const provs = (provsRes.data || []).map((p) => ({
          id: p.id,
          razonSocial: p.razon_social,
          cuit: p.cuit,
          email: p.email,
        }));
        setArticulos(arts);
        setProveedores(provs);
      })
      .catch((err) => console.error('Error cargando datos de referencia:', err))
      .finally(() => setLoadingRef(false));
  };

  const cargarCotizaciones = async () => {
    setLoadingCot(true);
    try {
      let url = 'http://localhost:3001/api/quotes/todas';
      if (filtroEstadoCot === 'Enviada') url = 'http://localhost:3001/api/quotes/enviadas';
      else if (filtroEstadoCot === 'Aprobada') url = 'http://localhost:3001/api/quotes/aprobadas';
      else if (filtroEstadoCot === 'Cancelada') url = 'http://localhost:3001/api/quotes/canceladas';
      
      const res = await fetch(url);
      const json = await res.json();
      const quotesRaw = json.data || [];

      // UPDATE KPI: always fetch all quotes to calculate global totals independently of filter
      const resTodas = await fetch('http://localhost:3001/api/quotes/todas');
      const jsonTodas = await resTodas.json();
      const quotesTodas = jsonTodas.data || [];
      const stats = { total: quotesTodas.length, enviadas: 0, aprobadas: 0 };
      quotesTodas.forEach(q => {
        let estadoFinal = q.estado;
        if (q.estado === 'Pendiente') {
            if (q.fecha_hora_registro === q.fecha_hora_actualizacion) {
              estadoFinal = 'Enviada';
            }
        }
        if (estadoFinal === 'Enviada') stats.enviadas++;
        if (estadoFinal === 'Aprobada') stats.aprobadas++;
      });
      setKpiCot(stats);

      const quotesArmadas = await Promise.all(
        quotesRaw.map(async (q) => {
          // ARTÍCULOS
          const resDet = await fetch(`http://localhost:3001/api/quotes/${q.id}/detalle`);
          const jsonDet = await resDet.json();
          const cantidadArticulos = (jsonDet.data || []).length;

          // PROVEEDORES INVITADOS
          const resProv = await fetch(`http://localhost:3001/api/quotes/${q.id}/proveedores`);
          const jsonProv = await resProv.json();
          const proveedores = jsonProv.data || [];
          const cantidadProveedores = proveedores.length;

          // RESPUESTAS
          let cantidadRespuestas = 0;
          for (const prov of proveedores) {
            const resProvDet = await fetch(`http://localhost:3001/api/quotes/proveedores-detalles/${prov.id}`);
            const jsonProvDet = await resProvDet.json();
            const provDetalles = jsonProvDet.data || [];
            
            if (provDetalles.length === cantidadArticulos && cantidadArticulos > 0) {
              cantidadRespuestas++;
            }
          }

          // ESTADO
          let estadoFinal = q.estado;
          if (q.estado === 'Pendiente') {
            if (q.fecha_hora_registro === q.fecha_hora_actualizacion) {
              estadoFinal = 'Enviada'; // color azul
            } else {
              estadoFinal = 'Pendiente'; // color anaranjado
            }
          } else if (q.estado === 'Aprobada') {
             estadoFinal = 'Aprobada'; // color verde
          } else if (q.estado === 'Cancelada') {
             estadoFinal = 'Cancelada'; // color rojo
          }

          // FECHA: Formato DD/MM/AAAA
          const d = new Date(q.fecha_hora_registro);
          const fechaFormateada = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

          return {
            id: q.id,
            fechaRegistro: fechaFormateada,
            cantidadArticulos,
            cantidadProveedores,
            cantidadRespuestas,
            estado: estadoFinal,
            _original: q
          };
        })
      );
      setCotizaciones(quotesArmadas);
    } catch (error) {
      console.error('Error al cargar cotizaciones:', error);
    } finally {
      setLoadingCot(false);
    }
  };

  const cargarOrdenes = async () => {
    setLoadingOC(true);
    try {
      const res = await fetch('http://localhost:3001/api/purchase-orders');
      const json = await res.json();
      const ocArmadas = (json.data || []).map(oc => {
        // Formatear fecha
        const d = new Date(oc.fecha_emision);
        const fechaFormateada = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        
        // Calcular total
        const detalles = oc.ordenes_compra_detalle || [];
        const total = detalles.reduce((acc, l) => acc + (l.cantidad_solicitada * Number(l.precio_unitario)), 0);

        return {
          id: oc.id,
          numeroOrden: oc.numero_orden,
          proveedorId: oc.proveedor_id,
          fechaEmision: fechaFormateada,
          estado: oc.estado,
          total,
          lineas: detalles,
          _original: oc
        };
      });
      setOrdenes(ocArmadas);
    } catch (error) {
      console.error('Error al listar órdenes de compra:', error);
    } finally {
      setLoadingOC(false);
    }
  };

  useEffect(() => {
    cargarReferencia();
    cargarOrdenes();
  }, []);

  useEffect(() => {
    cargarCotizaciones();
  }, [filtroEstadoCot]);

  // ---------------------------------------------------------------------
  // Nueva cotización
  // ---------------------------------------------------------------------
  const handleOpenNuevaCot = () => {
    setLineasForm([LINEA_VACIA()]);
    setProveedoresSeleccionados([]);
    setIsNuevaCotOpen(true);
  };

  const handleAddLinea = () => setLineasForm((prev) => [...prev, LINEA_VACIA()]);
  const handleRemoveLinea = (idx) => setLineasForm((prev) => prev.filter((_, i) => i !== idx));
  const handleChangeLinea = (idx, field, value) => {
    setLineasForm((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: field === 'cantidadSolicitada' ? Math.max(1, Number(value) || 1) : value } : l))
    );
  };

  const toggleProveedorSeleccionado = (id) => {
    setProveedoresSeleccionados((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const articulosDuplicados = useMemo(() => {
    const ids = lineasForm.map((l) => l.articuloId).filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, [lineasForm]);

  const isNuevaCotValid =
    lineasForm.length > 0 &&
    lineasForm.every((l) => l.articuloId && Number(l.cantidadSolicitada) > 0) &&
    !articulosDuplicados &&
    proveedoresSeleccionados.length > 0;

  const handleSubmitNuevaCot = async (e) => {
    e.preventDefault();
    if (!isNuevaCotValid || submittingCot) return;
    setSubmittingCot(true);
    try {
      // 1. Crear cotización
      await fetch('http://localhost:3001/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      // 2. Obtener cotizaciones recientes para sacar el ID
      const resRecientes = await fetch('http://localhost:3001/api/quotes/recientes');
      const jsonRecientes = await resRecientes.json();
      if (!jsonRecientes.data || jsonRecientes.data.length === 0) {
        throw new Error('No se pudo recuperar la cotización recién creada.');
      }
      const ultimaCotizacionId = jsonRecientes.data[0].id;

      // 3. Crear detalles (artículos)
      for (const linea of lineasForm) {
        await fetch('http://localhost:3001/api/quotes/detalle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cotizacion_id: ultimaCotizacionId,
            articulo_id: linea.articuloId,
            cantidad_solicitada: linea.cantidadSolicitada
          })
        });
      }

      // 4. Crear proveedores de la cotización
      for (const proveedorId of proveedoresSeleccionados) {
        await fetch('http://localhost:3001/api/quotes/proveedor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cotizacion_id: ultimaCotizacionId,
            proveedor_id: proveedorId
          })
        });
      }

      showToast(`Cotización enviada por email a ${proveedoresSeleccionados.length} proveedor(es).`);
      setIsNuevaCotOpen(false);
      cargarCotizaciones();
    } catch (error) {
      alert(error.message || 'Error al crear la cotización.');
    } finally {
      setSubmittingCot(false);
    }
  };

  const [preciosIngresados, setPreciosIngresados] = useState({});
  const [showInputPrecios, setShowInputPrecios] = useState({});

  // ---------------------------------------------------------------------
  // Detalle de cotización
  // ---------------------------------------------------------------------
  const handleAbrirDetalleCot = async (c) => {
    setIsDetalleCotOpen(true);
    setCotizacionDetalle(null);
    setProveedorGanadorSel('');
    setPreciosIngresados({});
    setShowInputPrecios({});

    try {
      const id = c.id;
      
      const resDet = await fetch(`http://localhost:3001/api/quotes/${id}/detalle`);
      const jsonDet = await resDet.json();
      const lineas = jsonDet.data || [];

      const resProv = await fetch(`http://localhost:3001/api/quotes/${id}/proveedores`);
      const jsonProv = await resProv.json();
      const provs = jsonProv.data || [];

      const proveedoresInvitados = await Promise.all(
        provs.map(async (p) => {
          const resProvDet = await fetch(`http://localhost:3001/api/quotes/proveedores-detalles/${p.id}`);
          const jsonProvDet = await resProvDet.json();
          const pDetalles = jsonProvDet.data || [];
          
          let estadoRespuesta = 'Pendiente';
          // Si tiene un detalle por cada línea solicitada, está respondido
          if (pDetalles.length === lineas.length && lineas.length > 0) {
             estadoRespuesta = 'Respondido';
          }
          
          return {
            id: p.id,
            proveedorId: p.proveedor_id,
            estadoRespuesta,
            ofertas: pDetalles
          };
        })
      );

      setCotizacionDetalle({
        ...c,
        lineas,
        proveedoresInvitados
      });
    } catch (err) {
      console.error('Error al obtener cotización:', err);
    }
  };

  const handleGuardarRespuestas = async () => {
    const envios = [];
    for (const cp of cotizacionDetalle.proveedoresInvitados) {
      if (cp.estadoRespuesta === 'Pendiente') {
        const preciosProv = [];
        let missing = false;
        let algunaCargada = false;
        
        for (const l of cotizacionDetalle.lineas) {
          const key = `${cp.id}_${l.articulo_id}`;
          const val = Number(preciosIngresados[key]);
          if (showInputPrecios[key] || val > 0) {
             if (!val || val <= 0) {
               missing = true;
             } else {
               preciosProv.push({ articulo_id: l.articulo_id, precio_unitario_ofertado: val });
               algunaCargada = true;
             }
          } else {
             missing = true; // no se ingresaron todos los precios
          }
        }
        
        if (!missing && algunaCargada) {
          envios.push({ cp_id: cp.id, precios: preciosProv });
        }
      }
    }

    if (envios.length === 0) {
      alert("Por favor completá todos los precios para al menos un proveedor antes de guardar.");
      return;
    }

    try {
      for (const e of envios) {
        await fetch('http://localhost:3001/api/quotes/precios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cotizacion_proveedor_id: e.cp_id, precios: e.precios })
        });
      }
      showToast("Respuestas guardadas correctamente.");
      setIsDetalleCotOpen(false);
      cargarCotizaciones();
    } catch (err) {
      alert(error.message || "Error al guardar respuestas.");
    }
  };

  const handleCancelarCotizacion = async () => {
    if (!cotizacionDetalle) return;
    try {
      const res = await fetch(`http://localhost:3001/api/quotes/${cotizacionDetalle.id}/cancelar`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error('Fallo en la comunicación con el servidor');
      showToast('Cotización cancelada.');
      setIsDetalleCotOpen(false);
      cargarCotizaciones();
    } catch (error) {
      alert(error.message || 'Error al cancelar la cotización.');
    }
  };

  const handleRestaurarCotizacion = async () => {
    if (!cotizacionDetalle) return;
    try {
      const res = await fetch(`http://localhost:3001/api/quotes/${cotizacionDetalle.id}/pendiente`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error('Fallo en la comunicación con el servidor');
      showToast('Cotización restaurada a Pendiente.');
      setIsDetalleCotOpen(false);
      cargarCotizaciones();
    } catch (error) {
      alert(error.message || 'Error al restaurar la cotización.');
    }
  };

  const handleAprobarCotizacion = async () => {
    if (!cotizacionDetalle || !proveedorGanadorSel) return;
    setProcesandoCot(true);
    try {
      // 1. Create header
      await fetch('http://localhost:3001/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotizacion_id: cotizacionDetalle.id,
          proveedor_id: proveedorGanadorSel
        })
      });

      // 2. Get recent to get ID and numero_orden
      const resRecent = await fetch('http://localhost:3001/api/purchase-orders/recent');
      const jsonRecent = await resRecent.json();
      if (!jsonRecent.data || jsonRecent.data.length === 0) {
        throw new Error('No se pudo recuperar la OC generada.');
      }
      const nuevaOC = jsonRecent.data[0];

      // 3. Create details
      const provSeleccionado = cotizacionDetalle.proveedoresInvitados.find(p => p.proveedorId === proveedorGanadorSel);
      if (!provSeleccionado) throw new Error('Proveedor no encontrado');

      for (const l of cotizacionDetalle.lineas) {
        const oferta = provSeleccionado.ofertas.find(o => o.articulo_id === l.articulo_id);
        const precio = oferta ? oferta.precio_unitario_ofertado : 0; 
        
        await fetch('http://localhost:3001/api/purchase-orders/detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orden_compra_id: nuevaOC.id,
            articulo_id: l.articulo_id,
            cantidad_solicitada: l.cantidad_solicitada,
            precio_unitario: precio
          })
        });
      }

      showToast(`Cotización aprobada. Orden de Compra N° ${nuevaOC.numero_orden} generada en estado Pendiente.`);
      setIsDetalleCotOpen(false);
      cargarCotizaciones();
      cargarOrdenes();
      setActiveTab('ordenes');
    } catch (error) {
      alert(error.message || 'Error al aprobar la cotización.');
    } finally {
      setProcesandoCot(false);
    }
  };

  // ---------------------------------------------------------------------
  // Detalle de OC / recepción
  // ---------------------------------------------------------------------
  const handleAbrirDetalleOC = (oc) => {
    setIsDetalleOCOpen(true);
    setOrdenDetalle(oc);
    const iniciales = {};
    oc.lineas.forEach((l) => {
      iniciales[l.id] = '';
    });
    setCantidadesRecepcion(iniciales);
  };

  const handleConfirmarRecepcion = async () => {
    if (!ordenDetalle) return;
    const recepciones = Object.entries(cantidadesRecepcion)
      .filter(([, valor]) => Number(valor) > 0)
      .map(([id_detalle, valor]) => ({ id_detalle, cant_a_sumar: Number(valor) }));

    if (recepciones.length === 0) {
      alert('Ingresá al menos una cantidad a recibir.');
      return;
    }

    setProcesandoRecepcion(true);
    try {
      const res = await fetch(`http://localhost:3001/api/purchase-orders/${ordenDetalle.id}/receive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detalles: recepciones })
      });
      if (!res.ok) throw new Error('Falló la recepción en el servidor');
      
      showToast(`Orden N° ${ordenDetalle.numeroOrden}: recepción confirmada.`);
      setIsDetalleOCOpen(false); // Close the modal
      cargarOrdenes();
    } catch (error) {
      alert(error.message || 'Error al registrar la recepción.');
    } finally {
      setProcesandoRecepcion(false);
    }
  };

  const handleConfirmarCancelacionOC = async () => {
    if (!ordenACancelar) return;
    try {
      const res = await fetch(`http://localhost:3001/api/purchase-orders/${ordenACancelar.id}/cancel`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error('Falló la cancelación en el servidor');
      showToast(`Orden N° ${ordenACancelar.numeroOrden} cancelada.`);
      setOrdenACancelar(null);
      cargarOrdenes();
    } catch (error) {
      alert(error.message || 'Error al cancelar la orden.');
    }
  };

  // ---------------------------------------------------------------------
  // Filtros y derivados
  // ---------------------------------------------------------------------
  const cotizacionesFiltradas = useMemo(() => {
    return cotizaciones;
  }, [cotizaciones]);

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((oc) => {
      const matchesEstado = filtroEstadoOC === 'todas' || oc.estado === filtroEstadoOC;
      const matchesProveedor = filtroProveedorOC === 'todos' || oc.proveedorId === filtroProveedorOC;
      return matchesEstado && matchesProveedor;
    });
  }, [ordenes, filtroEstadoOC, filtroProveedorOC]);

  const kpiOC = useMemo(
    () => ({
      total: ordenes.length,
      pendientes: ordenes.filter((o) => o.estado === 'Pendiente').length,
      parciales: ordenes.filter((o) => o.estado === 'Parcial').length,
      recibidas: ordenes.filter((o) => o.estado === 'Recibida').length,
    }),
    [ordenes]
  );

  const totalRecepcionando = useMemo(
    () => Object.values(cantidadesRecepcion).reduce((acc, v) => acc + (Number(v) || 0), 0),
    [cantidadesRecepcion]
  );

  return (
    <div>
      {toast && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{toast}</span>
        </div>
      )}

      <div className="section-heading">
        <div>
          <h2>Cotizaciones y Órdenes de Compra</h2>
          <span className="desc">Solicitá cotizaciones a proveedores y formalizá las compras aprobadas</span>
        </div>
        {activeTab === 'cotizaciones' && (
          <button className="btn btn-primary" onClick={handleOpenNuevaCot} disabled={loadingRef}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva cotización
          </button>
        )}
      </div>

      <div className="tab-rail">
        <button className={`tab-btn ${activeTab === 'cotizaciones' ? 'active' : ''}`} onClick={() => setActiveTab('cotizaciones')}>
          Cotizaciones
          {kpiCot.enviadas > 0 && <span className="tab-btn-badge">{kpiCot.enviadas} en curso</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'ordenes' ? 'active' : ''}`} onClick={() => setActiveTab('ordenes')}>
          Órdenes de Compra
          {kpiOC.pendientes + kpiOC.parciales > 0 && (
            <span className="tab-btn-badge">{kpiOC.pendientes + kpiOC.parciales} abiertas</span>
          )}
        </button>
      </div>

      {/* ================================================================ */}
      {/* TAB: COTIZACIONES                                                */}
      {/* ================================================================ */}
      {activeTab === 'cotizaciones' && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-value">{kpiCot.total}</div>
              <div className="stat-label">Cotizaciones generadas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{kpiCot.enviadas}</div>
              <div className="stat-label">Esperando respuesta</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{kpiCot.aprobadas}</div>
              <div className="stat-label">Aprobadas → convertidas en OC</div>
            </div>
          </div>

          <div className="catalog-toolbar">
            <div className="select-field">
              Estado:
              <select value={filtroEstadoCot} onChange={(e) => setFiltroEstadoCot(e.target.value)}>
                <option value="todas">Todas</option>
                <option value="Enviada">Enviada</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Artículos</th>
                    <th>Proveedores invitados</th>
                    <th>Respuestas</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCot ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                        Cargando cotizaciones…
                      </td>
                    </tr>
                  ) : cotizacionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                        No hay cotizaciones para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    cotizacionesFiltradas.map((c) => (
                      <tr key={c.id}>
                        <td>{c.fechaRegistro}</td>
                        <td>{c.cantidadArticulos}</td>
                        <td>{c.cantidadProveedores}</td>
                        <td>
                          {c.cantidadRespuestas} / {c.cantidadProveedores}
                        </td>
                        <td>
                          <span className={`badge ${badgeClassCotizacion(c.estado)}`}>
                            <span className="badge-dot"></span>
                            {c.estado}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => handleAbrirDetalleCot(c)}>
                            Ver detalle
                          </button>
                        </td>
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
      {/* TAB: ÓRDENES DE COMPRA                                           */}
      {/* ================================================================ */}
      {activeTab === 'ordenes' && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-value">{kpiOC.total}</div>
              <div className="stat-label">Órdenes emitidas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{kpiOC.pendientes}</div>
              <div className="stat-label">Pendientes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{kpiOC.parciales}</div>
              <div className="stat-label">Con recepción parcial</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{kpiOC.recibidas}</div>
              <div className="stat-label">Recibidas completas</div>
            </div>
          </div>

          <div className="catalog-toolbar">
            <div className="select-field">
              Estado:
              <select value={filtroEstadoOC} onChange={(e) => setFiltroEstadoOC(e.target.value)}>
                <option value="todas">Todas</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Parcial">Parcial</option>
                <option value="Recibida">Recibida</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
            <div className="select-field">
              Proveedor:
              <select value={filtroProveedorOC} onChange={(e) => setFiltroProveedorOC(e.target.value)}>
                <option value="todos">Todos</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.razonSocial}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>N° de Orden</th>
                    <th>Proveedor</th>
                    <th>Fecha de emisión</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOC ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                        Cargando órdenes de compra…
                      </td>
                    </tr>
                  ) : ordenesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                        No hay órdenes de compra para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    ordenesFiltradas.map((oc) => (
                      <tr key={oc.id}>
                        <td className="cell-mono">#{oc.numeroOrden}</td>
                        <td>{proveedorById.get(oc.proveedorId)?.razonSocial || '—'}</td>
                        <td>{formatearFecha(oc.fechaEmision)}</td>
                        <td>
                          <span className={`badge ${badgeClassOC(oc.estado)}`}>
                            <span className="badge-dot"></span>
                            {oc.estado}
                          </span>
                        </td>
                        <td>{formatearMonto(oc.total)}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => handleAbrirDetalleOC(oc)}>
                              {oc.estado === 'Pendiente' || oc.estado === 'Parcial' ? 'Recepcionar' : 'Ver detalle'}
                            </button>
                            {oc.estado === 'Pendiente' && (
                              <button className="icon-btn" title="Cancelar orden" onClick={() => setOrdenACancelar(oc)}>
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
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
      {/* MODAL: NUEVA COTIZACIÓN                                          */}
      {/* ================================================================ */}
      <Modal
        isOpen={isNuevaCotOpen}
        onClose={() => setIsNuevaCotOpen(false)}
        title="Nueva cotización"
        wide
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsNuevaCotOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={!isNuevaCotValid || submittingCot} onClick={handleSubmitNuevaCot}>
              {submittingCot ? 'Enviando…' : 'Crear y enviar por email'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitNuevaCot}>
          <div className="modal-notice">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Elegí los artículos a reponer y los proveedores a los que se les enviará la solicitud por email.
          </div>

          <div style={{ marginBottom: '10px', fontSize: '12.5px', fontWeight: '600', color: 'var(--gray-800)' }}>
            Artículos a cotizar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {lineasForm.map((linea, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 36px', gap: '10px', alignItems: 'end' }}>
                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px' }}>
                    Artículo #{idx + 1}
                    <span className="req">*</span>
                  </label>
                  <select value={linea.articuloId} onChange={(e) => handleChangeLinea(idx, 'articuloId', e.target.value)} required>
                    <option value="" disabled>
                      Seleccionar artículo…
                    </option>
                    {articulos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.descripcion} {a.modelo ? `(${a.modelo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: '11px' }}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={linea.cantidadSolicitada}
                    onChange={(e) => handleChangeLinea(idx, 'cantidadSolicitada', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Quitar artículo"
                  disabled={lineasForm.length === 1}
                  onClick={() => handleRemoveLinea(idx)}
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
            {articulosDuplicados && (
              <div style={{ fontSize: '12px', color: 'var(--red)' }}>No repitas el mismo artículo en dos líneas.</div>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={handleAddLinea} style={{ alignSelf: 'flex-start' }}>
              + Agregar artículo
            </button>
          </div>

          <div style={{ marginBottom: '8px', fontSize: '12.5px', fontWeight: '600', color: 'var(--gray-800)' }}>
            Enviar solicitud a
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '10px 12px' }}>
            {proveedores.length === 0 ? (
              <span style={{ fontSize: '12.5px', color: 'var(--gray-500)' }}>No hay proveedores activos cargados.</span>
            ) : (
              proveedores.map((p) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={proveedoresSeleccionados.includes(p.id)}
                    onChange={() => toggleProveedorSeleccionado(p.id)}
                  />
                  {p.razonSocial} | CUIT: {p.cuit}
                </label>
              ))
            )}
          </div>
        </form>
      </Modal>

      {/* ================================================================ */}
      {/* MODAL: DETALLE DE COTIZACIÓN                                     */}
      {/* ================================================================ */}
      <Modal
        isOpen={isDetalleCotOpen}
        onClose={() => setIsDetalleCotOpen(false)}
        title="Detalle de cotización"
        xwide
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsDetalleCotOpen(false)}>
              Cerrar
            </button>
            {cotizacionDetalle?.estado === 'Cancelada' ? (
              <button className="btn btn-outline" style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }} onClick={handleRestaurarCotizacion}>
                Cambiar a Pendiente
              </button>
            ) : (
              <button className="btn btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={handleCancelarCotizacion}>
                Cancelar cotización
              </button>
            )}
            {cotizacionDetalle && cotizacionDetalle.proveedoresInvitados.some(cp => cp.estadoRespuesta === 'Pendiente') ? (
              <button className="btn btn-primary" onClick={handleGuardarRespuestas}>
                Guardar Respuestas
              </button>
            ) : (
              <button className="btn btn-primary" disabled={!proveedorGanadorSel || procesandoCot} onClick={handleAprobarCotizacion}>
                {procesandoCot ? 'Generando OC…' : 'Aprobar y generar Orden de Compra'}
              </button>
            )}
          </>
        }
      >
        {!cotizacionDetalle ? (
          <p style={{ color: 'var(--gray-500)', fontSize: '13px' }}>Cargando…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--gray-600)' }}>
                Generada el {cotizacionDetalle.fechaRegistro}
              </span>
              <span className={`badge ${badgeClassCotizacion(cotizacionDetalle.estado)}`}>
                <span className="badge-dot"></span>
                {cotizacionDetalle.estado}
              </span>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: 'var(--gray-800)', fontWeight: '600' }}>
                Artículos solicitados
              </h4>
              <div className="table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>ARTÍCULO</th>
                        <th>CANTIDAD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotizacionDetalle.lineas.map((l) => (
                        <tr key={l.articulo_id}>
                          <td>{articuloById.get(l.articulo_id)?.descripcion || '—'}</td>
                          <td>{l.cantidad_solicitada}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: 'var(--gray-800)', fontWeight: '600' }}>
                Respuestas de proveedores
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cotizacionDetalle.proveedoresInvitados.map((cp) => {
                  const prov = proveedorById.get(cp.proveedorId);
                  
                  // Calculamos el total de este proveedor basado en las ofertas y en lo que hemos ingresado ahora
                  let total = 0;
                  
                  return (
                    <div key={cp.id} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {cp.estadoRespuesta === 'Respondido' && (
                            <input
                              type="radio"
                              name="proveedorGanador"
                              checked={proveedorGanadorSel === cp.proveedorId}
                              onChange={() => setProveedorGanadorSel(cp.proveedorId)}
                            />
                          )}
                          <strong style={{ fontSize: '13px' }}>{prov?.razonSocial || 'Proveedor'}</strong>
                        </div>
                        <span className={`badge ${cp.estadoRespuesta === 'Respondido' ? 'badge-blue' : 'badge-amber'}`}>
                          <span className="badge-dot"></span>
                          {cp.estadoRespuesta}
                        </span>
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <table style={{ width: '100%', fontSize: '12.5px' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', paddingBottom: '8px', color: 'var(--gray-500)', fontWeight: 600 }}>ARTÍCULO</th>
                              <th style={{ textAlign: 'right', paddingBottom: '8px', color: 'var(--gray-500)', fontWeight: 600 }}>PRECIO UNITARIO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cotizacionDetalle.lineas.map((l) => {
                              const artId = l.articulo_id;
                              const art = articuloById.get(artId);
                              const oferta = cp.ofertas.find(o => o.articulo_id === artId);
                              const key = `${cp.id}_${artId}`;
                              const isInputActive = showInputPrecios[key];
                              const val = preciosIngresados[key] || '';
                              
                              if (oferta) {
                                total += Number(oferta.precio_unitario_ofertado) * l.cantidad_solicitada;
                              } else if (val && !isNaN(val)) {
                                total += Number(val) * l.cantidad_solicitada;
                              }
                              
                              return (
                                <tr key={artId}>
                                  <td style={{ padding: '6px 0', borderTop: '1px solid var(--gray-200)' }}>
                                    {art?.descripcion || '—'}
                                  </td>
                                  <td style={{ padding: '6px 0', borderTop: '1px solid var(--gray-200)', textAlign: 'right' }}>
                                    {oferta ? (
                                      <strong>{formatearMonto(oferta.precio_unitario_ofertado)}</strong>
                                    ) : isInputActive ? (
                                      <input 
                                        type="number" 
                                        min="0" 
                                        step="0.01"
                                        placeholder="0.00"
                                        value={val}
                                        onChange={(e) => setPreciosIngresados(prev => ({...prev, [key]: e.target.value}))}
                                        style={{ width: '100px', textAlign: 'right', padding: '4px', border: '1px solid var(--gray-300)', borderRadius: '4px' }}
                                      />
                                    ) : (
                                      <button 
                                        className="btn btn-outline btn-sm" 
                                        onClick={() => setShowInputPrecios(prev => ({...prev, [key]: true}))}
                                      >
                                        Cargar Precio
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        
                        {(cp.estadoRespuesta === 'Respondido' || total > 0) && (
                          <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '700', marginTop: '6px', color: 'var(--black)' }}>
                            Total: {formatearMonto(total)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================ */}
      {/* MODAL: DETALLE DE OC / RECEPCIÓN                                 */}
      {/* ================================================================ */}
      <Modal
        isOpen={isDetalleOCOpen}
        onClose={() => setIsDetalleOCOpen(false)}
        title={ordenDetalle ? `Orden de Compra #${ordenDetalle.numeroOrden}` : 'Orden de Compra'}
        xwide
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setIsDetalleOCOpen(false)}>
              Cerrar
            </button>
            {ordenDetalle && ordenDetalle.estado !== 'Recibida' && ordenDetalle.estado !== 'Cancelada' && (
              <button className="btn btn-primary" disabled={totalRecepcionando <= 0 || procesandoRecepcion} onClick={handleConfirmarRecepcion}>
                {procesandoRecepcion ? 'Registrando…' : 'Confirmar recepción'}
              </button>
            )}
          </>
        }
      >
        {!ordenDetalle ? (
          <p style={{ color: 'var(--gray-500)', fontSize: '13px' }}>Cargando…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', margin: 0 }}>
              <div className="detail-info-item">
                <div className="label">Proveedor</div>
                <div className="value" style={{ fontSize: '13px' }}>
                  {proveedorById.get(ordenDetalle.proveedorId)?.razonSocial || '—'}
                </div>
              </div>
              <div className="detail-info-item">
                <div className="label">Fecha de emisión</div>
                <div className="value" style={{ fontSize: '13px' }}>{formatearFecha(ordenDetalle.fechaEmision)}</div>
              </div>
              <div className="detail-info-item">
                <div className="label">Estado</div>
                <div className="value" style={{ fontSize: '13px' }}>
                  <span className={`badge ${badgeClassOC(ordenDetalle.estado)}`}>
                    <span className="badge-dot"></span>
                    {ordenDetalle.estado}
                  </span>
                </div>
              </div>
            </div>

            {ordenDetalle.estado === 'Recibida' && (
              <div className="modal-notice" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--green)' }}>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Recepción completa. Esta orden ya no admite más recepciones.
              </div>
            )}
            {ordenDetalle.estado === 'Cancelada' && (
              <div className="modal-notice" style={{ background: 'var(--crit-soft)', color: 'var(--crit)' }}>
                Orden cancelada. No admite recepciones.
              </div>
            )}

            <div className="table-panel">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th>Cant. solicitada</th>
                      <th>Cant. recibida</th>
                      <th>Saldo pendiente</th>
                      <th>Precio unit.</th>
                      {ordenDetalle.estado !== 'Recibida' && ordenDetalle.estado !== 'Cancelada' && <th>Recibir ahora</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ordenDetalle.lineas.map((l) => {
                      const saldo = l.cantidad_solicitada - l.cantidad_recibida;
                      return (
                        <tr key={l.id}>
                          <td>{articuloById.get(l.articulo_id)?.descripcion || '—'}</td>
                          <td>{l.cantidad_solicitada}</td>
                          <td>{l.cantidad_recibida}</td>
                          <td>
                            <strong style={{ color: saldo > 0 ? 'var(--amber)' : 'var(--green)' }}>{saldo}</strong>
                          </td>
                          <td>{formatearMonto(l.precio_unitario)}</td>
                          {ordenDetalle.estado !== 'Recibida' && ordenDetalle.estado !== 'Cancelada' && (
                            <td>
                              <input
                                type="number"
                                min="0"
                                max={saldo}
                                disabled={saldo === 0}
                                placeholder="0"
                                value={cantidadesRecepcion[l.id] ?? ''}
                                onChange={(e) =>
                                  setCantidadesRecepcion((prev) => ({ ...prev, [l.id]: e.target.value }))
                                }
                                style={{ width: '80px', border: '1px solid var(--gray-300)', borderRadius: '6px', padding: '6px 8px', fontSize: '13px' }}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '13.5px', fontWeight: '700' }}>
              Total de la orden:{' '}
              {formatearMonto(ordenDetalle.lineas.reduce((acc, l) => acc + l.cantidad_solicitada * l.precio_unitario, 0))}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: CONFIRMAR CANCELACIÓN DE OC */}
      <Modal
        isOpen={!!ordenACancelar}
        onClose={() => setOrdenACancelar(null)}
        title="Cancelar orden de compra"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setOrdenACancelar(null)}>
              Volver
            </button>
            <button className="btn btn-primary" onClick={handleConfirmarCancelacionOC}>
              Confirmar cancelación
            </button>
          </>
        }
      >
        {ordenACancelar && (
          <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', margin: 0 }}>
            ¿Confirmás cancelar la Orden de Compra <strong>#{ordenACancelar.numeroOrden}</strong>? El número de orden no se
            reutiliza aunque se cancele.
          </p>
        )}
      </Modal>
    </div>
  );
}

export default Cotizaciones_ordenes_compra;
