// =============================================================================
// supplierService.js — Capa de datos de HU-11 (Gestión de Proveedores)
// =============================================================================
// Ya NO es un mock: la tabla public.proveedores existe en Supabase (con las
// columnas adicionales de docs/sprint2/migracion_proveedores_campos_adicionales.sql)
// y erp-backend expone /api/suppliers (ver erp-backend/routes/supplierRoutes.js).
// Este service llama a esa API con el mismo patrón fetch que el resto de las
// páginas del front (articleService, stockService, etc.) y mantiene la MISMA
// firma de funciones que tenía el mock, así que Gestion_de_proveedores.jsx no
// necesitó ningún cambio.
//
// La API responde en snake_case (igual que las columnas de Postgres); acá se
// mapea a los nombres en camelCase que ya usa el componente.
// =============================================================================

import { limpiarCuit } from '../utils/cuit';

const API_URL = 'http://localhost:3001/api/suppliers';

function mapFromApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    razonSocial: row.razon_social,
    cuit: row.cuit,
    nombreContacto: row.nombre_contacto || '',
    telefono: row.telefono || '',
    email: row.email || '',
    direccion: row.direccion || '',
    condicionPago: row.condicion_pago,
    notas: row.notas || '',
    estado: row.estado,
    fechaAlta: row.fecha_hora_registro,
  };
}

function mapToApi(payload) {
  return {
    razon_social: payload.razonSocial,
    cuit: limpiarCuit(payload.cuit),
    nombre_contacto: payload.nombreContacto || '',
    telefono: payload.telefono,
    email: payload.email,
    direccion: payload.direccion || '',
    condicion_pago: payload.condicionPago,
    notas: payload.notas || '',
  };
}

// Parsea la respuesta y, si el backend devolvió un error, arma un Error con
// la misma forma que usaba el mock (error.code === 'CUIT_DUPLICADO' +
// error.proveedorExistente) para que Gestion_de_proveedores.jsx no tenga que
// cambiar su manejo de errores.
async function handleResponse(res) {
  let json = {};
  try {
    json = await res.json();
  } catch {
    // Respuesta sin body (ej. algunos 500 de red) — se maneja abajo igual.
  }

  if (!res.ok) {
    const error = new Error(json.error || `Error ${res.status} al comunicarse con el servidor.`);
    if (res.status === 409) {
      error.code = 'CUIT_DUPLICADO';
      error.proveedorExistente = mapFromApi(json.proveedorExistente);
    }
    throw error;
  }

  return json;
}

// GET /api/suppliers/todos — Listar proveedores (activos + baja; el filtrado
// por estado ya lo hace la UI con `filtroEstado`)
export async function listarProveedores() {
  const res = await fetch(`${API_URL}/todos`);
  const json = await handleResponse(res);
  return (json.data || []).map(mapFromApi);
}

// GET /api/suppliers/check-cuit — Busca un proveedor por CUIT (ignora
// guiones/espacios). Excluye opcionalmente un id (para editar sin chocar
// consigo mismo). Se usa para la verificación en vivo (criterio de
// aceptación 2) mientras se escribe el CUIT en el formulario.
export async function buscarProveedorPorCuit(cuit, idAExcluir = null) {
  const cuitLimpio = limpiarCuit(cuit);
  if (cuitLimpio.length !== 11) return null;

  const params = new URLSearchParams({ cuit: cuitLimpio });
  if (idAExcluir) params.set('excludeId', idAExcluir);

  const res = await fetch(`${API_URL}/check-cuit?${params.toString()}`);
  const json = await handleResponse(res);
  return mapFromApi(json.data);
}

// POST /api/suppliers — Alta de proveedor (criterios de aceptación 1 y 2)
export async function crearProveedor(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapToApi(payload)),
  });
  const json = await handleResponse(res);
  return mapFromApi(json.data);
}

// PUT /api/suppliers/:id — Edición de proveedor
export async function actualizarProveedor(id, payload) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapToApi(payload)),
  });
  const json = await handleResponse(res);
  return mapFromApi(json.data);
}

// PATCH /api/suppliers/:id/status | /:id/reactivate — Baja / reactivación
// lógica (mismo patrón que Catalogo_de_productos.jsx para artículos)
export async function cambiarEstadoProveedor(id, estado) {
  const endpoint = estado ? `${API_URL}/${id}/reactivate` : `${API_URL}/${id}/status`;
  const res = await fetch(endpoint, { method: 'PATCH' });
  const json = await handleResponse(res);
  return mapFromApi(json.data);
}

// GET /api/suppliers/:id/orders — Historial de órdenes de compra y montos
// operados (criterio de aceptación 3). Ya devuelve datos reales de
// ordenes_compra / ordenes_compra_detalle: { numero, fecha, estado, monto }.
export async function obtenerHistorialCompras(idProveedor) {
  const res = await fetch(`${API_URL}/${idProveedor}/orders`);
  const json = await handleResponse(res);
  return json.data || [];
}
