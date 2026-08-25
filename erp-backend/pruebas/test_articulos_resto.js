// Script para probar el resto de los endpoints de artículos
// Ejecutar con: node test_articulos_resto.js

const urlBase = 'http://localhost:3001/api/articles';

// ¡IMPORTANTE! Reemplazá este UUID por el ID real del artículo que se creó exitosamente con el script anterior
const ARTICULO_ID = '663edd60-613f-4839-ac83-4594b25f8134'; 

async function probarEndpoint(url, method, payload = null) {
    try {
        console.log(`\n➤ Enviando petición ${method} a ${url}`);
        
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (payload) options.body = JSON.stringify(payload);

        const response = await fetch(url, options);
        const data = await response.json();
        
        if (response.ok) {
            console.log("✅ Éxito:", JSON.stringify(data, null, 2));
        } else {
            console.error("❌ Error del servidor:", response.status, data);
        }
    } catch (error) {
        console.error("❌ Error de conexión:", error);
    }
}

// -------------------------------------------------------------
// DESCOMENTÁ LA FUNCIÓN QUE QUIERAS PROBAR Y GUARDÁ EL ARCHIVO
// -------------------------------------------------------------

async function ejecutarPruebas() {
    
    // 1. Probar GET /api/articles (Listar activos)
    await probarEndpoint(urlBase, 'GET');

    // 2. Probar GET /api/articles/:id (Obtener por ID)
    // await probarEndpoint(`${urlBase}/${ARTICULO_ID}`, 'GET');

    // 3. Probar PUT /api/articles/:id (Modificar artículo)
    // NOTA: Para probar esto, actualizá los UUIDs de categorías/marcas/países al igual que en el POST
    /*
    const payloadUpdate = {
        codigo_interno: "TEC-MEC-001-MOD",
        descripcion: "Teclado Mecánico RGB Redragon Kumara K552 (Modificado)",
        codigo_ean13: "6950376704443",
        categoria_id: "00000000-0000-0000-0000-000000000000",
        marca_id: "00000000-0000-0000-0000-000000000000",
        pais_origen: "00000000-0000-0000-0000-000000000000",
        precio_actual: 50000.00, // Cambio de precio para testear trigger de DB
        modelo: "K552-KR v2"
    };
    await probarEndpoint(`${urlBase}/${ARTICULO_ID}`, 'PUT', payloadUpdate);
    */

    // 4. Probar PATCH /api/articles/:id/status (Baja lógica)
    // await probarEndpoint(`${urlBase}/${ARTICULO_ID}/status`, 'PATCH');

}

ejecutarPruebas();
