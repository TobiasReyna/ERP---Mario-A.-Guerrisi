/*SE PROBARA 
1. Validación del Algoritmo EAN-13: Rechazo de códigos con dígito verificador matemáticamente incorrecto.

2. Detección de EAN-13 Duplicado: Verificación del control de unicidad (HTTP 409).

3. Auditoría del Histórico de Precios: Confirmación de que al actualizar el precio de un artículo, el sistema registra automáticamente el cambio en la tabla histórica.
*/
const API_URL = 'http://localhost:3001/api/articles';

// Función auxiliar para calcular el dígito verificador real de EAN-13
function calcularDigitoEAN13(codigo12) {
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    let num = parseInt(codigo12[i]);
    suma += (i % 2 === 0) ? num : num * 3;
  }
  let resto = suma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

async function ejecutarPruebasHU07() {
  console.log("==================================================");
  console.log("🚀 INICIANDO PRUEBAS DE INTEGRIDAD Y PRECIOS (HU-07)");
  console.log("==================================================\n");

  // ----------------------------------------------------
  // PRUEBA 1: EAN-13 con dígito verificador inválido
  // ----------------------------------------------------
  console.log("🧪 1. Probando rechazo de EAN-13 inválido...");

    // Generamos un EAN dinámico terminado en '0' (matemáticamente inválido para esta secuencia)
  const eanInvalidoDinamico = "779" + Math.floor(100000000 + Math.random() * 900000000) + "0";

  const eanInvalidoPayload = {
    codigo_interno: `TEST-EAN-BAD-${Date.now()}`,
    descripcion: "Artículo con EAN Invalido",
    codigo_ean13: eanInvalidoDinamico, // El digito 0 es matemáticamente incorrecto para esta secuencia
    categoria_id: "566cbb3d-e638-4089-83fc-4c44895acc4a",
    marca_id: "fdc7d2df-e972-4f13-8f23-6808e434e78e",
    pais_origen: "a37d867b-7d1f-4cda-8582-f2d26476b138",
    precio_actual: 5000
  };

  try {
    const resEanBad = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eanInvalidoPayload)
    });
    const dataEanBad = await resEanBad.json();

    if (resEanBad.status === 400 || resEanBad.status === 422) {
      console.log("  ✅ ÉXITO: El sistema rechazó el EAN-13 inválido correctamente.");
      console.log(`     Respuesta API (${resEanBad.status}):`, dataEanBad.error || dataEanBad.message);
    } else if (resEanBad.ok) {
      console.log("  ⚠️ ALERTA: El sistema permitió crear un producto con EAN-13 matemáticamente erróneo.");
    } else {
      console.log(`  ℹ️ Resultado HTTP ${resEanBad.status}:`, dataEanBad);
    }
  } catch (err) {
    console.error("  💥 Error en P1:", err.message);
  }

  console.log("\n--------------------------------------------------\n");

  // Generamos un EAN-13 válido único para las siguientes pruebas
  const base12 = "779" + Math.floor(100000000 + Math.random() * 900000000);
  const eanValidoUnico = base12 + calcularDigitoEAN13(base12);
  let articuloCreadoId = null;

  // ----------------------------------------------------
  // PRUEBA 2: EAN-13 Duplicado
  // ----------------------------------------------------
  console.log(`🧪 2. Probando control de EAN-13 Duplicado con el código: ${eanValidoUnico}...`);
  
  const productoBase = {
    codigo_interno: `TEST-DUP-1-${Date.now()}`,
    descripcion: "Artículo Base para Prueba de Duplicado",
    codigo_ean13: eanValidoUnico,
    categoria_id: "566cbb3d-e638-4089-83fc-4c44895acc4a",
    marca_id: "fdc7d2df-e972-4f13-8f23-6808e434e78e",
    pais_origen: "a37d867b-7d1f-4cda-8582-f2d26476b138",
    precio_actual: 10000
  };

  try {
    // A. Crear el primer producto
    const resCrear1 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productoBase)
    });
    const dataCrear1 = await resCrear1.json();

    if (resCrear1.status === 201) {
      articuloCreadoId = dataCrear1.data.id;
      console.log("  1️⃣ Artículo base creado con éxito. ID:", articuloCreadoId);

      // B. Intentar crear un segundo producto con el MISMO EAN-13
      const productoDuplicado = { ...productoBase, codigo_interno: `TEST-DUP-2-${Date.now()}` };
      const resCrear2 = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoDuplicado)
      });
      const dataCrear2 = await resCrear2.json();

      if (resCrear2.status === 409) {
        console.log("  ✅ ÉXITO: La API bloqueó el EAN duplicado respondiendo con HTTP 409 Conflict.");
        console.log("     Detalle:", dataCrear2.error);
      } else {
        console.log(`  ❌ FALLO: Se esperaba HTTP 409 y se obtuvo HTTP ${resCrear2.status}:`, dataCrear2);
      }
    } else {
      console.log("  ❌ Error creando el producto base para la prueba:", dataCrear1);
    }
  } catch (err) {
    console.error("  💥 Error en P2:", err.message);
  }

  console.log("\n--------------------------------------------------\n");

  // ----------------------------------------------------
  // PRUEBA 3: Histórico de Precios
  // ----------------------------------------------------
  console.log("🧪 3. Probando actualización de precio e Histórico de Precios...");

  if (!articuloCreadoId) {
    console.log("  ⚠️ Se omite la prueba de histórico porque no se pudo crear el artículo base.");
    return;
  }

  const nuevoPrecio = 15500;
  console.log(`  Actualizando precio del artículo de $10000 a $${nuevoPrecio}...`);

  try {
    const resUpdate = await fetch(`${API_URL}/${articuloCreadoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo_interno: productoBase.codigo_interno,
        descripcion: "Artículo Base - Actualizado",
        codigo_ean13: productoBase.codigo_ean13,
        categoria_id: productoBase.categoria_id,
        marca_id: productoBase.marca_id,
        pais_origen: productoBase.pais_origen,
        precio_actual: nuevoPrecio
      })
    });

    const dataUpdate = await resUpdate.json();

    if (resUpdate.status === 200) {
      console.log("  ✅ ÉXITO: El precio del artículo fue modificado correctamente.");
      console.log("  📌 Verificación manual requerida en Supabase:");
      console.log(`     Consulta la tabla 'historico_precios' filtrando por 'articulo_id = ${articuloCreadoId}'.`);
      console.log(`     Debe figurar el registro con el precio anterior (10000) y el nuevo (15500).`);
    } else {
      console.log(`  ❌ FALLO al actualizar precio (${resUpdate.status}):`, dataUpdate);
    }
  } catch (err) {
    console.error("  💥 Error en P3:", err.message);
  }
}

ejecutarPruebasHU07();