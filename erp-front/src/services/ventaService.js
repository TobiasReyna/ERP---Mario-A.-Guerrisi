const API_URL = 'http://localhost:3001/api';

// El backend de ventaController.js ya devuelve todo en camelCase
// (ver services/ventaService.js del backend), así que acá no hace
// falta mapFromApi/mapToApi como en supplierService.js.

export async function listarDepositos() {
  try {
    const res = await fetch(`${API_URL}/deposits`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((d) => ({ id: d.id, nombre: d.nombre }));
  } catch (err) {
    console.error('Error al listar depósitos:', err);
    return [];
  }
}

export async function obtenerCatalogoPOS(depositoId) {
  const res = await fetch(`${API_URL}/stock/pos-catalog?depositoId=${depositoId}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Error al cargar el catálogo del punto de venta.');
  }
  return json.data || [];
}

/**
 * Parte 1 del contrato: reserva stock y crea la venta en estado Pendiente.
 * payload: { depositoId, usuarioId, clienteId, items: [{articuloId, cantidad, precioUnitario}] }
 */
export async function crearVentaPendiente(payload) {
  const res = await fetch(`${API_URL}/ventas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'No se pudo iniciar la venta.');
  }
  return json.data;
}

export async function obtenerVenta(ventaId) {
  const res = await fetch(`${API_URL}/ventas/${ventaId}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'No se pudo obtener la venta.');
  }
  return json.data;
}

/**
 * Parte 2 del contrato: agrega un método de pago a la vez.
 * pago: { metodo, monto }
 */
export async function agregarPago(ventaId, pago) {
  const res = await fetch(`${API_URL}/ventas/${ventaId}/pagos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pago),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'No se pudo registrar el pago.');
  }
  return json.data;
}

export async function confirmarVenta(ventaId) {
  const res = await fetch(`${API_URL}/ventas/${ventaId}/confirmar`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'No se pudo confirmar la venta.');
  }
  return json.data;
}

export async function cancelarVenta(ventaId) {
  const res = await fetch(`${API_URL}/ventas/${ventaId}/cancelar`, {
    method: 'PATCH',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'No se pudo cancelar la venta.');
  }
  return json.data;
}
