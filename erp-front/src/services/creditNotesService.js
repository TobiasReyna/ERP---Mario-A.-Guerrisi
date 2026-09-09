// =============================================================================
// creditNotesService.js — Capa de datos de HU-23 (Notas de Crédito y Débito)
// =============================================================================
// Mock en memoria. Modela public.notas_credito_debito y
// public.notas_credito_debito_detalle. El comprobante de venta de origen
// (public.ventas_mock_origen) viene de clientsService.js.
//
// ⚠️ Aviso para el equipo de backend (ver también el .md de este sprint):
// el SQL real define una única secuencia compartida para numero_comprobante
// (sq_notas_credito_debito_numero), pero la regla de negocio de la HU pide
// "numeración correlativa independiente por tipo de comprobante (NC/ND)".
// Esta capa simula NUMERACIÓN INDEPENDIENTE POR TIPO (NC-0001, ND-0001, ...)
// porque es lo que pide el criterio de negocio; hay que decidir en el backend
// si conviene una secuencia por tipo o un prefijo aplicado en la app.
//
// La reversión de stock del criterio de aceptación 2 se simula (toast +
// bandera `afectaInventario` en la nota); no se escribe nada en
// public.existencias porque no hay todavía un flujo de ventas real (HU-15)
// que las haya descontado primero.
// =============================================================================

import { listarArticulosReferencia } from './purchasingService';

const API_URL = 'http://localhost:3001/api';

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

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

let _notas = [];
let _correlativos = { 'Nota de Crédito': 0, 'Nota de Débito': 0 };

function siguienteNumero(tipo) {
  _correlativos[tipo] += 1;
  const prefijo = tipo === 'Nota de Crédito' ? 'NC' : 'ND';
  return `${prefijo}-${String(_correlativos[tipo]).padStart(4, '0')}`;
}

export async function listarNotas() {
  return [..._notas].sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
}

// criterios de aceptación 1 y 2: exige factura de origen y, si corresponde,
// revierte el stock de los artículos devueltos
export async function crearNota({ tipo, facturaOrigenId, motivo, lineas, afectaInventario, montoManual }) {
  if (!facturaOrigenId) {
    throw new Error('Toda nota debe vincularse obligatoriamente a un comprobante de venta original.');
  }
  if (!motivo || !motivo.trim()) {
    throw new Error('El motivo es obligatorio.');
  }

  const lineasLimpias = (lineas || []).filter((l) => l.articuloId && Number(l.cantidad) > 0);
  const revierteInventario = tipo === 'Nota de Crédito' && !!afectaInventario && lineasLimpias.length > 0;

  let monto = Number(montoManual) || 0;
  if (monto <= 0) {
    throw new Error('El monto de la nota debe ser mayor a 0.');
  }

  const nueva = {
    id: uid('ncd'),
    numeroComprobante: siguienteNumero(tipo),
    tipo,
    facturaOrigenId,
    monto,
    fechaRegistro: new Date().toISOString(),
    motivo: motivo.trim(),
    afectaInventario: revierteInventario,
    lineas: lineasLimpias.map((l) => ({
      id: uid('ncdd'),
      articuloId: l.articuloId,
      depositoId: l.depositoId,
      cantidad: Number(l.cantidad),
    })),
  };

  _notas.unshift(nueva);
  return nueva;
}

// criterio de aceptación 3: reporte integrado con los ajustes reflejados en
// los totales netos del período
export async function obtenerResumenPeriodo(fechaDesdeISO, fechaHastaISO) {
  const desde = fechaDesdeISO ? new Date(fechaDesdeISO) : null;
  const hasta = fechaHastaISO ? new Date(fechaHastaISO) : null;

  const enRango = _notas.filter((n) => {
    const f = new Date(n.fechaRegistro);
    if (desde && f < desde) return false;
    if (hasta && f > new Date(hasta.getTime() + 86400000 - 1)) return false;
    return true;
  });

  const totalNC = enRango.filter((n) => n.tipo === 'Nota de Crédito').reduce((acc, n) => acc + n.monto, 0);
  const totalND = enRango.filter((n) => n.tipo === 'Nota de Débito').reduce((acc, n) => acc + n.monto, 0);

  return {
    cantidadNotas: enRango.length,
    totalNC,
    totalND,
    netoAjustes: totalND - totalNC,
  };
}
