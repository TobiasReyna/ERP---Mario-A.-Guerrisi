
const API_URL = 'http://localhost:3001/api/cajas';

async function consultar(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  const resultado = await response.json();

  if (!response.ok) {
    throw new Error(resultado.error || 'No se pudo completar la consulta.');
  }

  return resultado.data;
}

export function obtenerDashboardCajas() {
  return consultar(`${API_URL}/supervision/dashboard`);
}

export function obtenerHistorialCierres({ cajeroId, desde, hasta } = {}) {
  const params = new URLSearchParams();

  if (cajeroId) params.set('cajeroId', cajeroId);
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);

  const query = params.toString();

  return consultar(
    `${API_URL}/supervision/historial${query ? `?${query}` : ''}`
  );
}

export function obtenerDetalleCierre(sesionId) {
  return consultar(
    `${API_URL}/supervision/sesiones/${encodeURIComponent(sesionId)}`
  );
}

/**
 * Abre el PDF en otra pestaña.
 * El endpoint devuelve Content-Disposition: inline.
 */
export function abrirPdfCierre(sesionId) {
  const url =
    `${API_URL}/supervision/sesiones/` +
    `${encodeURIComponent(sesionId)}/reporte-cierre`;

  const ventana = window.open(url, '_blank');

  if (!ventana) {
    throw new Error(
      'El navegador bloqueó la pestaña nueva. Permití las ventanas emergentes para este sitio.'
    );
  }
}