// Script para probar la consulta de disponibilidad de stock
// Ejecutar con: node test_disponibilidad.js

const urlBase = 'http://localhost:3001/api/stock';

// ¡IMPORTANTE! Reemplazá este UUID por el ID real del artículo (ej. la guitarra Les Paul o el teclado Redragon)
const ARTICULO_ID = '663edd60-613f-4839-ac83-4594b25f8134'; 

async function probarDisponibilidad() {
    const url = `${urlBase}/${ARTICULO_ID}`;
    
    try {
        console.log(`➤ Consultando stock consolidado y por depósito del artículo: ${ARTICULO_ID}\n`);
        console.log(`GET ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            console.log("\n✅ Éxito! Datos obtenidos:");
            console.log(JSON.stringify(data.data, null, 2));
        } else {
            console.error("\n❌ Error del servidor:", response.status, data);
        }
    } catch (error) {
        console.error("\n❌ Error de conexión:", error.message);
    }
}

probarDisponibilidad();
