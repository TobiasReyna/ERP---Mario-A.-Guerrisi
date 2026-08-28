const API_URL = 'http://localhost:3001/api/stock/adjust';

async function testCajaBlancaCB01() {
  console.log("🚀 Iniciando Test CB-01: Conversión de NULL a 0 en existencias...\n");

  // ⚠️ IMPORTANTE: Completa con UUIDs reales. El artículo NO debe tener stock previo en este depósito.
  const payload = {
    articulo_id: "766916c2-6a95-49a2-bb5b-808611ee9f0f", //artLucio
    deposito_id: "bf975c47-946f-406c-bb0e-a41dbe656df4", //tienda central
    motivo_id: "337e0491-fab0-45d9-8a90-0656388af5cd", //perdida
    cantidad_anterior: 0, 
    cantidad_nueva: 5,
    usuario_id: "7ab3d65c-eecc-4f0b-98a1-2c53efce620e", // Requerido por la tabla ajustes_stock
    ip_origen: "127.0.0.1"         // Requerido por la tabla ajustes_stock
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`Estado HTTP: ${response.status}`);
    
    if (response.ok) {
      console.log("✅ ÉXITO: El trigger trg_fn_validar_ajuste_stock manejó el NULL correctamente.");
    } else {
      console.log("❌ FALLO: La API o la BD rechazó la petición.");
      console.log("Detalle del error:", data);
    }
  } catch (error) {
    console.error("💥 Error de conexión:", error);
  }
}

testCajaBlancaCB01();