const API_URL = 'http://localhost:3001/api/credit-notes';

export async function listarClientes() {
  try {
    const res = await fetch(`${API_URL}/clients`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Error al listar clientes:', err);
    return [];
  }
}

export async function obtenerCliente(id) {
  const clientes = await listarClientes();
  return clientes.find((c) => c.id === id) || null;
}

export async function listarVentasMock() {
  try {
    const res = await fetch(`${API_URL}/sales`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Error al listar comprobantes de venta:', err);
    return [];
  }
}

export async function obtenerVentaMock(id) {
  const ventas = await listarVentasMock();
  return ventas.find((v) => v.id === id) || null;
}

export async function actualizarLimiteCredito(clienteId, nuevoLimite) {
  const res = await fetch(`${API_URL}/clients/${clienteId}/credit-limit`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limiteCredito: Number(nuevoLimite) }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Error al actualizar el límite de crédito.');
  }
  return json.data;
}