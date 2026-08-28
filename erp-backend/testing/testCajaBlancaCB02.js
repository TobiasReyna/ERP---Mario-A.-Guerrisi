/**
 * PRUEBA DE CAJA BLANCA - CB-02
 * Objetivo: Forzar el trigger 'trg_fn_validar_ajuste_stock' enviando una 
 * cantidad_anterior incorrecta para simular una condición de carrera.
 */

const API_URL = 'http://localhost:3001/api/stock/adjust';

async function testCarreraDetectada() {
  console.log("🚀 Iniciando Test CB-02: Forzar Rollback por Carrera Detectada...\n");

  // ⚠️ IMPORTANTE: Reemplaza estos valores por UUIDs reales de tu base de datos
  const payload = {
    articulo_id: "663edd60-613f-4839-ac83-4594b25f8134", //guitarra amarilla gibson les paul
    deposito_id: "bf975c47-946f-406c-bb0e-a41dbe656df4", //tienda central
    motivo_id: "337e0491-fab0-45d9-8a90-0656388af5cd", //perdida
    // Inyectamos un valor absurdamente alto o incorrecto para forzar el fallo
    cantidad_anterior: 99999, 
    cantidad_nueva: 15
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`Estado HTTP devuelto: ${response.status}`);
    
    // Evaluamos el resultado esperado
    if (!response.ok) {
      console.log("✅ ÉXITO (TEST PASÓ): El servidor rechazó la petición correctamente.");
      console.log("Respuesta del servidor:", data);
      console.log("\nRevisa la consola de tu backend para confirmar que el trigger de PostgreSQL lanzó el error: 'Carrera detectada: La cantidad anterior... no coincide con la existencia actual'.");
    } else {
      console.log("❌ FALLO (TEST NO PASÓ): El servidor aceptó la petición. El trigger no bloqueó la operación.");
    }

  } catch (error) {
    console.error("💥 Error de red o al contactar la API:", error);
  }
}

testCarreraDetectada();