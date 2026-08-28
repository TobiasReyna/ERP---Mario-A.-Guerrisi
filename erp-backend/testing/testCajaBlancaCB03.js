/**
 * PRUEBA DE CAJA BLANCA - CB-03
 * Objetivo: Modificar un precio sin sesión de usuario activa para forzar
 * la rama "fallback" del trigger trg_fn_registrar_historial_precio.
 */

// ⚠️ IMPORTANTE: Reemplaza con el UUID de un artículo real
const ARTICULO_ID = "TU_ARTICULO_UUID_AQUI";
const API_URL = `http://localhost:3001/api/articles/${ARTICULO_ID}`;

async function testFallbackUsuario() {
  console.log("🚀 Iniciando Test CB-03: Fallback de usuario en historial de precios...\n");

  // Al hacer PUT necesitamos enviar la data del artículo. 
  // Solo cambiaremos el precio_actual para detonar el trigger.
  const payload = {
    descripcion: "Guitarra Stratocaster (Prueba Precio)", // Usa una real
    precio_actual: 9999.99, // Un precio distinto al que tiene actualmente
    // (Asegúrate de agregar categoría, marca, etc., si tu API los exige en el PUT)
  };

  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log("✅ ÉXITO (TEST PASÓ): El artículo fue modificado.");
      console.log("Para verificar la evidencia final, ve a Supabase, abre la tabla 'historial_precios' y revisa que se haya creado un registro de este cambio con un 'usuario_id' válido (fallback asignado automáticamente).");
    } else {
      const errorData = await response.json();
      console.log("❌ FALLO (TEST NO PASÓ): Error al modificar el artículo.");
      console.log("Error:", errorData);
    }
  } catch (error) {
    console.error("💥 Error de conexión:", error);
  }
}

testFallbackUsuario();