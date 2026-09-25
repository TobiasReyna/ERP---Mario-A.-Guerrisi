import { useState, useEffect, useMemo } from 'react';
import Modal from '../components/Modal';
import { formatearMonto, formatearFechaHora } from '../utils/format';
import {
  listarDepositos,
  obtenerCatalogoPOS,
  crearVentaPendiente,
  obtenerVenta,
  agregarPago,
  confirmarVenta,
  cancelarVenta,
  buscarVentaPorComprobante,
} from '../services/ventaService';
import { buscarClientes, crearCliente } from '../services/clientsService';

const USUARIO_ACTUAL_ID = '00000000-0000-0000-0000-000000000001';

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
];

function Punto_de_Venta() {
  const [depositos, setDepositos] = useState([]);
  const [activeDepositId, setActiveDepositId] = useState(null);

  const [catalogo, setCatalogo] = useState([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState(null);

  // Modal Cliente
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [mostrarAltaCliente, setMostrarAltaCliente] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    razonSocial: '', dni: '', cuit: '', email: '', telefono: '', direccion: '',
  });
  const [creandoCliente, setCreandoCliente] = useState(false);

  // Venta y Cobro
  const [venta, setVenta] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [toast, setToast] = useState(null);

  // Estado del formulario de pago extendido y realista
  const [pagoForm, setPagoForm] = useState({
    metodo: 'efectivo',
    monto: '',
    // Campos realistas específicos
    pagaCon: '',
    marcaTarjeta: 'Visa',
    cuotas: '1',
    numeroCupon: '',
    bancoTransferencia: 'Mercado Pago',
    comprobanteTransf: '',
    plazoCtaCte: '30 días',
  });

  const [modoPago, setModoPago] = useState(false);
  const [modoBuscarVenta, setModoBuscarVenta] = useState(false);
  const [textoBusquedaVenta, setTextoBusquedaVenta] = useState('');
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [buscandoVenta, setBuscandoVenta] = useState(false);
  const [isVentaBuscada, setIsVentaBuscada] = useState(false);

  // Cargar depósitos iniciales
  useEffect(() => {
    listarDepositos().then((data) => {
      setDepositos(data);
      if (data.length > 0) setActiveDepositId(data[0].id);
    });
  }, []);

  // Cargar catálogo según depósito
  useEffect(() => {
    if (!activeDepositId) return;
    setCatalogoLoading(true);
    obtenerCatalogoPOS(activeDepositId)
      .then(setCatalogo)
      .catch((err) => {
        console.error(err);
        setCatalogo([]);
      })
      .finally(() => setCatalogoLoading(false));
  }, [activeDepositId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const categorias = useMemo(() => {
    const set = new Set(catalogo.map((a) => a.categoria).filter(Boolean));
    return Array.from(set);
  }, [catalogo]);

  const catalogoFiltrado = useMemo(() => {
    const texto = searchTerm.trim().toLowerCase();
    return catalogo.filter((a) => {
      const coincideTexto =
        !texto || a.descripcion.toLowerCase().includes(texto) || (a.codigoEan13 || '').includes(texto);
      const coincideCategoria = categoriaFiltro === 'todas' || a.categoria === categoriaFiltro;
      return coincideTexto && coincideCategoria;
    });
  }, [catalogo, searchTerm, categoriaFiltro]);

  const totalCarrito = carrito.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0);

  const saldoPendiente = useMemo(() => {
    if (!venta) return 0;
    const totalPagado = (venta.pagos || []).reduce((acc, p) => acc + Number(p.monto), 0);
    return Math.max(0, Number(venta.total) - totalPagado);
  }, [venta]);

  // Cálculo de vuelto para efectivo
  const vueltoEfectivo = useMemo(() => {
    const entregado = Number(pagoForm.pagaCon) || 0;
    const monto = Number(pagoForm.monto) || 0;
    if (entregado > monto && monto > 0) {
      return entregado - monto;
    }
    return 0;
  }, [pagoForm.pagaCon, pagoForm.monto]);

  // Manejo de Carrito
  const handleAgregarAlCarrito = (articulo) => {
    if (articulo.disponible <= 0) return;
    setCarrito((prev) => {
      const existente = prev.find((it) => it.articuloId === articulo.id);
      if (existente) {
        if (existente.cantidad >= articulo.disponible) return prev;
        return prev.map((it) =>
          it.articuloId === articulo.id ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      }
      return [
        ...prev,
        {
          articuloId: articulo.id,
          descripcion: articulo.descripcion,
          cantidad: 1,
          precioUnitario: articulo.precioActual,
          disponible: articulo.disponible,
        },
      ];
    });
  };

  const handleCambiarCantidad = (articuloId, delta) => {
    setCarrito((prev) =>
      prev
        .map((it) => {
          if (it.articuloId !== articuloId) return it;
          const nuevaCantidad = Math.min(it.disponible, Math.max(0, it.cantidad + delta));
          return { ...it, cantidad: nuevaCantidad };
        })
        .filter((it) => it.cantidad > 0)
    );
  };

  const handleQuitarItem = (articuloId) => {
    setCarrito((prev) => prev.filter((it) => it.articuloId !== articuloId));
  };

  const handleVaciarCarrito = () => {
    if (carrito.length === 0) return;
    if (window.confirm('¿Deseas vaciar todos los productos del carrito?')) {
      setCarrito([]);
    }
  };

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (!isClientModalOpen) return;
    const texto = clientQuery.trim();
    if (texto.length < 2) {
      setClientResults([]);
      return;
    }
    setClientSearchLoading(true);
    const t = setTimeout(() => {
      buscarClientes(texto)
        .then(setClientResults)
        .catch((err) => console.error(err))
        .finally(() => setClientSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery, isClientModalOpen]);

  const handleSeleccionarCliente = (c) => {
    setCliente(c);
    setIsClientModalOpen(false);
    setClientQuery('');
    setClientResults([]);
    setMostrarAltaCliente(false);
    setNuevoClienteForm({ razonSocial: '', dni: '', cuit: '', email: '', telefono: '', direccion: '' });
  };

  const handleAbrirAltaCliente = () => {
    const texto = clientQuery.trim();
    const esNumero = /^\d+$/.test(texto);

    setNuevoClienteForm({
      razonSocial: esNumero ? '' : texto,
      dni: esNumero ? texto : '',
      cuit: '',
      email: '',
      telefono: '',
      direccion: '',
    });
    setMostrarAltaCliente(true);
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();

    const razonSocial = nuevoClienteForm.razonSocial.trim();
    const dni = nuevoClienteForm.dni.trim().replace(/\D/g, '');
    const cuit = nuevoClienteForm.cuit.trim().replace(/\D/g, '');
    const email = nuevoClienteForm.email.trim();
    const telefono = nuevoClienteForm.telefono.trim().replace(/[^\d+\-\s()]/g, '');
    const direccion = nuevoClienteForm.direccion.trim();

    if (!razonSocial) {
      alert('El nombre o razón social es obligatorio.');
      return;
    }
    if (!dni && !cuit) {
      alert('Cargá al menos un DNI o un CUIT.');
      return;
    }
    if (dni && !/^\d{7,8}$/.test(dni)) {
      alert('El DNI debe tener 7 u 8 dígitos sin puntos ni espacios.');
      return;
    }
    if (cuit && !/^\d{11}$/.test(cuit)) {
      alert('El CUIT debe tener 11 dígitos sin guiones.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('El correo electrónico no tiene un formato válido.');
      return;
    }
    if (telefono && !/^[0-9+\-\s()]{6,20}$/.test(telefono)) {
      alert('El teléfono tiene un formato inválido.');
      return;
    }

    setCreandoCliente(true);
    try {
      const nuevo = await crearCliente({
        razonSocial,
        dni: dni || null,
        cuit: cuit || null,
        email: email || null,
        telefono,
        direccion,
      });
      handleSeleccionarCliente(nuevo);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreandoCliente(false);
    }
  };

  const handleCerrarModalCliente = () => {
    setIsClientModalOpen(false);
    setClientQuery('');
    setClientResults([]);
    setMostrarAltaCliente(false);
  };

  // Flujo Operativo de Venta
  const handleIniciarCobro = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    try {
      const nuevaVenta = await crearVentaPendiente({
        depositoId: activeDepositId,
        usuarioId: USUARIO_ACTUAL_ID,
        clienteId: cliente?.id || null,
        items: carrito.map((it) => ({
          articuloId: it.articuloId,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
        })),
      });
      setVenta(nuevaVenta);
      setModoPago(false);
      setIsVentaBuscada(false);
      setTextoBusquedaVenta(nuevaVenta.numeroComprobante || '');
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleBuscarVenta = async () => {
    if (!textoBusquedaVenta.trim()) return;
    setBuscandoVenta(true);
    setErrorBusqueda('');
    try {
      const v = await buscarVentaPorComprobante(textoBusquedaVenta.trim());
      setVenta(v);
      setCliente(v.cliente);
      setCarrito(v.items);
      setModoBuscarVenta(false);
      setModoPago(false);
      setIsVentaBuscada(true);
    } catch (error) {
      setErrorBusqueda(error.message || 'No se encontró una venta asociada al comprobante ingresado.');
    } finally {
      setBuscandoVenta(false);
    }
  };

  // Envío del pago
  const handleAgregarPago = async (e) => {
    e.preventDefault();
    const monto = Number(pagoForm.monto);
    if (!monto || monto <= 0) {
      alert('Ingresá un monto mayor a 0.');
      return;
    }
    setProcesando(true);
    try {
      await agregarPago(venta.ventaId, { metodo: pagoForm.metodo, monto });
      const ventaActualizada = await obtenerVenta(venta.ventaId);
      setVenta(ventaActualizada);
      // Resetear inputs manteniendo método
      setPagoForm((prev) => ({
        ...prev,
        monto: '',
        pagaCon: '',
        numeroCupon: '',
        comprobanteTransf: '',
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarVenta = async () => {
    setProcesando(true);
    try {
      const ventaConfirmada = await confirmarVenta(venta.ventaId);
      setVenta(ventaConfirmada);
      setToast(`Venta confirmada — comprobante ${ventaConfirmada.numeroComprobante}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelarVenta = async () => {
    if (!window.confirm('¿Cancelar esta venta? Se liberará el stock reservado.')) return;
    setProcesando(true);
    try {
      await cancelarVenta(venta.ventaId);
      handleNuevaVenta();
      setToast('Venta cancelada y existencias liberadas.');
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleNuevaVenta = () => {
    setVenta(null);
    setCarrito([]);
    setCliente(null);
    setModoPago(false);
    setModoBuscarVenta(false);
    setTextoBusquedaVenta('');
    setErrorBusqueda('');
    setIsVentaBuscada(false);
  };

  const handleImprimirFactura = () => {
    if (!venta) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Habilitá las ventanas emergentes para imprimir el comprobante.');
      return;
    }

    const ptoVenta = '01';
    const numComprobante = venta.numeroComprobante;
    const fechaObj = new Date(venta.fechaHoraRegistro || venta.fechaHoraReserva || Date.now());
    const fechaEmision = `${String(fechaObj.getDate()).padStart(2, '0')}/${String(fechaObj.getMonth() + 1).padStart(2, '0')}/${fechaObj.getFullYear()}`;

    const razonSocial = venta.cliente ? venta.cliente.razonSocial : 'Consumidor final';
    let docFormat = '—';
    if (venta.cliente) {
      if (venta.cliente.cuit && venta.cliente.cuit.length === 11) {
        const c = venta.cliente.cuit;
        docFormat = `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
      } else if (venta.cliente.dni) {
        docFormat = venta.cliente.dni;
      }
    }
    const domicilio = venta.cliente?.direccion || '—';

    const metodos = [...new Set((venta.pagos || []).map((p) => METODOS_PAGO.find((m) => m.value === p.metodo)?.label || p.metodo))];
    const condicionVenta = metodos.length > 0 ? metodos.join(' / ') : 'Contado';

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${numComprobante}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; font-size: 12px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a365d; padding-bottom: 20px; margin-bottom: 20px; position: relative; }
    .header-left { width: 45%; }
    .header-left h1 { margin: 0 0 10px 0; color: #1a365d; font-size: 24px; }
    .header-left p { margin: 3px 0; color: #555; }
    .header-center { position: absolute; left: 50%; transform: translateX(-50%); text-align: center; }
    .box-b { border: 2px solid #1a365d; color: #1a365d; font-size: 32px; font-weight: bold; width: 50px; height: 50px; line-height: 50px; text-align: center; margin: 0 auto; background: white; }
    .header-right { width: 45%; text-align: right; }
    .header-right h2 { margin: 0 0 10px 0; font-size: 24px; color: #333; }
    .header-right p { margin: 3px 0; color: #555; }
    .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 20px; border-radius: 4px; display: flex; justify-content: space-between; }
    .info-col { width: 48%; }
    .info-col p { margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background-color: #1a365d; color: white; text-align: left; padding: 10px; font-size: 11px; }
    th.right, td.right { text-align: right; }
    th.center, td.center { text-align: center; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .total-box { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .total-inner { background-color: #f1f5f9; padding: 15px 20px; font-weight: bold; font-size: 14px; border-radius: 4px; }
    .footer-notes { border-left: 4px solid #1a365d; padding-left: 15px; background-color: #f8fafc; padding-top: 10px; padding-bottom: 10px; margin-bottom: 30px; }
    .footer-bottom { display: flex; justify-content: space-between; color: #888; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Mario A. Guerrisi</h1>
      <p><strong>Dirección:</strong> San Juan 956, Salta Capital</p>
      <p><strong>Teléfono:</strong> 387 573-0925</p>
      <p><strong>Email:</strong> atencion@marioaguerrisi.com</p>
    </div>
    <div class="header-center"><div class="box-b">B</div></div>
    <div class="header-right">
      <h2>FACTURA</h2>
      <p><strong>Pto. Venta:</strong> ${ptoVenta} - <strong>Nro:</strong> ${numComprobante}</p>
      <p><strong>Fecha:</strong> ${fechaEmision}</p>
      <p><strong>CUIT:</strong> 30-76543210-9</p>
    </div>
  </div>

  <div class="info-box">
    <div class="info-col">
      <p><strong>Señor(es):</strong> ${razonSocial}</p>
      <p><strong>Domicilio:</strong> ${domicilio}</p>
      <p><strong>Condición Venta:</strong> ${condicionVenta}</p>
    </div>
    <div class="info-col">
      <p><strong>DNI / CUIT:</strong> ${docFormat}</p>
      <p><strong>Condición IVA:</strong> Consumidor Final</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width: 10%;">CANT.</th>
        <th style="width: 50%;">DESCRIPCIÓN</th>
        <th class="right" style="width: 20%;">PRECIO UNIT.</th>
        <th class="right" style="width: 20%;">SUBTOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${venta.items.map((it) => `
        <tr>
          <td class="center">${it.cantidad}</td>
          <td>${it.descripcion}</td>
          <td class="right">${formatearMonto(it.precioUnitario)}</td>
          <td class="right">${formatearMonto(it.importeLinea ?? it.cantidad * it.precioUnitario)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-inner">TOTAL: ${formatearMonto(venta.total)}</div>
  </div>

  <div class="footer-notes">
    <p>Gracias por su compra. Documento válido para Consumidor Final.</p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.onafterprint = function() { window.close(); }; }, 500);
    }
  </script>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const enCobro = venta && venta.estado === 'Pendiente';
  const confirmada = venta && venta.estado === 'Confirmada';

  return (
    <div>
      {/* Toast Alert */}
      {toast && (
        <div className="confirm-banner">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{toast}</span>
        </div>
      )}

      {/* Tabs Depósito */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div className="warehouse-tabs" style={{ marginBottom: 0 }}>
          {depositos.map((d) => (
            <button
              key={d.id}
              className={`warehouse-tab ${activeDepositId === d.id ? 'active' : ''}`}
              disabled={!!venta}
              onClick={() => setActiveDepositId(d.id)}
            >
              {d.nombre}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '18px', alignItems: 'start', marginTop: '14px' }}>
        {/* ============================================================== */}
        {/* CATÁLOGO                                                       */}
        {/* ============================================================== */}
        <div>
          <div className="catalog-toolbar">
            <div className="search-input" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Buscar artículo por nombre o EAN…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!!venta}
              />
            </div>
            <div className="select-field">
              Categoría:
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                disabled={!!venta}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: '500' }}
              >
                <option value="todas">Todas</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Precio</th>
                    <th>Disponible</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogoLoading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                        Cargando catálogo…
                      </td>
                    </tr>
                  ) : catalogoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>
                        No hay artículos disponibles.
                      </td>
                    </tr>
                  ) : (
                    catalogoFiltrado.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="cell-strong">{a.descripcion}</div>
                          <div className="cell-sub">{a.categoria}</div>
                        </td>
                        <td className="cell-mono">{formatearMonto(a.precioActual)}</td>
                        <td>
                          <span className={`badge ${a.disponible <= 0 ? 'badge-red' : a.disponible <= 3 ? 'badge-amber' : 'badge-green'}`}>
                            <span className="badge-dot" />
                            {a.disponible} un.
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={!!venta || a.disponible <= 0 || modoBuscarVenta}
                            onClick={() => handleAgregarAlCarrito(a)}
                          >
                            + Agregar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARRITO Y PANEL DE COBRO                                       */}
        {/* ============================================================== */}
        <div>
          {modoBuscarVenta && !venta && (
            <div className="table-panel" style={{ padding: '16px', marginBottom: '14px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: '600', marginBottom: '6px' }}>
                  Buscar comprobante de venta pendiente
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={textoBusquedaVenta}
                    onChange={(e) => setTextoBusquedaVenta(e.target.value)}
                    placeholder="Ej: VTA-00001"
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={handleBuscarVenta} disabled={buscandoVenta}>
                    {buscandoVenta ? 'Buscando…' : 'Cargar'}
                  </button>
                </div>
                {errorBusqueda && (
                  <div style={{ color: 'var(--crit, #dc2626)', fontSize: '12px', marginTop: '8px' }}>
                    {errorBusqueda}
                  </div>
                )}
              </div>
            </div>
          )}

          {!modoBuscarVenta && (
            <>
              {/* Tarjeta Cliente */}
              <div className="table-panel" style={{ padding: '14px 16px', marginBottom: '12px' }}>
                {cliente ? (
                  <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', margin: 0, padding: 0, border: 'none' }}>
                    <div className="detail-info-item">
                      <div className="label">Cliente</div>
                      <div className="value" style={{ fontWeight: '600' }}>{cliente.razonSocial}</div>
                    </div>
                    <div className="detail-info-item">
                      <div className="label">{cliente.dni ? 'DNI' : 'CUIT'}</div>
                      <div className="value">{cliente.dni || cliente.cuit}</div>
                    </div>
                    {!venta && (
                      <button className="btn btn-outline btn-sm" style={{ marginTop: '8px' }} onClick={() => setCliente(null)}>
                        Quitar cliente
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>Consumidor final</div>
                      <div className="cell-sub" style={{ fontSize: '11.5px' }}>Venta directa de mostrador</div>
                    </div>
                    <button className="btn btn-outline btn-sm" disabled={!!venta} onClick={() => setIsClientModalOpen(true)}>
                      Buscar / Crear cliente
                    </button>
                  </div>
                )}
              </div>

              {/* Grilla Carrito */}
              <div className="table-panel">
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color, #e5e7eb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px' }}>
                    Artículos en caja ({(venta ? venta.items : carrito).length})
                  </strong>
                  {!venta && carrito.length > 0 && (
                    <button
                      type="button"
                      onClick={handleVaciarCarrito}
                      style={{ background: 'none', border: 'none', color: 'var(--crit, #dc2626)', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Ítem</th>
                        <th style={{ textAlign: 'center' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                        {!venta && <th style={{ width: '30px' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(venta ? venta.items : carrito).length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                            El carrito está vacío.
                          </td>
                        </tr>
                      ) : (
                        (venta ? venta.items : carrito).map((it) => (
                          <tr key={it.articuloId}>
                            <td className="cell-strong">{it.descripcion}</td>
                            <td style={{ textAlign: 'center' }}>
                              {venta ? (
                                it.cantidad
                              ) : (
                                <div className="row-actions" style={{ justifyContent: 'center' }}>
                                  <button className="icon-btn" onClick={() => handleCambiarCantidad(it.articuloId, -1)}>−</button>
                                  <span style={{ minWidth: '18px', textAlign: 'center' }}>{it.cantidad}</span>
                                  <button className="icon-btn" onClick={() => handleCambiarCantidad(it.articuloId, 1)}>+</button>
                                </div>
                              )}
                            </td>
                            <td className="cell-mono" style={{ textAlign: 'right' }}>
                              {formatearMonto(it.importeLinea ?? it.cantidad * it.precioUnitario)}
                            </td>
                            {!venta && (
                              <td style={{ textAlign: 'center' }}>
                                <button className="icon-btn" onClick={() => handleQuitarItem(it.articuloId)}>
                                  ✕
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Carrito */}
              <div className="stat-card" style={{ marginTop: '12px' }}>
                <div className="stat-value">{formatearMonto(venta ? venta.total : totalCarrito)}</div>
                <div className="stat-label">Total a pagar</div>
              </div>
            </>
          )}

          {/* Botones de acción inicial */}
          {!venta && !modoBuscarVenta && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                disabled={procesando}
                onClick={() => {
                  setModoBuscarVenta(true);
                  setErrorBusqueda('');
                }}
              >
                Cobrar venta
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={carrito.length === 0 || procesando}
                onClick={handleIniciarCobro}
              >
                {procesando ? 'Reservando stock…' : 'Registrar venta'}
              </button>
            </div>
          )}

          {!venta && modoBuscarVenta && (
            <button
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => {
                setModoBuscarVenta(false);
                setErrorBusqueda('');
              }}
            >
              Volver al carrito
            </button>
          )}

          {/* ========================================================== */}
          {/* PASARELA DE COBRO (REALISTA Y DINÁMICA)                    */}
          {/* ========================================================== */}
          {enCobro && (
            <div style={{ marginTop: '14px' }}>
              <div className="modal-notice">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                <span>Reserva válida hasta las {formatearFechaHora(venta.fechaHoraExpiracion)}.</span>
              </div>

              {!modoPago ? (
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleNuevaVenta}>
                    {isVentaBuscada ? 'Volver' : 'Registrar otra'}
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setModoPago(true)}>
                    Pagar ahora
                  </button>
                </div>
              ) : (
                <>
                  {/* Saldo Restante */}
                  <div className="stat-card" style={{ marginBottom: '12px', marginTop: '12px' }}>
                    <div className="stat-value" style={{ color: saldoPendiente > 0.01 ? 'var(--crit, #dc2626)' : 'var(--green, #16a34a)' }}>
                      {formatearMonto(saldoPendiente)}
                    </div>
                    <div className="stat-label">Saldo restante a cobrar</div>
                  </div>

                  {/* Historial de Pagos aplicados */}
                  {(venta.pagos || []).length > 0 && (
                    <div className="table-panel" style={{ marginBottom: '12px' }}>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Medio</th>
                              <th style={{ textAlign: 'right' }}>Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {venta.pagos.map((p) => (
                              <tr key={p.pagoId}>
                                <td>{METODOS_PAGO.find((m) => m.value === p.metodo)?.label || p.metodo}</td>
                                <td className="cell-mono" style={{ textAlign: 'right', fontWeight: '600' }}>
                                  {formatearMonto(p.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* FORMULARIO DINÁMICO SEGÚN MÉTODO DE PAGO */}
                  {saldoPendiente > 0.01 && (
                    <form
                      onSubmit={handleAgregarPago}
                      style={{
                        background: '#f9fafb',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-field" style={{ margin: 0 }}>
                          <label>Medio de pago</label>
                          <select
                            value={pagoForm.metodo}
                            onChange={(e) => setPagoForm({ ...pagoForm, metodo: e.target.value })}
                          >
                            {METODOS_PAGO.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field" style={{ margin: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label>Monto a imputar</label>
                            <button
                              type="button"
                              onClick={() => setPagoForm((prev) => ({ ...prev, monto: saldoPendiente.toFixed(2) }))}
                              style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                            >
                              Saldar total
                            </button>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={saldoPendiente}
                            placeholder={saldoPendiente.toFixed(2)}
                            value={pagoForm.monto}
                            onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      {/* DETALLES ESPECÍFICOS SEGÚN EL MEDIO */}
                      {pagoForm.metodo === 'efectivo' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                          <div className="form-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Paga con billetes de:</label>
                            <input
                              type="number"
                              step="100"
                              placeholder="Ej: 20000"
                              value={pagoForm.pagaCon}
                              onChange={(e) => setPagoForm({ ...pagoForm, pagaCon: e.target.value })}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Vuelto a entregar:</span>
                            <strong style={{ fontSize: '16px', color: vueltoEfectivo > 0 ? '#16a34a' : '#111827' }}>
                              {formatearMonto(vueltoEfectivo)}
                            </strong>
                          </div>
                        </div>
                      )}

                      {(pagoForm.metodo === 'tarjeta_debito' || pagoForm.metodo === 'tarjeta_credito') && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                          <div className="form-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Marca</label>
                            <select
                              value={pagoForm.marcaTarjeta}
                              onChange={(e) => setPagoForm({ ...pagoForm, marcaTarjeta: e.target.value })}
                            >
                              <option>Visa</option>
                              <option>Mastercard</option>
                              <option>Cabal</option>
                              <option>American Express</option>
                            </select>
                          </div>

                          <div className="form-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Nro. Cupón / Lote</label>
                            <input
                              type="text"
                              placeholder="Ej: 0451"
                              value={pagoForm.numeroCupon}
                              onChange={(e) => setPagoForm({ ...pagoForm, numeroCupon: e.target.value })}
                            />
                          </div>

                          <div className="form-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Cuotas</label>
                            <select
                              value={pagoForm.cuotas}
                              disabled={pagoForm.metodo === 'tarjeta_debito'}
                              onChange={(e) => setPagoForm({ ...pagoForm, cuotas: e.target.value })}
                            >
                              <option value="1">1 pago (Débito/Crédito)</option>
                              <option value="3">3 cuotas fijas</option>
                              <option value="6">6 cuotas fijas</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {pagoForm.metodo === 'transferencia' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                          <div className="form-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Entidad / Billetera</label>
                            <select
                              value={pagoForm.bancoTransferencia}
                              onChange={(e) => setPagoForm({ ...pagoForm, bancoTransferencia: e.target.value })}
                            >
                              <option>Mercado Pago</option>
                              <option>Banco Galicia</option>
                              <option>Banco Macro</option>
                              <option>Ualá</option>
                              <option>Naranja X</option>
                            </select>
                          </div>
                          <div className="form-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Nro. de Operación</label>
                            <input
                              type="text"
                              placeholder="Ej: 8945123401"
                              value={pagoForm.comprobanteTransf}
                              onChange={(e) => setPagoForm({ ...pagoForm, comprobanteTransf: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {pagoForm.metodo === 'cuenta_corriente' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                          <div className="form-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Plazo acordado</label>
                            <select
                              value={pagoForm.plazoCtaCte}
                              onChange={(e) => setPagoForm({ ...pagoForm, plazoCtaCte: e.target.value })}
                            >
                              <option>15 días</option>
                              <option>30 días</option>
                              <option>60 días</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: '#6b7280' }}>
                            {cliente ? `Crédito asignado a ${cliente.razonSocial}.` : 'Requiere cliente asociado.'}
                          </div>
                        </div>
                      )}

                      <button type="submit" className="btn btn-primary" disabled={procesando} style={{ width: '100%' }}>
                        + Registrar pago
                      </button>
                    </form>
                  )}

                  {/* Acciones de Cierre */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <button
                      className="btn btn-outline"
                      style={{ color: 'var(--crit, #dc2626)', borderColor: 'var(--crit, #dc2626)' }}
                      disabled={procesando}
                      onClick={handleCancelarVenta}
                    >
                      Cancelar venta
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={procesando || saldoPendiente > 0.01}
                      onClick={handleConfirmarVenta}
                    >
                      {procesando ? 'Confirmando…' : 'Confirmar venta'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL CLIENTE                                                  */}
      {/* ============================================================== */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={handleCerrarModalCliente}
        title={mostrarAltaCliente ? 'Nuevo cliente' : 'Buscar cliente'}
      >
        {mostrarAltaCliente ? (
          <form onSubmit={handleCrearCliente} className="form-row">
            <div className="form-field full">
              <label>Nombre o Razón Social <span className="req">*</span></label>
              <input
                type="text"
                value={nuevoClienteForm.razonSocial}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, razonSocial: e.target.value })}
                autoFocus
                required
              />
            </div>
            <div className="form-field">
              <label>DNI</label>
              <input
                type="text"
                inputMode="numeric"
                value={nuevoClienteForm.dni}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, dni: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="form-field">
              <label>CUIT</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="11 dígitos sin guiones"
                value={nuevoClienteForm.cuit}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, cuit: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="form-field">
              <label>Correo electrónico</label>
              <input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={nuevoClienteForm.email}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, email: e.target.value.trimStart() })}
              />
            </div>
            <div className="form-field">
              <label>Teléfono</label>
              <input
                type="tel"
                value={nuevoClienteForm.telefono}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, telefono: e.target.value.replace(/[^\d+\-\s()]/g, '') })}
              />
            </div>
            <div className="form-field full">
              <label>Dirección</label>
              <input
                type="text"
                value={nuevoClienteForm.direccion}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, direccion: e.target.value })}
              />
            </div>
            <div className="form-field full" style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setMostrarAltaCliente(false)}>
                Volver
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creandoCliente}>
                {creandoCliente ? 'Guardando…' : 'Crear y asociar'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="search-input" style={{ marginBottom: '14px' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, DNI o CUIT (ej: 44)…"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                autoFocus
              />
            </div>

            {clientSearchLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>Buscando…</div>
            ) : clientResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                {clientQuery.trim().length < 2 ? 'Escribí al menos 2 caracteres.' : 'No se encontraron clientes.'}
              </div>
            ) : (
              <div className="table-panel" style={{ marginBottom: '14px' }}>
                <div className="table-scroll">
                  <table>
                    <tbody>
                      {clientResults.map((c) => (
                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => handleSeleccionarCliente(c)}>
                          <td className="cell-strong">{c.razonSocial}</td>
                          <td className="cell-mono">{c.dni || c.cuit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button className="btn btn-outline" style={{ width: '100%' }} onClick={handleAbrirAltaCliente}>
              + Crear cliente nuevo
            </button>
          </>
        )}
      </Modal>

      {/* TICKET FINAL */}
      <Modal
        isOpen={!!confirmada}
        onClose={handleNuevaVenta}
        title={`Comprobante emitido ${confirmada ? venta.numeroComprobante : ''}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={handleImprimirFactura}>Imprimir ticket</button>
            <button className="btn btn-primary" onClick={handleNuevaVenta}>Siguiente venta</button>
          </>
        }
      >
        {confirmada && (
          <div>
            <div className="cell-sub" style={{ marginBottom: '12px' }}>
              {formatearFechaHora(venta.fechaHoraRegistro)} · {cliente ? cliente.razonSocial : 'Consumidor final'}
            </div>
            <div className="table-panel">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Ítem</th>
                      <th style={{ textAlign: 'center' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venta.items.map((it) => (
                      <tr key={it.articuloId}>
                        <td>{it.descripcion}</td>
                        <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                        <td className="cell-mono" style={{ textAlign: 'right' }}>{formatearMonto(it.importeLinea)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="stat-card" style={{ marginTop: '14px' }}>
              <div className="stat-value">{formatearMonto(venta.total)}</div>
              <div className="stat-label">Total pagado</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Punto_de_Venta;