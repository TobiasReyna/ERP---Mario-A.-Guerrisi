// test_ajuste.js
// Prueba simple para verificar el endpoint de Ajuste de Stock
// Uso: node test_ajuste.js

const URL = 'http://localhost:3001/api/stock/adjust';

const payload = {
  articulo_id: "dc809e4c-e20a-4dd5-849e-21913e70e068", // Reemplazar con UUID real de articulo
  deposito_id: "26ef85b3-71e1-419a-be45-896fad9b1cd2", // Reemplazar con UUID real de deposito
  motivo_id: "337e0491-fab0-45d9-8a90-0656388af5cd", // Reemplazar con UUID real del motivo de ajuste
  cantidad_anterior: 5,
  cantidad_nueva: 3
};

async function testAjuste() {
  console.log('--- Iniciando Prueba de Ajuste de Stock ---');
  console.log(`POST ${URL}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Prueba Exitosa!');
      console.log('Respuesta del servidor:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('\n❌ Error en la respuesta del servidor:', response.status);
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Error ejecutando la petición HTTP:');
    console.error(error.message);
  }
}

testAjuste();
