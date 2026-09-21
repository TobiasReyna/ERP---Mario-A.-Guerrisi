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

// Mismo hardcodeo que ya usa Detalle_producto.jsx mientras no exista
// una historia de usuario de login/roles de sesión.
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

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [mostrarAltaCliente, setMostrarAltaCliente] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    razonSocial: '', dni: '', cuit: '', telefono: '', direccion: '',
  });
  const [creandoCliente, setCreandoCliente] = useState(false);

  const [venta, setVenta] = useState(null); // null = todavía armando el carrito
  const [procesando, setProcesando] = useState(false);
  const [pagoForm, setPagoForm] = useState({ metodo: 'efectivo', monto: '' });
  const [toast, setToast] = useState(null);

  const [modoPago, setModoPago] = useState(false);
  const [modoBuscarVenta, setModoBuscarVenta] = useState(false);
  const [textoBusquedaVenta, setTextoBusquedaVenta] = useState('');
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [buscandoVenta, setBuscandoVenta] = useState(false);
  const [isVentaBuscada, setIsVentaBuscada] = useState(false);

  // Cargar depósitos una vez, y elegir el primero por defecto
  useEffect(() => {
    listarDepositos().then((data) => {
      setDepositos(data);
      if (data.length > 0) setActiveDepositId(data[0].id);
    });
  }, []);

  // Recargar catálogo cada vez que cambia el depósito activo
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

  // Autodescarte del banner de confirmación
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

  // --- Cliente ---
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
        .finally(() => setClientSearchLoading(false));
    }, 300); // debounce simple
    return () => clearTimeout(t);
  }, [clientQuery, isClientModalOpen]);

  const handleSeleccionarCliente = (c) => {
    setCliente(c);
    setIsClientModalOpen(false);
    setClientQuery('');
    setClientResults([]);
    setMostrarAltaCliente(false);
    setNuevoClienteForm({ razonSocial: '', dni: '', cuit: '', telefono: '', direccion: '' });
  };

  const handleAbrirAltaCliente = () => {
    const texto = clientQuery.trim();
    setNuevoClienteForm({
      razonSocial: /^\d+$/.test(texto) ? '' : texto,
      dni: /^\d+$/.test(texto) ? texto : '',
      cuit: '',
      telefono: '',
      direccion: '',
    });
    setMostrarAltaCliente(true);
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    if (!nuevoClienteForm.razonSocial.trim()) {
      alert('El nombre es obligatorio.');
      return;
    }
    if (!nuevoClienteForm.dni.trim() && !nuevoClienteForm.cuit.trim()) {
      alert('Cargá al menos un DNI o un CUIT.');
      return;
    }
    setCreandoCliente(true);
    try {
      const nuevoCliente = await crearCliente({
        razonSocial: nuevoClienteForm.razonSocial.trim(),
        dni: nuevoClienteForm.dni.trim() || null,
        cuit: nuevoClienteForm.cuit.trim() || null,
        telefono: nuevoClienteForm.telefono.trim(),
        direccion: nuevoClienteForm.direccion.trim(),
      });
      handleSeleccionarCliente(nuevoCliente);
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

  // --- Flujo de venta ---
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
      setErrorBusqueda(error.message || 'No se encontró una venta asociada con el número de comprobante ingresado');
    } finally {
      setBuscandoVenta(false);
    }
  };

  const saldoPendiente = venta
    ? venta.total - (venta.pagos || []).reduce((acc, p) => acc + p.monto, 0)
    : 0;

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
      setPagoForm({ metodo: 'efectivo', monto: '' });
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
    if (!window.confirm('¿Cancelar esta venta? Se libera el stock reservado.')) return;
    setProcesando(true);
    try {
      await cancelarVenta(venta.ventaId);
      setVenta(null);
      setCarrito([]);
      setCliente(null);
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
      alert('Por favor, permite las ventanas emergentes (pop-ups) para imprimir la factura.');
      return;
    }

    const ptoVenta = venta.depositoId === 'bf975c47-946f-406c-bb0e-a41dbe656df4' ? '01' : '02';
    const numComprobante = venta.numeroComprobante;
    
    // Formatear fecha DD/MM/AAAA
    const fechaObj = new Date(venta.fechaHoraReserva);
    const fechaEmision = `${String(fechaObj.getDate()).padStart(2, '0')}/${String(fechaObj.getMonth() + 1).padStart(2, '0')}/${fechaObj.getFullYear()}`;

    // Datos del cliente
    const razonSocial = venta.cliente ? venta.cliente.razonSocial : 'Consumidor final';
    let docFormat = '';
    if (venta.cliente) {
      if (venta.cliente.cuit && venta.cliente.cuit.length === 11) {
        const c = venta.cliente.cuit;
        docFormat = `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
      } else if (venta.cliente.dni) {
        docFormat = venta.cliente.dni;
      }
    }
    const domicilio = venta.cliente?.direccion || '—';

    // Condición de Venta
    const metodos = [...new Set((venta.pagos || []).map(p => METODOS_PAGO.find(m => m.value === p.metodo)?.label || p.metodo))];
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
    .footer-notes h4 { margin: 0 0 5px 0; color: #1a365d; }
    .footer-notes p { margin: 3px 0; color: #555; }
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
    <div class="header-center">
      <div class="box-b">B</div>
    </div>
    <div class="header-right">
      <h2>FACTURA</h2>
      <p><strong>Punto de Venta:</strong> ${ptoVenta} - <strong>Comp. Nro:</strong> ${numComprobante}</p>
      <p><strong>Fecha de Emisión:</strong> ${fechaEmision}</p>
      <p><strong>CUIT:</strong> 30-76543210-9</p>
      <p><strong>Ingresos Brutos:</strong> 917-30765432109-1</p>
      <p><strong>Inicio de Actividades:</strong> 15/09/1959</p>
    </div>
  </div>

  <div class="info-box">
    <div class="info-col">
      <p><strong>Señor(es):</strong> ${razonSocial}</p>
      <p><strong>Domicilio:</strong> ${domicilio}</p>
      <p><strong>Condición de Venta:</strong> ${condicionVenta}</p>
    </div>
    <div class="info-col">
      <p><strong>DNI / CUIT:</strong> ${docFormat}</p>
      <p><strong>Condición:</strong> Consumidor Final</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width: 10%;">CANT.</th>
        <th style="width: 50%;">DESCRIPCIÓN DEL PRODUCTO O SERVICIO</th>
        <th class="right" style="width: 20%;">PRECIO UNIT.</th>
        <th class="right" style="width: 20%;">SUBTOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${venta.items.map(it => `
        <tr>
          <td class="center">${it.cantidad}</td>
          <td>${it.descripcion}</td>
          <td class="right">${formatearMonto(it.precioUnitario)}</td>
          <td class="right">${formatearMonto(it.importeLinea)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-inner">
      TOTAL A PAGAR &nbsp;&nbsp;&nbsp;&nbsp; ${formatearMonto(venta.total)}
    </div>
  </div>

  <div class="footer-notes">
    <h4>Notas Adicionales:</h4>
    <p>Gracias por su compra.</p>
    <p>La presente factura es un documento válido como comprobante de compra para Consumidor Final.</p>
  </div>

  <div class="footer-bottom">
    <div>Mario A. Guerrisi - Documento no válido como factura electrónica (Modelo)</div>
    <div>Página 1</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 500);
    }
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const enCobro = venta && venta.estado === 'Pendiente';
  const confirmada = venta && venta.estado === 'Confirmada';

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

      {/* Selector de depósito: fila propia porque no hay filtros/tabs debajo mientras se arma el carrito */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '12px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '18px', alignItems: 'start', marginTop: '18px' }}>
        {/* COLUMNA IZQUIERDA: catálogo */}
        <div>
          <div className="catalog-toolbar">
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre o EAN…"
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
                style={{ border: 'none', outline: 'none', background: 'transparent' }}
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {catalogoLoading ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>Cargando catálogo…</td></tr>
                  ) : catalogoFiltrado.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)' }}>No se encontraron artículos para los filtros seleccionados.</td></tr>
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
                            <span className="badge-dot"></span>
                            {a.disponible}
                          </span>
                        </td>
                        <td>
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

        {/* COLUMNA DERECHA: cliente + carrito + cobro */}
        <div>
          {modoBuscarVenta && !venta && (
            <div className="table-panel" style={{ padding: '16px 18px', marginBottom: '14px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>Ingrese numero de comprobante de venta</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={textoBusquedaVenta}
                    onChange={(e) => setTextoBusquedaVenta(e.target.value)}
                    placeholder="Ej: VTA-00001"
                  />
                  <button className="btn btn-primary" onClick={handleBuscarVenta} disabled={buscandoVenta}>
                    Buscar
                  </button>
                </div>
                {errorBusqueda && (
                  <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '8px' }}>
                    {errorBusqueda}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cliente, Carrito y Total */}
          {!modoBuscarVenta && (
            <>
              {/* Cliente */}
              <div className="table-panel" style={{ padding: '16px 18px', marginBottom: '14px' }}>
                {cliente ? (
                  <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', margin: 0, padding: 0, border: 'none' }}>
                    <div className="detail-info-item">
                      <div className="label">Cliente</div>
                      <div className="value">{cliente.razonSocial}</div>
                    </div>
                    <div className="detail-info-item">
                      <div className="label">{cliente.dni ? 'DNI' : 'CUIT'}</div>
                      <div className="value">{cliente.dni || cliente.cuit}</div>
                    </div>
                    {!venta && (
                      <button className="btn btn-outline btn-sm" style={{ marginTop: '10px' }} onClick={() => setCliente(null)}>
                        Quitar cliente
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="cell-sub" style={{ marginBottom: '10px' }}>Consumidor final (sin cliente asociado)</div>
                    <button className="btn btn-outline btn-sm" disabled={!!venta} onClick={() => setIsClientModalOpen(true)}>
                      Buscar cliente
                    </button>
                  </>
                )}
              </div>

              {/* Carrito */}
              <div className="table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Ítem</th>
                        <th>Cant.</th>
                        <th>Subtotal</th>
                        {!venta && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(venta ? venta.items : carrito).length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>El carrito está vacío.</td></tr>
                      ) : (
                        (venta ? venta.items : carrito).map((it) => (
                          <tr key={it.articuloId}>
                            <td className="cell-strong">{it.descripcion}</td>
                            <td>
                              {venta ? (
                                it.cantidad
                              ) : (
                                <div className="row-actions">
                                  <button className="icon-btn" onClick={() => handleCambiarCantidad(it.articuloId, -1)}>−</button>
                                  <span>{it.cantidad}</span>
                                  <button className="icon-btn" onClick={() => handleCambiarCantidad(it.articuloId, 1)}>+</button>
                                </div>
                              )}
                            </td>
                            <td className="cell-mono">{formatearMonto((it.importeLinea ?? it.cantidad * it.precioUnitario))}</td>
                            {!venta && (
                              <td>
                                <div className="row-actions">
                                  <button className="icon-btn" onClick={() => handleQuitarItem(it.articuloId)}>
                                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="stat-card" style={{ marginTop: '14px' }}>
                <div className="stat-value">{formatearMonto(venta ? venta.total : totalCarrito)}</div>
                <div className="stat-label">Total de la venta</div>
              </div>
            </>
          )}

          {/* Acción según el estado */}
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
              style={{ width: '100%', marginTop: '14px' }}
              onClick={() => {
                setModoBuscarVenta(false);
                setErrorBusqueda('');
              }}
            >
              Volver
            </button>
          )}

          {enCobro && (
            <div style={{ marginTop: '14px' }}>
              <div className="modal-notice">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                <span>Stock reservado hasta las {formatearFechaHora(venta.fechaHoraExpiracion)}.</span>
              </div>

              {!modoPago ? (
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleNuevaVenta}>
                    {isVentaBuscada ? 'Volver' : 'Registrar otra venta'}
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setModoPago(true)}>
                    Pagar ahora
                  </button>
                </div>
              ) : (
                <>
                  <div className="stat-card" style={{ marginBottom: '14px', marginTop: '14px' }}>
                    <div className="stat-value" style={{ color: saldoPendiente > 0.01 ? 'var(--crit)' : 'var(--green)' }}>
                      {formatearMonto(saldoPendiente)}
                    </div>
                    <div className="stat-label">Saldo pendiente</div>
                  </div>

                  {(venta.pagos || []).length > 0 && (
                    <div className="table-panel" style={{ marginBottom: '14px' }}>
                      <div className="table-scroll">
                        <table>
                          <thead><tr><th>Método</th><th>Monto</th></tr></thead>
                          <tbody>
                            {venta.pagos.map((p) => (
                              <tr key={p.pagoId}>
                                <td>{METODOS_PAGO.find((m) => m.value === p.metodo)?.label || p.metodo}</td>
                                <td className="cell-mono">{formatearMonto(p.monto)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {saldoPendiente > 0.01 && (
                    <form onSubmit={handleAgregarPago} className="form-row" style={{ marginBottom: 0 }}>
                      <div className="form-field">
                        <label>Método de pago</label>
                        <select
                          value={pagoForm.metodo}
                          onChange={(e) => setPagoForm({ ...pagoForm, metodo: e.target.value })}
                        >
                          {METODOS_PAGO.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Monto</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={saldoPendiente.toFixed(2)}
                          value={pagoForm.monto}
                          onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
                        />
                      </div>
                      <div className="form-field full">
                        <button type="submit" className="btn btn-outline" disabled={procesando}>
                          + Agregar pago
                        </button>
                      </div>
                    </form>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <button
                      className="btn btn-outline"
                      style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
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
                      Confirmar venta
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de búsqueda de cliente (HU-20) */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={handleCerrarModalCliente}
        title={mostrarAltaCliente ? 'Nuevo cliente' : 'Buscar cliente'}
      >
        {mostrarAltaCliente ? (
          <form onSubmit={handleCrearCliente} className="form-row">
            <div className="form-field full">
              <label>Nombre <span className="req">*</span></label>
              <input
                type="text"
                value={nuevoClienteForm.razonSocial}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, razonSocial: e.target.value })}
                autoFocus
              />
            </div>
            <div className="form-field">
              <label>DNI</label>
              <input
                type="text"
                inputMode="numeric"
                value={nuevoClienteForm.dni}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, dni: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>CUIT</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="11 dígitos, sin guiones"
                value={nuevoClienteForm.cuit}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, cuit: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Teléfono</label>
              <input
                type="text"
                value={nuevoClienteForm.telefono}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, telefono: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Dirección</label>
              <input
                type="text"
                value={nuevoClienteForm.direccion}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, direccion: e.target.value })}
              />
            </div>
            <div className="form-field full" style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setMostrarAltaCliente(false)}>
                Volver a buscar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creandoCliente}>
                {creandoCliente ? 'Creando…' : 'Crear y seleccionar'}
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
                placeholder="Nombre, DNI o CUIT…"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                autoFocus
              />
            </div>
            {clientSearchLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>Buscando…</div>
            ) : clientResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                {clientQuery.trim().length < 2 ? 'Escribí al menos 2 caracteres.' : 'Sin resultados.'}
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

      {/* Ticket final, tras confirmar */}
      <Modal
        isOpen={!!confirmada}
        onClose={handleNuevaVenta}
        title={`Comprobante ${confirmada ? venta.numeroComprobante : ''}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={handleImprimirFactura}>Imprimir</button>
            <button className="btn btn-primary" onClick={handleNuevaVenta}>Nueva venta</button>
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
                  <thead><tr><th>Ítem</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {venta.items.map((it) => (
                      <tr key={it.articuloId}>
                        <td>{it.descripcion}</td>
                        <td>{it.cantidad}</td>
                        <td className="cell-mono">{formatearMonto(it.importeLinea)}</td>
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
