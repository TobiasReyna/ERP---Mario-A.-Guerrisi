const API_URL = 'http://localhost:3001/api';

// HU-26 · Apertura de caja. El backend devuelve todo en camelCase.

export async function listarCajas(depositoId) {
  const res = await fetch(`${API_URL}/cajas?depositoId=${encodeURIComponent(depositoId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'No se pudieron cargar las cajas.');
  return json.data || [];
}

/** Sesión activa del usuario, o null si su caja está cerrada. */
export async function obtenerSesionActiva(usuarioId) {
  const res = await fetch(`${API_URL}/cajas/sesion-activa?usuarioId=${encodeURIComponent(usuarioId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'No se pudo verificar la caja.');
  return json.data || null;
}

/** Abre la caja. Ante un conflicto (409) el Error trae `.codigo` (CAJA_OCUPADA, etc.). */
export async function abrirCaja({ cajaId, usuarioId, montoInicial }) {
  const res = await fetch(`${API_URL}/cajas/abrir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cajaId, usuarioId, montoInicial }),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error || 'No se pudo abrir la caja.');
    err.codigo = json.codigo || null;
    throw err;
  }
  return json.data;
}

// ───────────────────────── HU-27 · Movimientos manuales ─────────────────────────

/** Saldo teórico de efectivo del turno (o null si no hay caja abierta). */
export async function obtenerResumenCaja(usuarioId) {
  const res = await fetch(`${API_URL}/cajas/resumen?usuarioId=${encodeURIComponent(usuarioId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'No se pudo consultar el saldo de caja.');
  return json.data || null;
}

export async function listarConceptosCaja() {
  const res = await fetch(`${API_URL}/cajas/conceptos`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los conceptos.');
  return json.data || [];
}

/** Movimientos del turno actual (más nuevos primero). */
export async function listarMovimientosCaja(usuarioId) {
  const res = await fetch(`${API_URL}/cajas/movimientos?usuarioId=${encodeURIComponent(usuarioId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los movimientos.');
  return json.data || [];
}

/**
 * Registra un ingreso/egreso. Ante un rechazo el Error trae `.codigo` y, si el egreso supera
 * el límite (REQUIERE_AUTORIZACION), también `.limite`.
 */
export async function registrarMovimientoCaja(payload) {
  const res = await fetch(`${API_URL}/cajas/movimientos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error || 'No se pudo registrar el movimiento.');
    err.codigo = json.codigo || null;
    err.limite = json.limite ?? null;
    throw err;
  }
  return json.data;
}

// ───────────────────────── HU-28 · Cierre y arqueo ciego ─────────────────────────

/**
 * Datos de la pantalla de arqueo. NO incluye importes (arqueo ciego).
 * Devuelve null si el usuario no tiene una caja abierta.
 */
export async function obtenerContextoArqueo(usuarioId) {
  const res = await fetch(`${API_URL}/cajas/arqueo/contexto?usuarioId=${encodeURIComponent(usuarioId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'No se pudo consultar la caja.');
  return json.data || null;
}

/** Cierra la caja con el efectivo contado. Devuelve solo el resultado del arqueo. */
export async function cerrarCaja({ usuarioId, montoFisico }) {
  const res = await fetch(`${API_URL}/cajas/cerrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarioId, montoFisico }),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error || 'No se pudo cerrar la caja.');
    err.codigo = json.codigo || null;
    throw err;
  }
  return json.data;
}

/** Descarga el Reporte de Cierre (PDF) de una sesión cerrada. */
export async function descargarReporteCierre(sesionId, usuarioId) {
  const res = await fetch(`${API_URL}/cajas/sesiones/${sesionId}/reporte-cierre?usuarioId=${encodeURIComponent(usuarioId)}`);
  if (!res.ok) {
    let mensaje = 'No se pudo descargar el reporte.';
    try {
      mensaje = (await res.json()).error || mensaje;
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(mensaje);
  }
  const blob = await res.blob();
  const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'reporte-cierre-caja.pdf';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}