import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Modal from '../components/Modal';
import { formatearMonto, formatearFechaHora } from '../utils/format';
import {
  listarDepositos,
  listarListasPrecios,
  obtenerCatalogoPOS,
  crearVentaPendiente,
  obtenerVenta,
  agregarPago,
  confirmarVenta,
  cancelarVenta,
  buscarVentaPorComprobante,
  listarVentasConfirmadas,
} from '../services/ventaService';
import { buscarClientes, crearCliente } from '../services/clientsService';
import { obtenerSesionActiva, obtenerResumenCaja } from '../services/cajaService';
import MovimientoCajaModal from '../components/MovimientoCajaModal';
import { USUARIO_ACTUAL_ID } from '../config/sesion';


const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'transferencia', label: 'Transferencia' },
];

// ── VALIDACIONES AFIP Y FORMATO ──────────────────────────────────────────────

function validarCUIT(cuit) {
  const limpio = String(cuit || '').replace(/\D/g, '');
  if (limpio.length !== 11) return false;

  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(limpio[i], 10) * factores[i];
  }

  const resto = suma % 11;
  let digitoVerificador = 11 - resto;
  if (digitoVerificador === 11) digitoVerificador = 0;
  if (digitoVerificador === 10) digitoVerificador = 9;

  return digitoVerificador === parseInt(limpio[10], 10);
}

function validarDNI(dni) {
  const limpio = String(dni || '').replace(/\D/g, '');
  return limpio.length >= 7 && limpio.length <= 8 && Number(limpio) >= 1000000;
}

