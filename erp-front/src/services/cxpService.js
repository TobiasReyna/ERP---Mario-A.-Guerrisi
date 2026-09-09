// =============================================================================
// cxpService.js — Capa de datos de HU-14 (Gestión de Cuentas por Pagar)
// =============================================================================
// Mock en memoria, mismo criterio que purchasingService.js. Modela
// public.cuentas_por_pagar y public.pagos_cxp. En el sistema real estas filas
// las genera automáticamente HU-13 (recepción de mercadería) — acá se seedean
// directamente para poder mostrar el flujo de HU-14 de forma aislada.
// La lista de proveedores es real (GET /api/suppliers/todos, solo lectura).
// =============================================================================

import { listarProveedoresReferencia } from './purchasingService';

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function diasDesdeHoy(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

let _cuentas = [];
let _pagos = [];
let _seedPromise = null;

async function seedSiHaceFalta() {
  if (_seedPromise) return _seedPromise;

  _seedPromise = (async () => {
    if (_cuentas.length > 0) return;

    const proveedores = await listarProveedoresReferencia();
    if (proveedores.length === 0) return;

    const p1 = proveedores[0];
    const p2 = proveedores[1] || proveedores[0];
    const p3 = proveedores[2] || proveedores[0];

    _cuentas = [
      {
        id: uid('cxp'),
        proveedorId: p1.id,
        numeroOrdenCompra: 1024,
        montoTotal: 540000,
        saldoPendiente: 540000,
        fechaVencimiento: diasDesdeHoy(-6), // vencida y sin pagos → Mora
        estado: 'Pendiente',
      },
      {
        id: uid('cxp'),
        proveedorId: p2.id,
        numeroOrdenCompra: 1018,
        montoTotal: 320000,
        saldoPendiente: 120000,
        fechaVencimiento: diasDesdeHoy(9),
        estado: 'Pendiente',
      },
      {
        id: uid('cxp'),
        proveedorId: p3.id,
        numeroOrdenCompra: 1011,
        montoTotal: 210000,
        saldoPendiente: 0,
        fechaVencimiento: diasDesdeHoy(-20),
        estado: 'Pagada',
      },
      {
        id: uid('cxp'),
        proveedorId: p1.id,
        numeroOrdenCompra: 1006,
        montoTotal: 95000,
        saldoPendiente: 95000,
        fechaVencimiento: diasDesdeHoy(25),
        estado: 'Pendiente',
      },
    ];

    _pagos = [
      {
        id: uid('pago'),
        cuentaPorPagarId: _cuentas[1].id,
        montoPagado: 200000,
        fechaPago: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: uid('pago'),
        cuentaPorPagarId: _cuentas[2].id,
        montoPagado: 210000,
        fechaPago: new Date(Date.now() - 22 * 86400000).toISOString(),
      },
    ];
  })();

  return _seedPromise;
}

// Recalcula 'Mora' como lo haría un job periódico: toda CxP Pendiente cuya
// fecha_vencimiento ya pasó pasa a estado Mora (criterio de aceptación 3).
function recalcularMora() {
  const hoy = new Date().toISOString().slice(0, 10);
  _cuentas.forEach((c) => {
    if (c.estado !== 'Pagada') {
      c.estado = c.fechaVencimiento < hoy ? 'Mora' : 'Pendiente';
    }
  });
}

export async function listarCuentasPorPagar() {
  await seedSiHaceFalta();
  recalcularMora();
  return _cuentas.map((c) => ({ ...c }));
}

export async function obtenerHistorialPagos(cuentaId) {
  await seedSiHaceFalta();
  return _pagos
    .filter((p) => p.cuentaPorPagarId === cuentaId)
    .sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago))
    .map((p) => ({ ...p }));
}

// criterio de aceptación 2: pago parcial actualiza saldo y conserva historial
export async function registrarPago(cuentaId, montoPagado) {
  const cuenta = _cuentas.find((c) => c.id === cuentaId);
  if (!cuenta) throw new Error('Cuenta por pagar no encontrada.');
  const monto = Number(montoPagado);
  if (!(monto > 0)) throw new Error('El monto pagado debe ser mayor a 0.');
  if (monto > cuenta.saldoPendiente) {
    throw new Error(`El monto no puede superar el saldo pendiente (${cuenta.saldoPendiente}).`);
  }

  _pagos.unshift({
    id: uid('pago'),
    cuentaPorPagarId: cuentaId,
    montoPagado: monto,
    fechaPago: new Date().toISOString(),
  });

  cuenta.saldoPendiente = Math.round((cuenta.saldoPendiente - monto) * 100) / 100;
  cuenta.estado = cuenta.saldoPendiente <= 0 ? 'Pagada' : 'Pendiente';
  return cuenta;
}

export { listarProveedoresReferencia };
