// Script para probar la trazabilidad e historial de stock
// Ejecutar con: node test_historial.js

const urlBase = 'http://localhost:3001/api/stock';

// ¡IMPORTANTE! Reemplazá este UUID por el ID real del artículo
const ARTICULO_ID = '663edd60-613f-4839-ac83-4594b25f8134'; 

async function probarHistorial() {
    const url = `${urlBase}/${ARTICULO_ID}/history`;
    
    try {
        console.log(`➤ Consultando historial de movimientos del artículo: ${ARTICULO_ID}\n`);
        console.log(`GET ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            console.log(`\n✅ Éxito! Se encontraron ${data.data.length} movimientos.`);
            console.log("Historial ordenado (más recientes primero):");
            console.log(JSON.stringify(data.data, null, 2));
        } else {
            console.error("\n❌ Error del servidor:", response.status, data);
        }
    } catch (error) {
        console.error("\n❌ Error de conexión:", error.message);
    }
}

probarHistorial();