function validarEmail(email) {
  if (!email || !email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validarTelefono(tel) {
  if (!tel || !tel.trim()) return true;
  const limpio = String(tel).replace(/\D/g, '');
  return limpio.length >= 8 && limpio.length <= 15;
}

// ── IMPRESIÓN OFICIAL AFIP ──────────────────────────────────────────────────
function imprimirFacturaHTML(venta, ultimoVuelto = null) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, habilitá las ventanas emergentes para imprimir la factura.');
    return;
  }

  const ptoVenta = '0001';
  const numComprobante = venta.numeroComprobante || 'VTA-00001';
  const numSolo = numComprobante.replace(/\D/g, '').padStart(8, '0');

  const fechaObj = new Date(venta.fechaHoraRegistro || venta.fechaHoraReserva || Date.now());
  const fechaEmision = `${String(fechaObj.getDate()).padStart(2, '0')}/${String(fechaObj.getMonth() + 1).padStart(2, '0')}/${fechaObj.getFullYear()}`;
  const horaEmision = `${String(fechaObj.getHours()).padStart(2, '0')}:${String(fechaObj.getMinutes()).padStart(2, '0')} hs`;

  const vtoCaeObj = new Date(fechaObj);
  vtoCaeObj.setDate(vtoCaeObj.getDate() + 10);
  const fechaVtoCae = `${String(vtoCaeObj.getDate()).padStart(2, '0')}/${String(vtoCaeObj.getMonth() + 1).padStart(2, '0')}/${vtoCaeObj.getFullYear()}`;

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
  const telefono = venta.cliente?.telefono || '—';
  const email = venta.cliente?.email || '—';

  const metodos = [...new Set((venta.pagos || []).map((p) => p.metodo || p))];
  const condicionVenta = metodos.length > 0 ? metodos.join(' / ') : 'Contado';

  const total = Number(venta.total) || 0;
  const netoGravado = total / 1.21;
  const ivaContenido = total - netoGravado;
  const caeSimulado = `7438${String(total).replace('.', '').slice(0, 4).padStart(4, '0')}9281`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${numComprobante}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #1f2937; font-size: 12px; line-height: 1.4; }
    .invoice-card { border: 1.5px solid #111; padding: 20px; max-width: 800px; margin: 0 auto; background: #fff; }
    .header { display: flex; justify-content: space-between; position: relative; border-bottom: 2px solid #111; padding-bottom: 16px; }
    .header-left { width: 44%; }
    .header-left h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #000; letter-spacing: -0.5px; }
    .header-left p { margin: 2px 0; font-size: 11px; color: #4b5563; }
    .header-center { position: absolute; left: 50%; transform: translateX(-50%); top: 0; text-align: center; }
    .box-letter { border: 2px solid #000; width: 44px; height: 44px; line-height: 44px; font-size: 26px; font-weight: 900; background: #fff; margin: 0 auto; }
    .box-code { font-size: 9px; font-weight: 700; margin-top: 3px; letter-spacing: 0.5px; }
    .header-right { width: 44%; text-align: right; }
    .header-right h2 { margin: 0 0 4px 0; font-size: 18px; font-weight: 800; }
    .header-right p { margin: 2px 0; font-size: 11px; color: #4b5563; }
    .client-box { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; border-bottom: 1px solid #e5e7eb; padding: 10px 14px; margin-bottom: 16px; background: #fafafa; border-radius: 4px; }
    .client-box p { margin: 3px 0; font-size: 11.5px; }
    .client-box strong { color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f3f4f6; color: #374151; font-size: 10.5px; font-weight: 700; text-transform: uppercase; padding: 8px 10px; border-top: 1px solid #111; border-bottom: 1px solid #111; }
    td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11.5px; }
    td.right, th.right { text-align: right; }
    td.center, th.center { text-align: center; }
    .mono { font-family: monospace; font-size: 11.5px; }
    .totals-area { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .totals-legal { font-size: 10.5px; color: #6b7280; max-width: 50%; }
    .totals-box { width: 45%; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 11.5px; }
    .total-row.main { background: #111; color: #fff; font-size: 14px; font-weight: 800; padding: 10px 12px; }
    .afip-footer { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #111; padding-top: 14px; margin-top: 10px; }
    .afip-qr { display: flex; align-items: center; gap: 12px; }
    .afip-qr img { width: 75px; height: 75px; }
    .afip-brand { font-size: 13px; font-weight: 900; letter-spacing: -0.5px; color: #000; }
    .afip-cae-box { text-align: right; font-size: 11.5px; }
    .afip-cae-box strong { font-size: 12px; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="header-left">
        <h1>Mario A. Guerrisi</h1>
        <p><strong>Razón Social:</strong> Mario A. Guerrisi e Hijos S.R.L.</p>
        <p><strong>Dirección:</strong> San Juan 956, Salta Capital (CP 4400)</p>
        <p><strong>Teléfono:</strong> (0387) 573-0925</p>
        <p><strong>Email:</strong> atencion@marioaguerrisi.com</p>
        <p><strong>IVA:</strong> Responsable Inscripto</p>
      </div>

      <div class="header-center">
        <div class="box-letter">B</div>
        <div class="box-code">COD. 006</div>
      </div>

      <div class="header-right">
        <h2>FACTURA</h2>
        <p><strong>Punto de Venta:</strong> ${ptoVenta} &nbsp; <strong>Comp. Nro:</strong> ${numSolo}</p>
        <p><strong>Fecha de Emisión:</strong> ${fechaEmision} (${horaEmision})</p>
        <p><strong>CUIT:</strong> 30-76543210-9</p>
        <p><strong>Ingresos Brutos:</strong> 917-30765432109-1</p>
        <p><strong>Inicio de Actividades:</strong> 15/09/1959</p>
      </div>
    </div>

    <div class="client-box">
      <div>
        <p><strong>Cliente:</strong> ${razonSocial}</p>
        <p><strong>DNI / CUIT:</strong> ${docFormat}</p>
        <p><strong>Condición IVA:</strong> Consumidor Final</p>
        <p><strong>Domicilio:</strong> ${domicilio}</p>
      </div>
      <div>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Condición de Venta:</strong> ${condicionVenta}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 8%;">Cant.</th>
          <th>Descripción</th>
          <th class="right" style="width: 18%;">Precio Unit.</th>
          <th class="right" style="width: 18%;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${(venta.items || []).map(it => `
          <tr>
            <td class="center mono">${it.cantidad}</td>
            <td><strong>${it.descripcion}</strong></td>
            <td class="right mono">$${Number(it.precioUnitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td class="right mono">$${(Number(it.cantidad) * Number(it.precioUnitario)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-area">
      <div class="totals-legal">
        <p><strong>Régimen de Transparencia Fiscal:</strong></p>
        <p>IVA 21% incluido estimado: $${ivaContenido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        <p>Neto gravado estimado: $${netoGravado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        ${ultimoVuelto && ultimoVuelto.vuelto > 0 ? `
          <p style="margin-top: 8px; font-weight: bold; color: #16a34a;">
            Operación en Efectivo: Entregó $${ultimoVuelto.entrego.toLocaleString('es-AR', { minimumFractionDigits: 2 })} — Vuelto: $${ultimoVuelto.vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        ` : ''}
      </div>

      <div class="totals-box">
        <div class="total-row">
          <span>Subtotal:</span>
          <span class="mono">$${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="total-row main">
          <span>TOTAL:</span>
          <span class="mono">$${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    <div class="afip-footer">
      <div class="afip-qr">
        <img 
          src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify({ ver:1, fecha:fechaEmision, cuit:30765432109, ptoVta:1, tipoCmp:6, nroCmp:numSolo, importe:total, cae:caeSimulado }))}" 
          alt="QR AFIP"
        />
        <div>
          <div class="afip-brand">ARCA / AFIP</div>
          <div style="font-size: 10px; color: #4b5563;">Comprobante Autorizado</div>
        </div>
      </div>

      <div class="afip-cae-box">
        <p style="margin: 2px 0;"><strong>CAE Nº:</strong> <span class="mono">${caeSimulado}</span></p>
        <p style="margin: 2px 0;"><strong>Fecha de Vto. de CAE:</strong> <span class="mono">${fechaVtoCae}</span></p>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
function Punto_de_Venta() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // HU-26: el POS solo se habilita con una sesión de caja abierta.
  // undefined = verificando · null = caja cerrada (se redirige) · objeto = sesión activa
  const [sesionCaja, setSesionCaja] = useState(undefined);
  const [errorCaja, setErrorCaja] = useState('');
  const [reintentoCaja, setReintentoCaja] = useState(0);

  // HU-27: saldo teórico de efectivo del turno + ventana de movimientos manuales
  const [resumenCaja, setResumenCaja] = useState(null);
  const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
  const refrescarResumenCaja = useCallback(() => {
    obtenerResumenCaja(USUARIO_ACTUAL_ID).then(setResumenCaja).catch(() => {});
  }, []);
  const nroACobrar = searchParams.get('cobrar');

  const searchInputRef = useRef(null);
  const efectivoInputRef = useRef(null);

  const [depositos, setDepositos] = useState([]);
  const [depositoElegidoId, setActiveDepositId] = useState(null);
  // HU-26: con la caja abierta, la sucursal queda fija en la de la caja (no se puede cambiar).
  const depositoCajaId = sesionCaja?.depositoId || null;
  const activeDepositId = depositoCajaId || depositoElegidoId;

  const [catalogo, setCatalogo] = useState([]);

  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [listasPrecios, setListasPrecios] = useState([]);
  const [listaPrecioId, setListaPrecioId] = useState(''); // '' = precio base

  // Descuentos
  const [descuentoPorc, setDescuentoPorc] = useState(0);
  const [descuentoCustom, setDescuentoCustom] = useState('');
  const [mostrarCustomDesc, setMostrarCustomDesc] = useState(false);

  // Modal Cliente
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [mostrarAltaCliente, setMostrarAltaCliente] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    razonSocial: '', dni: '', cuit: '', email: '', telefono: '', direccion: '',
  });
  const [clientErrors, setClientErrors] = useState({});
  const [creandoCliente, setCreandoCliente] = useState(false);

  // Venta y Cobro
  const [venta, setVenta] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [toast, setToast] = useState(null);

  // Formulario de Pago
  const [pagoForm, setPagoForm] = useState({
    metodo: 'efectivo',
    monto: '',
    pagaCon: '',
    marcaTarjeta: 'Visa',
    cuotas: '1',
    numeroCupon: '',
    bancoTransferencia: 'Mercado Pago',
    comprobanteTransf: '',
  });

  const [esPagoParcial, setEsPagoParcial] = useState(false);
  const [ultimoVuelto, setUltimoVuelto] = useState(null);

  // Ventas Pendientes y Búsqueda
  const [ventasPendientes, setVentasPendientes] = useState([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [modoPago, setModoPago] = useState(false);
  const [modoBuscarVenta, setModoBuscarVenta] = useState(false);
  const [textoBusquedaVenta, setTextoBusquedaVenta] = useState('');
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [buscandoVenta, setBuscandoVenta] = useState(false);
  const [isVentaBuscada, setIsVentaBuscada] = useState(false);

  const [busquedaArt, setBusquedaArt] = useState('');
  const [artSeleccionado, setArtSeleccionado] = useState(null);
  const [cantidadForm, setCantidadForm] = useState('1');
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);

  // ── ESTADOS DERIVADOS ──────────────────────────────────────────────────────
  const enCobro = Boolean(venta && venta.estado === 'Pendiente');
  const confirmada = Boolean(venta && venta.estado === 'Confirmada');

  // Lista de precios elegida: ajusta el precio base de cada línea por un porcentaje.
  // El carrito guarda siempre el precio BASE; el precio de lista se deriva acá.
  const listaActiva = useMemo(
    () => listasPrecios.find((l) => l.id === listaPrecioId) || null,
    [listasPrecios, listaPrecioId]
  );
  const porcentajeLista = !venta && listaActiva ? listaActiva.porcentaje : 0;
  const aplicarLista = useCallback(
    (precioBase) => Math.round(Number(precioBase) * (1 + porcentajeLista / 100) * 100) / 100,
    [porcentajeLista]
  );
  const carritoConLista = useMemo(
    () => carrito.map((it) => ({ ...it, precioUnitario: aplicarLista(it.precioUnitario) })),
    [carrito, aplicarLista]
  );

  const subtotalBrutoCarrito = useMemo(() => {
    return carritoConLista.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0);
  }, [carritoConLista]);

  const porcentajeEfectivo = useMemo(() => {
    if (mostrarCustomDesc) {
      const num = Number(descuentoCustom) || 0;
      return Math.min(100, Math.max(0, num));
    }
    return descuentoPorc;
  }, [mostrarCustomDesc, descuentoCustom, descuentoPorc]);

  const montoDescuentoCalculado = useMemo(() => {
    if (porcentajeEfectivo <= 0) return 0;
    return (subtotalBrutoCarrito * porcentajeEfectivo) / 100;
  }, [subtotalBrutoCarrito, porcentajeEfectivo]);

  const totalCarritoConDescuento = useMemo(() => {
    return Math.max(0, subtotalBrutoCarrito - montoDescuentoCalculado);
  }, [subtotalBrutoCarrito, montoDescuentoCalculado]);

  const saldoPendiente = useMemo(() => {
    if (!venta) return 0;
    const totalPagado = (venta.pagos || []).reduce((acc, p) => acc + Number(p.monto), 0);
    return Math.max(0, Number(venta.total) - totalPagado);
  }, [venta]);

  const montoCobro = useMemo(() => {
    if (esPagoParcial && pagoForm.monto !== '') {
      return Number(pagoForm.monto) || 0;
    }
    return saldoPendiente;
  }, [esPagoParcial, pagoForm.monto, saldoPendiente]);

  const dineroEntregado = Number(pagoForm.pagaCon) || 0;

  const vueltoEfectivo = useMemo(() => {
    if (dineroEntregado > montoCobro && montoCobro > 0) {
      return dineroEntregado - montoCobro;
    }
    return 0;
  }, [dineroEntregado, montoCobro]);

  const faltaEfectivo = useMemo(() => {
    if (dineroEntregado > 0 && dineroEntregado < montoCobro) {
      return montoCobro - dineroEntregado;
    }
    return 0;
  }, [dineroEntregado, montoCobro]);

  const pendientesFiltradas = useMemo(() => {
    const q = textoBusquedaVenta.trim().toLowerCase();
    if (!q) return ventasPendientes;
    return ventasPendientes.filter(
      (v) =>
        (v.numeroComprobante || '').toLowerCase().includes(q) ||
        (v.cliente || '').toLowerCase().includes(q)
    );
  }, [ventasPendientes, textoBusquedaVenta]);

  // ── FUNCIÓN REUTILIZABLE: RECARGA DE CATÁLOGO (STOCK EN VIVO) ─────────────
  const cargarCatalogo = useCallback(() => {
    if (!activeDepositId) return;
    obtenerCatalogoPOS(activeDepositId)
      .then(setCatalogo)
      .catch((err) => {
        console.error('[POS] Error al cargar catálogo:', err);
        setCatalogo([]);
      });
  }, [activeDepositId]);

  const abrirPasarelaCobro = useCallback((ventaActiva) => {
    const totalPagado = (ventaActiva.pagos || []).reduce((acc, p) => acc + Number(p.monto), 0);
    const saldo = Math.max(0, Number(ventaActiva.total) - totalPagado);
    setModoPago(true);
    setEsPagoParcial(false);
    setPagoForm({
      metodo: 'efectivo',
      monto: saldo > 0 ? saldo.toFixed(2) : '',
      pagaCon: '',
      marcaTarjeta: 'Visa',
      cuotas: '1',
      numeroCupon: '',
      bancoTransferencia: 'Mercado Pago',
      comprobanteTransf: '',
    });
  }, []);

  const handleCerrarModalCliente = useCallback(() => {
    setIsClientModalOpen(false);
    setClientQuery('');
    setClientResults([]);
    setMostrarAltaCliente(false);
    setClientErrors({});
  }, []);

  const cargarPendientes = useCallback(async () => {
    setLoadingPendientes(true);
    try {
      const todas = await listarVentasConfirmadas();
      const pendientes = (todas || []).filter((v) => v.estado === 'Pendiente');
      setVentasPendientes(pendientes);
    } catch (err) {
      console.error('Error al cargar ventas pendientes:', err);
    } finally {
      setLoadingPendientes(false);
    }
  }, []);

  const handleIniciarCobro = useCallback(async () => {
    if (carrito.length === 0) return;
    setProcesando(true);

    const factorDescuento = subtotalBrutoCarrito > 0
      ? totalCarritoConDescuento / subtotalBrutoCarrito
      : 1;

    try {
      const nuevaVenta = await crearVentaPendiente({
        depositoId: activeDepositId,
        usuarioId: USUARIO_ACTUAL_ID,
        clienteId: cliente?.id || null,
        listaPrecioId: listaPrecioId || null,
        items: carritoConLista.map((it) => {
          const precioConDescuento = Math.round((it.precioUnitario * factorDescuento) * 100) / 100;
          return {
            articuloId: it.articuloId,
            cantidad: it.cantidad,
            precioUnitario: precioConDescuento,
          };
        }),
      });
      setVenta(nuevaVenta);
      setModoPago(false);
      setIsVentaBuscada(false);
      setTextoBusquedaVenta(nuevaVenta.numeroComprobante || '');
      cargarPendientes();
      cargarCatalogo();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  }, [carrito.length, carritoConLista, listaPrecioId, subtotalBrutoCarrito, totalCarritoConDescuento, activeDepositId, cliente, cargarPendientes, cargarCatalogo]);

  // ── EFECTOS DE CICLO DE VIDA ───────────────────────────────────────────────

  useEffect(() => {
    let cancelado = false;
    obtenerSesionActiva(USUARIO_ACTUAL_ID)
      .then((sesion) => {
        if (cancelado) return;
        setErrorCaja('');
        setSesionCaja(sesion);
        if (!sesion) {
          const volver = encodeURIComponent(`${location.pathname}${location.search}`);
          navigate(`/Apertura_Caja?redirect=${volver}`, { replace: true });
        }
      })
      .catch((err) => !cancelado && setErrorCaja(err.message || 'No se pudo verificar el estado de la caja.'));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reintentoCaja]);

  useEffect(() => {
    if (sesionCaja) refrescarResumenCaja();
  }, [sesionCaja, refrescarResumenCaja]);

  useEffect(() => {
    listarListasPrecios().then(setListasPrecios);
  }, []);

  useEffect(() => {
    listarDepositos().then((data) => {
      setDepositos(data);
      if (data.length > 0) setActiveDepositId(data[0].id);
    });
  }, []);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  useEffect(() => {
    // HU-26: no se carga ningún cobro hasta confirmar que hay una caja abierta.
    if (!nroACobrar || !sesionCaja) return;

    setBuscandoVenta(true);
    buscarVentaPorComprobante(nroACobrar)
      .then((v) => {
        setVenta(v);
        setCliente(v.cliente);
        setCarrito(v.items);
        setTextoBusquedaVenta(nroACobrar);
        setIsVentaBuscada(true);
        abrirPasarelaCobro(v);
        setToast(`Venta ${nroACobrar} cargada para cobro en caja.`);
      })
      .catch((err) => {
        setErrorBusqueda(err.message || 'No se pudo cargar la venta indicada.');
        setModoBuscarVenta(true);
      })
      .finally(() => setBuscandoVenta(false));
  }, [nroACobrar, sesionCaja, abrirPasarelaCobro]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── ATAJOS DE TECLADO ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (!venta) {
          setIsClientModalOpen((prev) => !prev);
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (!venta && carrito.length > 0 && !procesando) {
          handleIniciarCobro();
        } else if (enCobro && !modoPago) {
          abrirPasarelaCobro(venta);
        } else if (enCobro && modoPago && pagoForm.metodo === 'efectivo') {
          if (efectivoInputRef.current) {
            efectivoInputRef.current.focus();
          }
        }
      } else if (e.key === 'Escape') {
        if (isClientModalOpen) {
          handleCerrarModalCliente();
        } else if (modoBuscarVenta) {
          setModoBuscarVenta(false);
          setErrorBusqueda('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isClientModalOpen,
    modoBuscarVenta,
    venta,
    carrito,
    procesando,
    enCobro,
    modoPago,
    pagoForm.metodo,
    handleIniciarCobro,
    abrirPasarelaCobro,
    handleCerrarModalCliente,
  ]);

  // Manejo de Carrito (las líneas se agregan desde el formulario)
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
      setDescuentoPorc(0);
      setDescuentoCustom('');
      setMostrarCustomDesc(false);
    }
  };

  // Búsqueda de clientes
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
    setClientErrors({});
  };

  const handleAbrirAltaCliente = () => {
    const texto = clientQuery.trim();
    const esNumero = /^\d+$/.test(texto);
    setNuevoClienteForm({
      razonSocial: esNumero ? '' : texto,
      dni: esNumero && texto.length <= 8 ? texto : '',
      cuit: esNumero && texto.length === 11 ? texto : '',
      email: '',
      telefono: '',
      direccion: '',
    });
    setClientErrors({});
    setMostrarAltaCliente(true);
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    const errores = {};

    const razonSocial = nuevoClienteForm.razonSocial.trim();
    const dni = nuevoClienteForm.dni.trim().replace(/\D/g, '');
    const cuit = nuevoClienteForm.cuit.trim().replace(/\D/g, '');
    const email = nuevoClienteForm.email.trim();
    const telefono = nuevoClienteForm.telefono.trim();
    const direccion = nuevoClienteForm.direccion.trim();

    if (!razonSocial || razonSocial.length < 3) {
      errores.razonSocial = 'El nombre o razón social debe tener al menos 3 caracteres.';
    }

    if (!dni && !cuit) {
      errores.documento = 'Debes ingresar al menos un DNI o un CUIT válido.';
    }

    if (dni && !validarDNI(dni)) {
      errores.dni = 'DNI inválido (debe tener entre 7 y 8 números).';
    }

    if (cuit && !validarCUIT(cuit)) {
      errores.cuit = 'CUIT inválido (no supera la verificación de AFIP).';
    }

    if (email && !validarEmail(email)) {
      errores.email = 'Formato de correo electrónico inválido.';
    }

    if (telefono && !validarTelefono(telefono)) {
      errores.telefono = 'Teléfono inválido (mínimo 8 dígitos).';
    }

    if (Object.keys(errores).length > 0) {
      setClientErrors(errores);
      return;
    }

    setClientErrors({});
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

  const handleCargarVenta = async (numeroAUsar = null) => {
    const nroFinal = (numeroAUsar || textoBusquedaVenta).trim();
    if (!nroFinal) return;

    setBuscandoVenta(true);
    setErrorBusqueda('');
    try {
      const v = await buscarVentaPorComprobante(nroFinal);
      setVenta(v);
      setCliente(v.cliente);
      setCarrito(v.items);
      setModoBuscarVenta(false);
      abrirPasarelaCobro(v);
      setIsVentaBuscada(true);
    } catch (error) {
      setErrorBusqueda(error.message || 'No se encontró la venta asociada al comprobante.');
    } finally {
      setBuscandoVenta(false);
    }
  };

  const handleAgregarPago = async (e) => {
    e.preventDefault();
    const monto = Number(montoCobro);

    if (!monto || monto <= 0) {
      alert('El monto a cobrar debe ser mayor a 0.');
      return;
    }

    if (monto > saldoPendiente + 0.01) {
      alert(`El monto ($${monto.toFixed(2)}) supera el saldo restante ($${saldoPendiente.toFixed(2)}).`);
      return;
    }

    if (pagoForm.metodo === 'efectivo') {
      if (dineroEntregado > 0 && dineroEntregado < monto) {
        alert(`El dinero entregado ($${dineroEntregado.toLocaleString('es-AR')}) no alcanza para cubrir $${monto.toLocaleString('es-AR')}.`);
        return;
      }
    }

    if (pagoForm.metodo === 'tarjeta_debito' || pagoForm.metodo === 'tarjeta_credito') {
      if (!pagoForm.numeroCupon || pagoForm.numeroCupon.trim().length < 3) {
        alert('Ingresá el número de cupón o terminal del comprobante de la tarjeta.');
        return;
      }
    }

    if (pagoForm.metodo === 'transferencia') {
      if (!pagoForm.comprobanteTransf || pagoForm.comprobanteTransf.trim().length < 4) {
        alert('Ingresá el número de comprobante u operación de la transferencia.');
        return;
      }
    }

    setProcesando(true);
    try {
      await agregarPago(venta.ventaId, { metodo: pagoForm.metodo, monto, usuarioId: USUARIO_ACTUAL_ID });
      refrescarResumenCaja();
      const ventaActualizada = await obtenerVenta(venta.ventaId);
      setVenta(ventaActualizada);

      if (pagoForm.metodo === 'efectivo') {
        setUltimoVuelto({
          cobrado: monto,
          entrego: dineroEntregado > 0 ? dineroEntregado : monto,
          vuelto: vueltoEfectivo,
        });
      }

      const totalPagado = (ventaActualizada.pagos || []).reduce((acc, p) => acc + Number(p.monto), 0);
      const nuevoSaldo = Math.max(0, Number(ventaActualizada.total) - totalPagado);

      setPagoForm((prev) => ({
        ...prev,
        monto: nuevoSaldo > 0 ? nuevoSaldo.toFixed(2) : '',
        pagaCon: '',
        numeroCupon: '',
        comprobanteTransf: '',
      }));
      setEsPagoParcial(false);
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
      refrescarResumenCaja();
      cargarPendientes();
      cargarCatalogo();
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
      refrescarResumenCaja();
      cargarPendientes();
      cargarCatalogo();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleCerrarPendientes = () => {
    setModoBuscarVenta(false);
    setErrorBusqueda('');
    setTextoBusquedaVenta('');
  };

  const handleNuevaVenta = () => {
    setVenta(null);
    setCarrito([]);
    setCliente(null);
    setListaPrecioId('');
    setModoPago(false);
    setModoBuscarVenta(false);
    setTextoBusquedaVenta('');
    setErrorBusqueda('');
    setIsVentaBuscada(false);
    setUltimoVuelto(null);
    setEsPagoParcial(false);
    setDescuentoPorc(0);
    setDescuentoCustom('');
    setMostrarCustomDesc(false);
    cargarPendientes();
    cargarCatalogo();
  };

  // ── BLOQUES REUTILIZADOS EN LAS DOS VISTAS (MOSTRADOR Y FORMULARIO) ──────
  const selectorDescuentosJSX = (!venta && carrito.length > 0) ? (
                  <div style={{ padding: '12px 14px', background: '#fafafa', borderTop: '1px solid var(--gray-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--gray-700)' }}>
                        🎁 Descuento / Promoción comercial:
                      </span>
                      {porcentajeEfectivo > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--crit, #dc2626)', fontWeight: '700' }}>
                          -{porcentajeEfectivo}% OFF
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { label: '0%', val: 0 },
                        { label: '10% (Efectivo)', val: 10 },
                        { label: '15% (Gremio)', val: 15 },
                      ].map((promo) => (
                        <button
                          key={promo.val}
                          type="button"
                          onClick={() => {
                            setDescuentoPorc(promo.val);
                            setMostrarCustomDesc(false);
                            setDescuentoCustom('');
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: !mostrarCustomDesc && descuentoPorc === promo.val ? '#111827' : '#fff',
                            color: !mostrarCustomDesc && descuentoPorc === promo.val ? '#fff' : '#374151',
                            cursor: 'pointer',
                          }}
                        >
                          {promo.label}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setMostrarCustomDesc(!mostrarCustomDesc)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          background: mostrarCustomDesc ? '#111827' : '#fff',
                          color: mostrarCustomDesc ? '#fff' : '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        Personalizado %
                      </button>

                      {mostrarCustomDesc && (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="%"
                          value={descuentoCustom}
                          onChange={(e) => setDescuentoCustom(e.target.value)}
                          style={{ width: '60px', padding: '3px 6px', fontSize: '11px', border: '1px solid var(--red)', borderRadius: '4px' }}
                          autoFocus
                        />
                      )}
                    </div>
                  </div>
  ) : null;

  const pasarelaCobroJSX = enCobro ? (
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
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => abrirPasarelaCobro(venta)}>
                    Pagar ahora (F9)
                  </button>
                </div>
              ) : (
                <>
                  <div className="stat-card" style={{ marginBottom: '12px', marginTop: '12px' }}>
                    <div
                      className="stat-value"
                      style={{
                        color: saldoPendiente > 0.01 ? 'var(--crit, #dc2626)' : 'var(--green, #16a34a)',
                      }}
                    >
                      {formatearMonto(saldoPendiente)}
                    </div>
                    <div className="stat-label">
                      {saldoPendiente <= 0.01 ? 'Total saldado — listo para confirmar' : 'Saldo restante a cobrar'}
                    </div>
                  </div>

                  {ultimoVuelto && (
                    <div
                      style={{
                        background: '#ecfdf5',
                        border: '1.5px solid #10b981',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>
                          ✓ Cobro en efectivo registrado
                        </div>
                        <div style={{ fontSize: '12px', color: '#065f46', marginTop: '2px' }}>
                          Cobrado: <b>{formatearMonto(ultimoVuelto.cobrado)}</b> · Entregó: <b>{formatearMonto(ultimoVuelto.entrego)}</b>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#047857', display: 'block' }}>Vuelto entregado:</span>
                        <strong style={{ fontSize: '20px', color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                          {formatearMonto(ultimoVuelto.vuelto)}
                        </strong>
                      </div>
                    </div>
                  )}

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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
                        <div className="form-field" style={{ margin: 0 }}>
                          <label>Medio de pago</label>
                          <select
                            value={pagoForm.metodo}
                            onChange={(e) => {
                              setPagoForm({ ...pagoForm, metodo: e.target.value, pagaCon: '' });
                              setEsPagoParcial(false);
                            }}
                          >
                            {METODOS_PAGO.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Modalidad:</label>
                          <button
                            type="button"
                            onClick={() => {
                              const nuevo = !esPagoParcial;
                              setEsPagoParcial(nuevo);
                              setPagoForm((prev) => ({
                                ...prev,
                                monto: nuevo ? '' : saldoPendiente.toFixed(2),
                              }));
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ width: '100%', fontSize: '11px', justifyContent: 'center' }}
                          >
                            {esPagoParcial ? 'Cobrar total' : '¿Cobro parcial?'}
                          </button>
                        </div>
                      </div>

                      {esPagoParcial && (
                        <div className="form-field" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px' }}>
                            Monto parcial a cobrar (máx: {formatearMonto(saldoPendiente)})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={saldoPendiente}
                            placeholder={saldoPendiente.toFixed(2)}
                            value={pagoForm.monto}
                            onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
                            autoFocus
                            required
                          />
                        </div>
                      )}

                      {/* DETALLE EFECTIVO + VUELTO EN VIVO */}
                      {pagoForm.metodo === 'efectivo' && (
                        <div style={{ background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'center' }}>
                            <div className="form-field" style={{ margin: 0 }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ink)' }}>
                                Dinero que entrega el cliente:
                              </label>
                              <input
                                ref={efectivoInputRef}
                                type="number"
                                step="10"
                                placeholder={`Total: $${montoCobro.toLocaleString('es-AR')}`}
                                value={pagoForm.pagaCon}
                                onChange={(e) => setPagoForm({ ...pagoForm, pagaCon: e.target.value })}
                                style={{ fontSize: '15px', fontWeight: '700' }}
                                autoFocus
                              />
                            </div>

                            <div
                              style={{
                                background: faltaEfectivo > 0 ? '#fef2f2' : vueltoEfectivo > 0 ? '#ecfdf5' : '#f8fafc',
                                border: `1.5px solid ${faltaEfectivo > 0 ? '#fca5a5' : vueltoEfectivo > 0 ? '#10b981' : '#e2e8f0'}`,
                                borderRadius: '8px',
                                padding: '10px 14px',
                                textAlign: 'center',
                                minHeight: '62px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                              }}
                            >
                              {faltaEfectivo > 0 ? (
                                <>
                                  <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>Dinero insuficiente</span>
                                  <strong style={{ fontSize: '16px', color: '#b91c1c', fontVariantNumeric: 'tabular-nums' }}>
                                    Faltan {formatearMonto(faltaEfectivo)}
                                  </strong>
                                </>
                              ) : vueltoEfectivo > 0 ? (
                                <>
                                  <span style={{ fontSize: '11px', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Vuelto a entregar</span>
                                  <strong style={{ fontSize: '20px', color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatearMonto(vueltoEfectivo)}
                                  </strong>
                                </>
                              ) : dineroEntregado === montoCobro && dineroEntregado > 0 ? (
                                <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>✓ Pago exacto</span>
                              ) : (
                                <span style={{ fontSize: '11.5px', color: '#6b7280' }}>Ingresá los billetes recibidos</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Billetes recibidos:</span>
                              {pagoForm.pagaCon && (
                                <button
                                  type="button"
                                  onClick={() => setPagoForm((prev) => ({ ...prev, pagaCon: '' }))}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  Limpiar
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => setPagoForm((prev) => ({ ...prev, pagaCon: String(montoCobro) }))}
                                style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                Exacto (${montoCobro.toLocaleString('es-AR')})
                              </button>
                              {[1000, 2000, 5000, 10000, 20000].map((billete) => (
                                <button
                                  key={billete}
                                  type="button"
                                  onClick={() => {
                                    setPagoForm((prev) => {
                                      const actual = Number(prev.pagaCon) || 0;
                                      return { ...prev, pagaCon: String(actual + billete) };
                                    });
                                  }}
                                  style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                  +${billete.toLocaleString('es-AR')}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TARJETAS */}
                      {(pagoForm.metodo === 'tarjeta_debito' || pagoForm.metodo === 'tarjeta_credito') && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '10px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
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
                            <label style={{ fontSize: '11px' }}>Nro. Cupón / Lote <span style={{ color: 'red' }}>*</span></label>
                            <input
                              type="text"
                              placeholder="Ej: 04512"
                              value={pagoForm.numeroCupon}
                              onChange={(e) => setPagoForm({ ...pagoForm, numeroCupon: e.target.value })}
                              required
                            />
                          </div>

                          <div className="form-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '11px' }}>Cuotas</label>
                            <select
                              value={pagoForm.cuotas}
                              disabled={pagoForm.metodo === 'tarjeta_debito'}
                              onChange={(e) => setPagoForm({ ...pagoForm, cuotas: e.target.value })}
                            >
                              <option value="1">1 pago</option>
                              <option value="3">3 cuotas</option>
                              <option value="6">6 cuotas</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* TRANSFERENCIA */}
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
                            <label style={{ fontSize: '11px' }}>Nro. Operación <span style={{ color: 'red' }}>*</span></label>
                            <input
                              type="text"
                              placeholder="Ej: 8945123401"
                              value={pagoForm.comprobanteTransf}
                              onChange={(e) => setPagoForm({ ...pagoForm, comprobanteTransf: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={procesando || (pagoForm.metodo === 'efectivo' && faltaEfectivo > 0)}
                        style={{ width: '100%', padding: '10px' }}
                      >
                        {procesando ? 'Registrando...' : `+ Registrar cobro de ${formatearMonto(montoCobro)}`}
                      </button>
                    </form>
                  )}

                  {/* ACCIONES DE CIERRE */}
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
  ) : null;

  // ── VISTA FORMULARIO (PANTALLA COMPLETA) ───────────────────────────────────
  const depositoActivo = depositos.find((d) => d.id === activeDepositId);
  const etiquetaPorcentajeLista = (pct) =>
    pct === 0 ? 'sin ajuste' : `${pct > 0 ? '+' : '-'}${Math.abs(pct).toLocaleString('es-AR')}%`;
  const fechaHoy = new Date().toLocaleDateString('es-AR');

  const sugerenciasArticulos = (() => {
    const q = busquedaArt.trim().toLowerCase();
    if (!q) return [];
    return catalogo
      .filter(
        (a) =>
          (a.descripcion || '').toLowerCase().includes(q) ||
          (a.codigoEan13 || '').includes(q) ||
          (a.codigoInterno || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  })();

  const handleSeleccionarArticuloForm = (art) => {
    setArtSeleccionado(art);
    setBusquedaArt(art.descripcion);
    setSugerenciasAbiertas(false);
  };

  const handleAgregarDetalleForm = () => {
    if (!artSeleccionado) {
      alert('Buscá y seleccioná un artículo de la lista para agregarlo.');
      return;
    }
    const cant = Number(cantidadForm);
    if (!Number.isInteger(cant) || cant <= 0) {
      alert('La cantidad debe ser un número entero mayor a 0.');
      return;
    }
    const enCarrito = carrito.find((it) => it.articuloId === artSeleccionado.id);
    const yaCargado = enCarrito ? enCarrito.cantidad : 0;
    if (yaCargado + cant > artSeleccionado.disponible) {
      alert(
        `Stock insuficiente en este depósito. Disponible: ${artSeleccionado.disponible}` +
          (yaCargado ? ` (ya cargaste ${yaCargado}).` : '.')
      );
      return;
    }
    setCarrito((prev) =>
      enCarrito
        ? prev.map((it) =>
            it.articuloId === artSeleccionado.id ? { ...it, cantidad: it.cantidad + cant } : it
          )
        : [
            ...prev,
            {
              articuloId: artSeleccionado.id,
              descripcion: artSeleccionado.descripcion,
              cantidad: cant,
              precioUnitario: artSeleccionado.precioActual,
              disponible: artSeleccionado.disponible,
            },
          ]
    );
    setArtSeleccionado(null);
    setBusquedaArt('');
    setCantidadForm('1');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const inputFormStyle = {
    width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc',
  };

  const ventaFormularioJSX = !venta ? (
    <div className="table-panel" style={{ padding: '24px', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Registrar venta</h2>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={procesando}
          onClick={() => {
            setModoBuscarVenta(true);
            setErrorBusqueda('');
            cargarPendientes();
          }}
        >
          Cobrar ticket pendiente
          {ventasPendientes.length > 0 && ` (${ventasPendientes.length})`}
        </button>
      </div>

      {/* CABECERA: CLIENTE / DEPÓSITO / FECHA */}
      <div className="form-row" style={{ gridTemplateColumns: '1.6fr 1.1fr 1fr 1fr' }}>
        <div className="form-field">
          <label>Cliente</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '38px' }}>
            {cliente ? (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{cliente.razonSocial}</div>
                  <div className="cell-sub" style={{ fontSize: '11.5px' }}>
                    {cliente.dni ? `DNI ${cliente.dni}` : `CUIT ${cliente.cuit}`}
                  </div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsClientModalOpen(true)}>
                  Cambiar
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setCliente(null)}>
                  Quitar
                </button>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Consumidor final</div>
                  <div className="cell-sub" style={{ fontSize: '11.5px' }}>Venta directa de mostrador</div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsClientModalOpen(true)}>
                  Buscar cliente (F4)
                </button>
              </>
            )}
          </div>
        </div>
        <div className="form-field">
          <label>Lista de precios</label>
          <select
            value={listaPrecioId}
            onChange={(e) => setListaPrecioId(e.target.value)}
            disabled={procesando}
          >
            <option value="">Precio base</option>
            {listasPrecios.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre} ({etiquetaPorcentajeLista(l.porcentaje)})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
            {listaActiva ? 'Los precios del detalle se recalculan con esta lista.' : 'Sin ajuste sobre el precio de catálogo.'}
          </span>
        </div>
        <div className="form-field">
          <label>Depósito</label>
          <input type="text" value={depositoActivo ? depositoActivo.nombre : ''} disabled />
          <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Se cambia desde las pestañas de arriba.</span>
        </div>
        <div className="form-field">
          <label>Fecha de emisión</label>
          <input type="text" value={fechaHoy} disabled />
        </div>
      </div>

      {/* DETALLE DE ARTÍCULOS */}
      <div
        className="detalle-section"
        style={{ marginTop: '10px', padding: '20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Detalle de Artículos
          {listaActiva && (
            <span className="badge badge-amber" style={{ fontWeight: 600 }}>
              <span className="badge-dot" />
              Lista {listaActiva.nombre} ({etiquetaPorcentajeLista(listaActiva.porcentaje)})
            </span>
          )}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 3fr) 100px 1fr auto', gap: '15px', alignItems: 'end', marginBottom: '20px', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }}>
            <label style={{ fontSize: '0.9rem', color: '#555' }}>Artículo (F2)</label>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nombre, código o EAN…"
              value={busquedaArt}
              onChange={(e) => {
                setBusquedaArt(e.target.value);
                setArtSeleccionado(null);
                setSugerenciasAbiertas(true);
              }}
              onFocus={() => setSugerenciasAbiertas(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (artSeleccionado) handleAgregarDetalleForm();
                  else if (sugerenciasArticulos.length === 1) handleSeleccionarArticuloForm(sugerenciasArticulos[0]);
                }
              }}
              style={inputFormStyle}
              autoComplete="off"
            />
            {sugerenciasAbiertas && sugerenciasArticulos.length > 0 && !artSeleccionado && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff',
                  border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                  maxHeight: '260px', overflowY: 'auto',
                }}
              >
                {sugerenciasArticulos.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={a.disponible <= 0}
                    onClick={() => handleSeleccionarArticuloForm(a)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', gap: '10px', width: '100%',
                      padding: '8px 10px', border: 'none', borderBottom: '1px solid #f3f4f6', background: 'none',
                      textAlign: 'left', cursor: a.disponible <= 0 ? 'not-allowed' : 'pointer',
                      opacity: a.disponible <= 0 ? 0.5 : 1, fontSize: '12.5px',
                    }}
                  >
                    <span>{a.descripcion}</span>
                    <span style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {a.disponible > 0 ? `Stock ${a.disponible}` : 'Sin stock'} · {formatearMonto(aplicarLista(a.precioActual))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: '#555' }}>Cantidad</label>
            <input
              type="number"
              min="1"
              step="1"
              value={cantidadForm}
              onChange={(e) => setCantidadForm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAgregarDetalleForm();
                }
              }}
              style={inputFormStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: '#555' }}>Precio Unit.</label>
            <input
              type="text"
              value={artSeleccionado ? formatearMonto(aplicarLista(artSeleccionado.precioActual)) : ''}
              placeholder="—"
              disabled
              style={inputFormStyle}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleAgregarDetalleForm}
              style={{ padding: '8px 16px', height: '35px', cursor: 'pointer', backgroundColor: '#e42e2e', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              + Agregar
            </button>
          </div>
        </div>

        {artSeleccionado && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '-10px', marginBottom: '12px' }}>
            Disponible en este depósito: <strong>{artSeleccionado.disponible}</strong>
          </div>
        )}

        {carrito.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
            Todavía no cargaste artículos. Buscá uno arriba y presioná “+ Agregar”.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Artículo</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Cant.</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Precio U.</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {carritoConLista.map((it) => (
                  <tr key={it.articuloId} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{it.descripcion}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <div className="row-actions" style={{ justifyContent: 'center' }}>
                        <button type="button" className="icon-btn" onClick={() => handleCambiarCantidad(it.articuloId, -1)}>−</button>
                        <span style={{ minWidth: '22px', textAlign: 'center' }}>{it.cantidad}</span>
                        <button type="button" className="icon-btn" onClick={() => handleCambiarCantidad(it.articuloId, 1)}>+</button>
                      </div>
                    </td>
                    <td className="cell-mono" style={{ padding: '8px', textAlign: 'right' }}>{formatearMonto(it.precioUnitario)}</td>
                    <td className="cell-mono" style={{ padding: '8px', textAlign: 'right' }}>{formatearMonto(it.cantidad * it.precioUnitario)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button type="button" onClick={() => handleQuitarItem(it.articuloId)} style={{ color: '#ef4444', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 'bold' }}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {montoDescuentoCalculado > 0 && (
                  <>
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'right', padding: '8px', color: 'var(--gray-500)' }}>Subtotal:</td>
                      <td className="cell-mono" style={{ textAlign: 'right', padding: '8px' }}>{formatearMonto(subtotalBrutoCarrito)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'right', padding: '8px', color: 'var(--crit, #dc2626)', fontWeight: 600 }}>Descuento ({porcentajeEfectivo}%):</td>
                      <td className="cell-mono" style={{ textAlign: 'right', padding: '8px', color: 'var(--crit, #dc2626)' }}>-{formatearMonto(montoDescuentoCalculado)}</td>
                      <td></td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 8px' }}>Total a cobrar:</td>
                  <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 8px', color: '#047857' }}>
                    {formatearMonto(totalCarritoConDescuento)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {carrito.length > 0 && <div style={{ marginTop: '12px' }}>{selectorDescuentosJSX}</div>}
      </div>

      <div className="modal-notice" style={{ marginTop: '14px' }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
        </svg>
        Al continuar se reserva el stock de los artículos y se abre la pasarela de cobro.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
        <button type="button" className="btn btn-outline" disabled={procesando || carrito.length === 0} onClick={handleVaciarCarrito}>
          Vaciar
        </button>
        <button type="button" className="btn btn-primary" disabled={procesando || carrito.length === 0} onClick={handleIniciarCobro}>
          {procesando ? 'Reservando stock…' : 'Registrar venta y cobrar (F9)'}
        </button>
      </div>
    </div>
  ) : (
    /* Venta ya creada: resumen a la izquierda + MISMA pasarela de cobro a la derecha */
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '18px', alignItems: 'start', marginTop: '10px' }}>
      <div className="table-panel" style={{ padding: '24px' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '1.2rem' }}>
          Venta {venta.numeroComprobante || ''}
        </h2>
        <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', margin: '0 0 14px', padding: 0, border: 'none' }}>
          <div className="detail-info-item">
            <div className="label">Cliente</div>
            <div className="value" style={{ fontWeight: 600 }}>{cliente ? cliente.razonSocial : 'Consumidor final'}</div>
          </div>
          <div className="detail-info-item">
            <div className="label">Lista de precios</div>
            <div className="value">
              {venta.listaPrecio
                ? `${venta.listaPrecio.nombre} (${etiquetaPorcentajeLista(venta.listaPrecio.porcentaje)})`
                : 'Precio base'}
            </div>
          </div>
          <div className="detail-info-item">
            <div className="label">Depósito</div>
            <div className="value">{depositoActivo ? depositoActivo.nombre : '—'}</div>
          </div>
          <div className="detail-info-item">
            <div className="label">Estado</div>
            <div className="value">{venta.estado}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Artículo</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Cant.</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(venta.items || []).map((it) => (
              <tr key={it.articuloId} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{it.descripcion}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{it.cantidad}</td>
                <td className="cell-mono" style={{ padding: '8px', textAlign: 'right' }}>
                  {formatearMonto(it.importeLinea ?? it.cantidad * it.precioUnitario)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 8px' }}>Total:</td>
              <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 'bold', padding: '12px 8px', color: '#047857' }}>
                {formatearMonto(venta.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div>
        {pasarelaCobroJSX}
        {confirmada && (
          <div className="table-panel" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 700, marginBottom: '10px' }}>Venta confirmada</div>
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleNuevaVenta}>
              Nueva venta
            </button>
          </div>
        )}
      </div>
    </div>
  );



  // ── BLOQUEO HU-26: sin caja abierta no se renderiza la grilla ni el cobro ──
  if (errorCaja) {
    return (
      <div className="table-panel" style={{ maxWidth: '520px', margin: '60px auto', padding: '28px', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>No se pudo verificar la caja</div>
        <div style={{ color: 'var(--gray-500)', fontSize: '13px', marginBottom: '16px' }}>{errorCaja}</div>
        <button type="button" className="btn btn-primary" onClick={() => { setErrorCaja(''); setReintentoCaja((n) => n + 1); }}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!sesionCaja) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
        {sesionCaja === undefined ? 'Verificando estado de la caja…' : 'Redirigiendo a la apertura de caja…'}
      </div>
    );
  }

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

      {/* BARRA DE ATAJOS DE TECLADO RÁPIDO */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: '#18181b',
          color: '#a1a1aa',
          padding: '6px 14px',
          borderRadius: '8px',
          fontSize: '11px',
          marginBottom: '10px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: '#fff', fontWeight: '700' }}>⚡ Atajos de mostrador:</span>
        <span><kbd style={{ background: '#27272a', color: '#f4f4f5', padding: '2px 5px', borderRadius: '4px', border: '1px solid #3f3f46' }}>F2</kbd> Buscar artículo</span>
        <span><kbd style={{ background: '#27272a', color: '#f4f4f5', padding: '2px 5px', borderRadius: '4px', border: '1px solid #3f3f46' }}>F4</kbd> Cliente</span>
        <span><kbd style={{ background: '#27272a', color: '#f4f4f5', padding: '2px 5px', borderRadius: '4px', border: '1px solid #3f3f46' }}>F9</kbd> Cobrar / Efectivo</span>
        <span><kbd style={{ background: '#27272a', color: '#f4f4f5', padding: '2px 5px', borderRadius: '4px', border: '1px solid #3f3f46' }}>Esc</kbd> Cerrar / Volver</span>
      </div>

      {/* Tabs Depósito */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div className="warehouse-tabs" style={{ marginBottom: 0 }}>
          {depositos.map((d) => (
            <button
              key={d.id}
              className={`warehouse-tab ${activeDepositId === d.id ? 'active' : ''}`}
              disabled={!!venta || (!!depositoCajaId && d.id !== depositoCajaId)}
              title={depositoCajaId && d.id !== depositoCajaId ? 'Tu caja está abierta en otra sucursal' : undefined}
              style={depositoCajaId && d.id !== depositoCajaId ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              onClick={() => setActiveDepositId(d.id)}
            >
              {d.nombre}
            </button>
          ))}
        </div>

        <span
          title={
            resumenCaja
              ? `Turno abierto desde ${formatearFechaHora(sesionCaja.fechaHoraApertura)}\nFondo ${formatearMonto(resumenCaja.fondoInicial)} · Ventas en efectivo ${formatearMonto(resumenCaja.ventasEfectivo)}\nIngresos ${formatearMonto(resumenCaja.ingresos)} · Egresos ${formatearMonto(resumenCaja.egresos)}`
              : `Turno abierto desde ${formatearFechaHora(sesionCaja.fechaHoraApertura)}`
          }
          style={{ fontSize: '12px', fontWeight: 600, color: '#065f46', background: '#d1fae5', borderRadius: '6px', padding: '5px 10px', whiteSpace: 'nowrap' }}
        >
          {sesionCaja.cajaNombre} abierta · Efectivo {formatearMonto(resumenCaja ? resumenCaja.saldoEfectivo : sesionCaja.montoInicial)}
        </span>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsMovimientoOpen(true)}>
          Movimiento de caja
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={procesando}
          onClick={() => {
            if (carrito.length > 0 && !venta && !window.confirm('Tenés artículos cargados sin cobrar. Si cerrás la caja se pierden. ¿Continuar?')) return;
            navigate('/Cierre_Caja');
          }}
        >
          Cerrar caja
        </button>
        {isVentaBuscada && (
          <div style={{ fontSize: '12px', background: '#fef3c7', padding: '4px 10px', borderRadius: '4px', color: '#92400e', fontWeight: '600' }}>
            Retomando cobro de comprobante: {venta?.numeroComprobante}
          </div>
        )}
      </div>

      {ventaFormularioJSX}

      {/* MODAL: MOVIMIENTOS MANUALES DE CAJA (HU-27) */}
      <MovimientoCajaModal
        isOpen={isMovimientoOpen}
        onClose={() => setIsMovimientoOpen(false)}
        usuarioId={USUARIO_ACTUAL_ID}
        resumen={resumenCaja}
        onResumenActualizado={setResumenCaja}
      />

      {/* MODAL: TICKETS PENDIENTES DE COBRO */}
      <Modal
        isOpen={modoBuscarVenta && !venta}
        onClose={handleCerrarPendientes}
        title="Tickets pendientes de cobro"
        footer={
          <button className="btn btn-outline" onClick={handleCerrarPendientes}>
            Cerrar (Esc)
          </button>
        }
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <span className="badge badge-amber">
            <span className="badge-dot" />
            {ventasPendientes.length} en espera
          </span>
        </div>

        <div className="search-input" style={{ marginBottom: '12px' }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={textoBusquedaVenta}
            onChange={(e) => setTextoBusquedaVenta(e.target.value)}
            placeholder="Filtrar por comprobante o cliente…"
            autoFocus
          />
          {textoBusquedaVenta && (
            <button
              type="button"
              onClick={() => setTextoBusquedaVenta('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)' }}
            >
              ✕
            </button>
          )}
        </div>

        {errorBusqueda && (
          <div style={{ color: 'var(--crit, #dc2626)', fontSize: '12px', marginBottom: '10px' }}>
            {errorBusqueda}
          </div>
        )}

        <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: '6px' }}>
          {loadingPendientes ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
              Consultando tickets pendientes…
            </div>
          ) : pendientesFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
              {ventasPendientes.length === 0
                ? 'No hay ventas pendientes de cobro.'
                : 'No se encontraron tickets con ese criterio.'}
            </div>
          ) : (
            pendientesFiltradas.map((vp) => (
              <div
                key={vp.ventaId || vp.id}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderBottom: '1px solid var(--gray-100, #f3f4f6)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cell-mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>{vp.numeroComprobante}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {vp.cliente || 'Consumidor final'}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--gray-500)' }}>{formatearFechaHora(vp.fechaHoraRegistro)}</div>
                </div>
                <div className="cell-mono" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatearMonto(vp.total)}</div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ padding: '4px 12px', fontSize: '11px' }}
                  disabled={buscandoVenta}
                  onClick={() => handleCargarVenta(vp.numeroComprobante)}
                >
                  Cobrar
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* MODAL CLIENTE */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={handleCerrarModalCliente}
        title={mostrarAltaCliente ? 'Nuevo cliente' : 'Buscar cliente (F4)'}
        wide={mostrarAltaCliente}
      >
        {mostrarAltaCliente ? (
          <form onSubmit={handleCrearCliente} className="form-row" noValidate>
            <div className="form-field full">
              <label>Nombre o Razón Social <span className="req">*</span></label>
              <input
                type="text"
                value={nuevoClienteForm.razonSocial}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, razonSocial: e.target.value })}
                autoFocus
                required
              />
              {clientErrors.razonSocial && (
                <span style={{ color: 'var(--crit, #dc2626)', fontSize: '11px', fontWeight: '600' }}>
                  {clientErrors.razonSocial}
                </span>
              )}
            </div>

            {clientErrors.documento && (
              <div className="form-field full" style={{ color: 'var(--crit, #dc2626)', fontSize: '11px', fontWeight: '600' }}>
                {clientErrors.documento}
              </div>
            )}

            <div className="form-field">
              <label>DNI</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="7 u 8 números"
                value={nuevoClienteForm.dni}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
              />
              {clientErrors.dni && (
                <span style={{ color: 'var(--crit, #dc2626)', fontSize: '11px', fontWeight: '600' }}>
                  {clientErrors.dni}
                </span>
              )}
            </div>

            <div className="form-field">
              <label>CUIT (Validación AFIP)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="11 dígitos sin guiones"
                value={nuevoClienteForm.cuit}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, cuit: e.target.value.replace(/\D/g, '').slice(0, 11) })}
              />
              {clientErrors.cuit && (
                <span style={{ color: 'var(--crit, #dc2626)', fontSize: '11px', fontWeight: '600' }}>
                  {clientErrors.cuit}
                </span>
              )}
            </div>

            <div className="form-field">
              <label>Correo electrónico</label>
              <input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={nuevoClienteForm.email}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, email: e.target.value })}
              />
              {clientErrors.email && (
                <span style={{ color: 'var(--crit, #dc2626)', fontSize: '11px', fontWeight: '600' }}>
                  {clientErrors.email}
                </span>
              )}
            </div>

            <div className="form-field">
              <label>Teléfono</label>
              <input
                type="text"
                placeholder="Ej: 3875123456"
                value={nuevoClienteForm.telefono}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, telefono: e.target.value })}
              />
              {clientErrors.telefono && (
                <span style={{ color: 'var(--crit, #dc2626)', fontSize: '11px', fontWeight: '600' }}>
                  {clientErrors.telefono}
                </span>
              )}
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
                {creandoCliente ? 'Validando…' : 'Crear y asociar'}
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

      {/* TICKET / FACTURA TRAS CONFIRMAR */}
      <Modal
        isOpen={!!confirmada}
        onClose={handleNuevaVenta}
        title={`Comprobante emitido ${confirmada ? venta.numeroComprobante : ''}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => imprimirFacturaHTML(venta, ultimoVuelto)}>
              Imprimir ticket / factura
            </button>
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

            {ultimoVuelto && ultimoVuelto.vuelto > 0 && (
              <div style={{ marginTop: '12px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>Vuelto entregado al cliente:</span>
                <strong style={{ fontSize: '18px', color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                  {formatearMonto(ultimoVuelto.vuelto)}
                </strong>
              </div>
            )}

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