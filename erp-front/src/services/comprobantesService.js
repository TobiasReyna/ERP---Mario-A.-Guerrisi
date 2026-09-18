// =============================================================================
// comprobantesService.js — HU-23 (capa de acceso a la API desde el Frontend)
// =============================================================================

const BASE_URL = 'http://localhost:3001/api/comprobantes-proveedores';

/**
 * Obtiene todos los comprobantes de proveedores registrados.
 * @returns {Promise<Array>}
 */
export async function listarComprobantes() {
    const res = await fetch(`${BASE_URL}`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error al obtener comprobantes.');
    }
    const body = await res.json();
    return body.data ?? [];
}

/**
 * Obtiene las cuentas por pagar pendientes (con saldo > 0) de un proveedor.
 * Se usa en el formulario de Nota de Crédito para el select de "Factura a aplicar".
 * @param {string|number} proveedorId
 * @returns {Promise<Array>}
 */
export async function listarCxpPendientes(proveedorId) {
    const res = await fetch(`${BASE_URL}/cxp-pendientes/${proveedorId}`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error al obtener cuentas pendientes.');
    }
    const body = await res.json();
    return body.data ?? [];
}

/**
 * Registra un comprobante de proveedor.
 * @param {Object} payload
 * @param {string|number} payload.proveedor_id
 * @param {'Factura'|'Nota de Crédito'|'Nota de Débito'} payload.tipo_comprobante
 * @param {string} payload.numero_comprobante  Ej: "0001-00001234"
 * @param {number} payload.monto_total
 * @param {string} payload.fecha_emision       YYYY-MM-DD
 * @param {string|null} payload.fecha_vencimiento YYYY-MM-DD (null para NC)
 * @param {string|null} payload.id_cuenta_por_pagar (obligatorio para NC)
 * @returns {Promise<Object>} comprobante creado
 * @throws {Error} con message 'COMPROBANTE_DUPLICADO' si HTTP 409
 */
export async function registrarComprobante(payload) {
    const res = await fetch(`${BASE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));

    if (res.status === 409) {
        throw new Error('COMPROBANTE_DUPLICADO');
    }
    if (!res.ok) {
        throw new Error(body.error || `Error HTTP ${res.status}`);
    }
    return body.data;
}

