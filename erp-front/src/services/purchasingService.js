// =============================================================================
// purchasingService.js — Capa de datos de HU-12 (Cotizaciones y Órdenes de Compra)
// =============================================================================
// Igual que supplierService.js antes de la migración de HU-11: esto es un MOCK
// en memoria (se reinicia al recargar la página). Las tablas que modela ya
// existen en el SQL real de Supabase (cotizaciones, cotizaciones_detalle,
// cotizaciones_proveedores, cotizaciones_proveedores_detalle, ordenes_compra,
// ordenes_compra_detalle) — ver docs/sprint2/HU-12-14-23-24-frontend.md para
// el detalle de qué endpoints debería exponer erp-backend.
//
// Lo único que SÍ pega contra el backend real (solo lectura, GET) es la data
// de referencia: catálogo de artículos y proveedores activos, para no
// inventar productos/proveedores que no existen en la base real.
// =============================================================================

const API_URL = 'http://localhost:3001/api';

// ---------------------------------------------------------------------------
// Datos de referencia (reales, solo lectura)
// ---------------------------------------------------------------------------

export async function listarArticulosReferencia() {
  try {
    const res = await fetch(`${API_URL}/articles`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((a) => ({
      id: a.id,
      descripcion: a.descripcion,
      modelo: a.modelo,
      codigoInterno: a.codigo_interno,
      precioActual: Number(a.precio_actual) || 0,
    }));
  } catch (err) {
    console.error('Error al listar artículos de referencia:', err);
    return [];
  }
}

export async function listarProveedoresReferencia() {
  try {
    const res = await fetch(`${API_URL}/suppliers/todos`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || [])
      .filter((p) => p.estado)
      .map((p) => ({ id: p.id, razonSocial: p.razon_social, email: p.email }));
  } catch (err) {
    console.error('Error al listar proveedores de referencia:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Estado mock (equivalente a las tablas de Supabase)
// ---------------------------------------------------------------------------

let _cotizaciones = [];
let _numeroOrdenSeq = 1024; // simula nextval('ordenes_compra_numero_orden_seq')
let _ordenesCompra = [];
let _seedPromise = null;

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

async function seedSiHaceFalta() {
  if (_seedPromise) return _seedPromise;

  _seedPromise = (async () => {
    if (_cotizaciones.length > 0 || _ordenesCompra.length > 0) return;

    const [articulos, proveedores] = await Promise.all([
      listarArticulosReferencia(),
      listarProveedoresReferencia(),
    ]);

    if (articulos.length === 0 || proveedores.length === 0) return;

    const art1 = articulos[0];
    const art2 = articulos[1] || articulos[0];
    const prov1 = proveedores[0];
    const prov2 = proveedores[1] || proveedores[0];

    // Cotización de ejemplo ya respondida y aprobada, para mostrar el flujo completo
    const cotDemo = {
      id: uid('cot'),
      estado: 'Aprobada',
      fechaRegistro: new Date(Date.now() - 6 * 86400000).toISOString(),
      fechaActualizacion: new Date(Date.now() - 4 * 86400000).toISOString(),
      lineas: [{ articuloId: art1.id, cantidadSolicitada: 10 }],
      proveedoresInvitados: [
        {
          id: uid('cp'),
          proveedorId: prov1.id,
          fechaEnvio: new Date(Date.now() - 6 * 86400000).toISOString(),
          estadoRespuesta: 'Respondida',
          ofertas: [{ articuloId: art1.id, precioUnitarioOfertado: Math.max(1, Math.round(art1.precioActual * 0.82)) }],
        },
        {
          id: uid('cp'),
          proveedorId: prov2.id,
          fechaEnvio: new Date(Date.now() - 6 * 86400000).toISOString(),
          estadoRespuesta: 'Respondida',
          ofertas: [{ articuloId: art1.id, precioUnitarioOfertado: Math.max(1, Math.round(art1.precioActual * 0.9)) }],
        },
      ],
      proveedorGanadorId: prov1.id,
    };
    _cotizaciones.push(cotDemo);

    // Orden de compra generada a partir de esa cotización, ya con recepción parcial
    _ordenesCompra.push({
      id: uid('oc'),
      numeroOrden: _numeroOrdenSeq++,
      proveedorId: prov1.id,
      cotizacionId: cotDemo.id,
      estado: 'Parcial',
      fechaEmision: new Date(Date.now() - 4 * 86400000).toISOString(),
      lineas: [
        {
          id: uid('ocd'),
          articuloId: art1.id,
          cantidadSolicitada: 10,
          cantidadRecibida: 6,
          precioUnitario: Math.max(1, Math.round(art1.precioActual * 0.82)),
        },
      ],
    });

    // Segunda OC ya totalmente recibida (para mostrar variedad de estados)
    _ordenesCompra.push({
      id: uid('oc'),
      numeroOrden: _numeroOrdenSeq++,
      proveedorId: prov2.id,
      cotizacionId: null,
      estado: 'Recibida',
      fechaEmision: new Date(Date.now() - 12 * 86400000).toISOString(),
      lineas: [
        {
          id: uid('ocd'),
          articuloId: art2.id,
          cantidadSolicitada: 5,
          cantidadRecibida: 5,
          precioUnitario: Math.max(1, Math.round(art2.precioActual * 0.88)),
        },
      ],
    });
  })();

  return _seedPromise;
}

function calcularTotalOferta(oferta, lineas) {
  return lineas.reduce((acc, linea) => {
    const item = oferta.ofertas.find((o) => o.articuloId === linea.articuloId);
    const precio = item ? item.precioUnitarioOfertado : 0;
    return acc + precio * linea.cantidadSolicitada;
  }, 0);
}

function recalcularEstadoOC(oc) {
  const totalSolicitado = oc.lineas.reduce((acc, l) => acc + l.cantidadSolicitada, 0);
  const totalRecibido = oc.lineas.reduce((acc, l) => acc + l.cantidadRecibida, 0);
  if (oc.estado === 'Cancelada') return;
  if (totalRecibido <= 0) oc.estado = 'Pendiente';
  else if (totalRecibido < totalSolicitado) oc.estado = 'Parcial';
  else oc.estado = 'Recibida';
}

// ---------------------------------------------------------------------------
// Cotizaciones (RFQ)
// ---------------------------------------------------------------------------

export async function listarCotizaciones() {
  await seedSiHaceFalta();
  return _cotizaciones.map((c) => ({
    id: c.id,
    estado: c.estado,
    fechaRegistro: c.fechaRegistro,
    cantidadArticulos: c.lineas.length,
    cantidadProveedores: c.proveedoresInvitados.length,
    cantidadRespuestas: c.proveedoresInvitados.filter((p) => p.estadoRespuesta === 'Respondida').length,
  }));
}

export async function obtenerCotizacion(id) {
  await seedSiHaceFalta();
  return _cotizaciones.find((c) => c.id === id) || null;
}

// criterio de aceptación 1: generar cotización y enviarla por email a 1+ proveedores
export async function crearYEnviarCotizacion({ lineas, proveedorIds }) {
  await seedSiHaceFalta();
  if (!lineas || lineas.length === 0) throw new Error('La cotización necesita al menos un artículo.');
  if (!proveedorIds || proveedorIds.length === 0) throw new Error('Seleccioná al menos un proveedor para enviar la cotización.');

  const nueva = {
    id: uid('cot'),
    estado: 'Enviada',
    fechaRegistro: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    lineas: lineas.map((l) => ({ articuloId: l.articuloId, cantidadSolicitada: Number(l.cantidadSolicitada) })),
    proveedoresInvitados: proveedorIds.map((pid) => ({
      id: uid('cp'),
      proveedorId: pid,
      fechaEnvio: new Date().toISOString(),
      estadoRespuesta: 'Pendiente',
      ofertas: [],
    })),
    proveedorGanadorId: null,
  };
  _cotizaciones.unshift(nueva);
  return nueva;
}

// Simula la respuesta por email del proveedor (en el sistema real esto vendría
// de un webhook/carga manual de la cotización recibida). Genera precios
// ofertados con una variación aleatoria realista contra el precio de catálogo.
export async function simularRespuestaProveedor(cotizacionId, cotizacionProveedorId, articulosRef) {
  const cot = _cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot) throw new Error('Cotización no encontrada.');
  const cp = cot.proveedoresInvitados.find((p) => p.id === cotizacionProveedorId);
  if (!cp) throw new Error('Proveedor invitado no encontrado en esta cotización.');

  const refById = new Map(articulosRef.map((a) => [a.id, a]));
  cp.ofertas = cot.lineas.map((l) => {
    const ref = refById.get(l.articuloId);
    const base = ref ? ref.precioActual : 1000;
    const variacion = 0.75 + Math.random() * 0.25; // entre 75% y 100% del precio de venta
    return { articuloId: l.articuloId, precioUnitarioOfertado: Math.max(1, Math.round(base * variacion)) };
  });
  cp.estadoRespuesta = 'Respondida';
  cot.fechaActualizacion = new Date().toISOString();
  return cp;
}

export async function cancelarCotizacion(cotizacionId) {
  const cot = _cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot) throw new Error('Cotización no encontrada.');
  if (cot.estado === 'Aprobada') throw new Error('No se puede cancelar una cotización ya aprobada.');
  cot.estado = 'Cancelada';
  cot.fechaActualizacion = new Date().toISOString();
  return cot;
}

// criterio de aceptación 2: cotización aprobada → Orden de Compra con número
// correlativo único y estado 'Pendiente'
export async function aprobarYGenerarOrdenCompra(cotizacionId, proveedorGanadorId) {
  const cot = _cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot) throw new Error('Cotización no encontrada.');
  const ganador = cot.proveedoresInvitados.find((p) => p.proveedorId === proveedorGanadorId);
  if (!ganador || ganador.estadoRespuesta !== 'Respondida') {
    throw new Error('El proveedor elegido todavía no respondió la cotización.');
  }

  cot.estado = 'Aprobada';
  cot.proveedorGanadorId = proveedorGanadorId;
  cot.fechaActualizacion = new Date().toISOString();

  const nuevaOC = {
    id: uid('oc'),
    numeroOrden: _numeroOrdenSeq++,
    proveedorId: proveedorGanadorId,
    cotizacionId: cot.id,
    estado: 'Pendiente',
    fechaEmision: new Date().toISOString(),
    lineas: cot.lineas.map((l) => {
      const oferta = ganador.ofertas.find((o) => o.articuloId === l.articuloId);
      return {
        id: uid('ocd'),
        articuloId: l.articuloId,
        cantidadSolicitada: l.cantidadSolicitada,
        cantidadRecibida: 0,
        precioUnitario: oferta ? oferta.precioUnitarioOfertado : 0,
      };
    }),
  };
  _ordenesCompra.unshift(nuevaOC);
  return nuevaOC;
}

export function calcularTotalOfertaProveedor(cotizacion, proveedorId) {
  const cp = cotizacion.proveedoresInvitados.find((p) => p.proveedorId === proveedorId);
  if (!cp || cp.estadoRespuesta !== 'Respondida') return null;
  return calcularTotalOferta(cp, cotizacion.lineas);
}

// ---------------------------------------------------------------------------
// Órdenes de Compra
// ---------------------------------------------------------------------------

export async function listarOrdenesCompra() {
  await seedSiHaceFalta();
  return _ordenesCompra.map((oc) => ({
    id: oc.id,
    numeroOrden: oc.numeroOrden,
    proveedorId: oc.proveedorId,
    estado: oc.estado,
    fechaEmision: oc.fechaEmision,
    total: oc.lineas.reduce((acc, l) => acc + l.cantidadSolicitada * l.precioUnitario, 0),
    cantidadLineas: oc.lineas.length,
  }));
}

export async function obtenerOrdenCompra(id) {
  await seedSiHaceFalta();
  return _ordenesCompra.find((oc) => oc.id === id) || null;
}

// criterio de aceptación 3: recepción parcial → estado 'Parcial' conservando
// el saldo pendiente por ítem
export async function registrarRecepcion(ordenId, recepciones) {
  const oc = _ordenesCompra.find((o) => o.id === ordenId);
  if (!oc) throw new Error('Orden de compra no encontrada.');
  if (oc.estado === 'Cancelada' || oc.estado === 'Recibida') {
    throw new Error('Esta orden ya no admite nuevas recepciones.');
  }

  let huboCambios = false;
  for (const rec of recepciones) {
    const linea = oc.lineas.find((l) => l.id === rec.detalleId);
    if (!linea) continue;
    const saldoPendiente = linea.cantidadSolicitada - linea.cantidadRecibida;
    const cantidad = Math.max(0, Math.min(Number(rec.cantidad) || 0, saldoPendiente));
    if (cantidad > 0) {
      linea.cantidadRecibida += cantidad;
      huboCambios = true;
    }
  }

  if (!huboCambios) throw new Error('Ingresá al menos una cantidad a recibir.');

  recalcularEstadoOC(oc);
  return oc;
}

export async function cancelarOrdenCompra(ordenId) {
  const oc = _ordenesCompra.find((o) => o.id === ordenId);
  if (!oc) throw new Error('Orden de compra no encontrada.');
  if (oc.lineas.some((l) => l.cantidadRecibida > 0)) {
    throw new Error('No se puede cancelar una orden que ya tiene mercadería recibida.');
  }
  oc.estado = 'Cancelada';
  return oc;
}
