import { listarArticulosReferencia } from './purchasingService';

const API_URL = 'http://localhost:3001/api';

export { listarArticulosReferencia };

export async function listarDepositosReferencia() {
  try {
    const res = await fetch(`${API_URL}/deposits`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((d) => ({ id: d.id, nombre: d.nombre }));
  } catch (err) {
    console.error('Error al listar depósitos de referencia:', err);
    return [];
  }
}

export async function listarNotas() {
  const res = await fetch(`${API_URL}/credit-notes`);
  if (!res.ok) {
    throw new Error('Error al cargar notas de crédito y débito.');
  }
  const json = await res.json();
  return json.data || [];
}

export async function crearNota(payload) {
  const res = await fetch(`${API_URL}/credit-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Error al emitir la nota.');
  }
  return json.data;
}

export async function obtenerResumenPeriodo(fechaDesdeISO, fechaHastaISO) {
  const params = new URLSearchParams();
  if (fechaDesdeISO) params.append('desde', fechaDesdeISO);
  if (fechaHastaISO) params.append('hasta', fechaHastaISO);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/credit-notes/summary${query}`);

  if (!res.ok) {
    return { cantidadNotas: 0, totalNC: 0, totalND: 0, netoAjustes: 0 };
  }
  const json = await res.json();
  return json.data || { cantidadNotas: 0, totalNC: 0, totalND: 0, netoAjustes: 0 };
}