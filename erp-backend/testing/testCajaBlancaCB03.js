/**
 * PRUEBA DE CAJA BLANCA - CB-03
 * Objetivo: Modificar un precio sin sesión de usuario activa para forzar
 * la rama "fallback" del trigger trg_fn_registrar_historial_precio.
 */

// ⚠️ IMPORTANTE: Reemplaza con el UUID de un artículo real
const ARTICULO_ID = "3a7dd8b4-35ba-4a53-8c39-fd62f6a2f202";
const API_URL = `http://localhost:3001/api/articles/${ARTICULO_ID}`;

async function testFallbackUsuario() {
  console.log("🚀 Iniciando Test CB-03: Fallback de usuario en historial de precios...\n");

  try {
    // 1. Obtenemos el artículo existente para conservar todos sus campos obligatorios
    console.log(`🔍 Obteniendo datos actuales del artículo (${ARTICULO_ID})...`);
    const getResponse = await fetch(API_URL);

    if (!getResponse.ok) {
      const errorData = await getResponse.json();
      console.log("❌ FALLO: No se pudo obtener el artículo para preparar el PUT.");
      console.log("Error:", errorData);
      return;
    }

    const { data: articulo } = await getResponse.json();
    console.log(`📦 Artículo encontrado: "${articulo.descripcion}" | Precio actual: $${articulo.precio_actual}`);

    // Calculamos un nuevo precio diferente para detonar el trigger trg_fn_registrar_historial_precio
    const precioAnterior = Number(articulo.precio_actual);
    const nuevoPrecio = precioAnterior === 9999.99 ? 8888.88 : 9999.99;

    // Al hacer PUT, el controlador exige todos los campos obligatorios del artículo
    const payload = {
      codigo_interno: articulo.codigo_interno,
      descripcion: articulo.descripcion,
      codigo_ean13: articulo.codigo_ean13,
      categoria_id: articulo.categoria_id,
      marca_id: articulo.marca_id,
      pais_origen: articulo.pais_origen,
      modelo: articulo.modelo || 'Sin especificar',
      precio_actual: nuevoPrecio
    };

    console.log(`\n📝 Enviando PUT con nuevo precio: $${nuevoPrecio}...`);
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ ÉXITO (TEST PASÓ): El artículo fue modificado correctamente.");
      console.log(`   Precio anterior: $${precioAnterior} ➔ Nuevo precio: $${nuevoPrecio}`);
      console.log("\n📌 Verificación en Supabase:");
      console.log("   Abre la tabla 'historial_precios' y confirma que se registró este cambio");
      console.log("   con un 'usuario_id' válido asignado automáticamente por el fallback del trigger.");
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