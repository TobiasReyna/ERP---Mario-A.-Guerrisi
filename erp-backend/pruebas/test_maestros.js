// Script para probar los endpoints de tablas maestras
// Ejecutar con: node test_maestros.js

const baseUrl = 'http://localhost:3001/api';

const endpoints = [
    '/categories',
    '/brands',
    '/countries',
    '/deposits',
    '/adjustment-reasons'
];

async function probarMaestros() {
    console.log("Iniciando pruebas de tablas maestras...\n");
    
    for (const endpoint of endpoints) {
        const url = `${baseUrl}${endpoint}`;
        try {
            console.log(`➤ Pidiendo datos a: GET ${url}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok) {
                // Limitamos la impresión a 3 registros para no saturar la consola si hay muchos
                const registrosMuestra = data.data.slice(0, 3);
                console.log(`✅ Éxito: Se trajeron ${data.data.length} registros.`);
                if (data.data.length > 0) {
                    console.log(`   Ejemplo de los primeros:`, JSON.stringify(registrosMuestra, null, 2));
                    if (data.data.length > 3) console.log(`   ... y ${data.data.length - 3} más.`);
                }
            } else {
                console.error(`❌ Error del servidor (${response.status}):`, data);
            }
        } catch (error) {
            console.error(`❌ Error de conexión:`, error.message);
        }
        console.log("--------------------------------------------------\n");
    }
}

probarMaestros();
