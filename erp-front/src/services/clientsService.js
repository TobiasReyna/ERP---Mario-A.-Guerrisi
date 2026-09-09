// =============================================================================
// clientsService.js — Mock de public.clientes y public.ventas_mock_origen
// =============================================================================
// Compartido por HU-23 (Notas de Crédito/Débito, necesita el comprobante de
// venta de origen) y HU-24 (Límites de Crédito, gestiona limite_credito /
// saldo_actual). Todavía no existe un módulo de Ventas/POS real (HU-15/16),
// por eso ambas tablas están mockeadas acá — ver
// docs/sprint2/HU-12-14-23-24-frontend.md para el detalle de las tablas reales
// que ya están en Supabase.
// =============================================================================

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let _clientes = [
  { id: uid('cli'), razonSocial: 'Estudio de Grabación Andina SRL', cuit: '30712345670', limiteCredito: 800000, saldoActual: 512000, estado: true },
  { id: uid('cli'), razonSocial: 'Conservatorio Salta Norte', cuit: '30698547123', limiteCredito: 500000, saldoActual: 495000, estado: true },
  { id: uid('cli'), razonSocial: 'Banda Municipal de Cafayate', cuit: '30587412369', limiteCredito: 300000, saldoActual: 118000, estado: true },
  { id: uid('cli'), razonSocial: 'Rodríguez Producciones Musicales', cuit: '20345678901', limiteCredito: 250000, saldoActual: 261500, estado: true },
  { id: uid('cli'), razonSocial: 'Instituto Musical del Norte', cuit: '30456123789', limiteCredito: 600000, saldoActual: 90000, estado: true },
];

let _ventasMock = [
  { id: uid('vta'), numeroComprobante: '0001-00004821', clienteId: _clientes[0].id, montoTotal: 145000, estado: 'Activa' },
  { id: uid('vta'), numeroComprobante: '0001-00004835', clienteId: _clientes[1].id, montoTotal: 87500, estado: 'Activa' },
  { id: uid('vta'), numeroComprobante: '0001-00004840', clienteId: _clientes[2].id, montoTotal: 32000, estado: 'Activa' },
  { id: uid('vta'), numeroComprobante: '0001-00004798', clienteId: _clientes[3].id, montoTotal: 210000, estado: 'Pagada' },
];

export async function listarClientes() {
  return _clientes.map((c) => ({ ...c }));
}

export async function obtenerCliente(id) {
  return _clientes.find((c) => c.id === id) || null;
}

// criterio de aceptación 1 (HU-24): el Gerente configura el límite y el
// sistema lo almacena asociado a la cuenta corriente del cliente
export async function actualizarLimiteCredito(clienteId, nuevoLimite) {
  const cliente = _clientes.find((c) => c.id === clienteId);
  if (!cliente) throw new Error('Cliente no encontrado.');
  if (!(nuevoLimite >= 0)) throw new Error('El límite de crédito debe ser un valor positivo.');
  cliente.limiteCredito = Number(nuevoLimite);
  return cliente;
}

export async function listarVentasMock() {
  return _ventasMock.map((v) => ({ ...v }));
}

export async function obtenerVentaMock(id) {
  return _ventasMock.find((v) => v.id === id) || null;
}
