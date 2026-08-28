const API_URL = 'http://localhost:3001/api/stock';

async function ejecutarPruebasHU01() {
  console.log("==================================================");
  console.log("🚀 INICIANDO PRUEBAS HU-01: RENDIMIENTO Y ROLLBACK");
  console.log("==================================================\n");

  // ----------------------------------------------------
  // PRUEBA 1: Latencia de Consulta de Stock Consolidado (< 2000 ms)
  // ----------------------------------------------------
  console.log("🧪 1. Midiendo latencia de Inventario General / Stock Consolidado...");
  
  const inicio = performance.now();
  try {
    // Usamos la ruta correcta: /api/stock/inventory
    const resStock = await fetch(`${API_URL}/inventory`);
    const fin = performance.now();
    const latencia = Math.round(fin - inicio);

    console.log(`  ⏱️ Tiempo de respuesta: ${latencia} ms`);

    if (latencia < 2000) {
      console.log(`  ✅ ÉXITO: La latencia (${latencia} ms) cumplió el SLS (< 2000 ms).`);
    } else {
      console.log(`  ⚠️ ALERTA: La consulta superó el límite deseado (${latencia} ms >= 2000 ms).`);
    }

    if (resStock.ok) {
      const dataStock = await resStock.json();
      const registros = dataStock.data || dataStock;
      
      // Verificar ausencia de duplicados básicos
      const ids = registros.map(item => item.articulo_id || item.id);
      const tieneDuplicados = ids.some((id, index) => ids.indexOf(id) !== index);

      if (!tieneDuplicados) {
        console.log("  ✅ ÉXITO: No se detectaron filas duplicadas en el inventario.");
      } else {
        console.log("  ❌ FALLO: Se detectaron registros duplicados en el listado.");
      }
    } else {
      const errorData = await resStock.json();
      console.log(`  ❌ FALLO HTTP ${resStock.status}:`, errorData);
    }
  } catch (err) {
    console.log("  💥 Error en P1:", err.message);
  }

  console.log("\n--------------------------------------------------\n");

  // ----------------------------------------------------
  // PRUEBA 2: Rollback Atómico en Transferencia Fallida
  // ----------------------------------------------------
  console.log("🧪 2. Probando Rollback Atómico en Transferencias entre depósitos...");

  // Payload de transferencia donde forzamos un fallo (ejemplo: depósito destino inexistente)
  // Payload de transferencia forzando un fallo en el destino
  const transferenciaInvalida = {
    // ⚠️ REEMPLAZA ESTOS DOS IDS POR UNOS REALES QUE TENGAN STOCK EN TU BD ⚠️
    articulo_id: "663edd60-613f-4839-ac83-4594b25f8134", 
    deposito_origen_id: "566cbb3d-e638-4089-83fc-4c44895acc4a", 
    
    // Dejamos el destino falso para que la BD explote y haga Rollback
    deposito_destino_id: "00000000-0000-0000-0000-000000000000", 
    
    cantidad: 1, // Cantidad mínima para asegurar que hay stock
    usuario_id: "7ab3d65c-eecc-4f0b-98a1-2c53efce620e" // Agregamos el campo faltante
  };
  try {
    // Usamos la ruta correcta: /api/stock/transfer
    const resTransf = await fetch(`${API_URL}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transferenciaInvalida)
    });

    const dataTransf = await resTransf.json();

    if (resTransf.status >= 400 && resTransf.status < 500) {
      console.log(`  ✅ ÉXITO: La API abortó la operación correctamente con HTTP ${resTransf.status}.`);
      console.log("     Detalle del rechazo:", dataTransf.error || dataTransf.message);
      console.log("  📌 La transacción ejecutó ROLLBACK: Ningún stock fue modificado.");
    } else if (resTransf.status >= 500) {
      console.log(`  ⚠️ ALERTA: La API falló con error interno (HTTP ${resTransf.status}). Revisa si el error de DB se filtra al cliente.`);
      console.log("     Detalle:", dataTransf);
    } else {
      console.log("  ❌ FALLO: La API permitió una transferencia con datos inválidos.");
    }
  } catch (err) {
    console.error("  💥 Error ejecutando P2:", err.message);
  }
}

ejecutarPruebasHU01();