// Script para probar las políticas de reposición y las alertas de stock (HU-06)
// Ejecutar con: node test_alertas.js

const urlBase = 'http://localhost:3001/api/stock';

// ¡IMPORTANTE! Reemplazá estos valores con los reales de tu DB
const ARTICULO_ID = 'dc809e4c-e20a-4dd5-849e-21913e70e068'; 
const DEPOSITO_ID = '26ef85b3-71e1-419a-be45-896fad9b1cd2'; // Usá el UUID de uno de los depósitos activos (ej. Tienda Central)

async function ejecutarPruebas() {
    console.log("Iniciando pruebas de Alertas de Reposición (HU-06)...\n");

    // 1. Configurar política (PUT) con un stock mínimo ALTO para forzar la alerta
    const urlPolicies = `${urlBase}/policies/${ARTICULO_ID}`;
    const payload = {
        deposito_id: DEPOSITO_ID,
        stock_minimo: 9999,  // Ponemos un mínimo ridículamente alto para que sí o sí salte la alerta
        stock_maximo: 15000  // Máximo sugerido
    };

    try {
        console.log(`➤ [PASO 1] Configurando política de reposición para el artículo ${ARTICULO_ID}`);
        console.log(`PUT ${urlPolicies}`);
        
        const resPol = await fetch(urlPolicies, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const dataPol = await resPol.json();
        
        if (resPol.ok) {
            console.log(`✅ Política configurada con éxito:`, JSON.stringify(dataPol.data, null, 2));
        } else {
            console.error(`❌ Error configurando política:`, dataPol);
            return; // Cortamos acá si falló
        }
    } catch (error) {
        console.error(`❌ Error de conexión:`, error.message);
        return;
    }

    console.log("\n--------------------------------------------------\n");

    // 2. Consultar alertas (GET)
    const urlAlerts = `${urlBase}/alerts`;
    try {
        console.log(`➤ [PASO 2] Consultando artículos con stock por debajo del mínimo`);
        console.log(`GET ${urlAlerts}`);
        
        const resAlerts = await fetch(urlAlerts);
        const dataAlerts = await resAlerts.json();
        
        if (resAlerts.ok) {
            console.log(`\n✅ Éxito! Se detectaron ${dataAlerts.data.length} alertas.`);
            if (dataAlerts.data.length > 0) {
                console.log("Detalle de las alertas:");
                console.log(JSON.stringify(dataAlerts.data, null, 2));
            }
        } else {
            console.error(`❌ Error consultando alertas:`, dataAlerts);
        }
    } catch (error) {
        console.error(`❌ Error de conexión:`, error.message);
    }
}

ejecutarPruebas();
